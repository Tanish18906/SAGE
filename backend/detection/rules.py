from datetime import datetime, time, timedelta, timezone

import cv2
import numpy as np


def is_person_in_zone(box, polygon):
    """
    box: (left, top, right, bottom) — a tracked person's bounding box.
    polygon: [[x, y], ...] — a saved zone polygon.

    Uses the box's bottom-center (feet) point as the person's ground position,
    and cv2.pointPolygonTest to check if that point falls inside the polygon.
    """
    left, top, right, bottom = box
    foot_point = ((left + right) / 2, bottom)

    polygon_np = np.array(polygon, dtype=np.int32)
    result = cv2.pointPolygonTest(polygon_np, foot_point, False)
    return result >= 0


# Restricted window spans midnight: 21:00 (9 PM) through 06:00 (6 AM) the next day.
AFTER_HOURS_START = time(21, 0)
AFTER_HOURS_END = time(6, 0)

# Minimum time between repeated after-hours alerts for the same (tracked_id, zone_id).
ALERT_COOLDOWN_SECONDS = 60

_last_alert_at = {}


def is_within_after_hours(current_time, start=AFTER_HOURS_START, end=AFTER_HOURS_END):
    """current_time: a datetime — only its time-of-day component is checked."""
    t = current_time.time()
    if start <= end:
        return start <= t < end
    return t >= start or t < end


def check_after_hours_rule(zone, current_time=None):
    """
    zone: a saved zone dict (as returned by get_active_zones()).
    current_time: a datetime to check against; defaults to now (UTC).
                  Callers can override this for testing at any hour.
    """
    if "after_hours" not in zone.get("rules", []):
        return False
    if current_time is None:
        current_time = datetime.now(timezone.utc)
    return is_within_after_hours(current_time)


def evaluate_after_hours_alert(tracked_id, box, zone, frame, current_time=None):
    """
    Returns the internal Alert dict (per Docs/Backend_Split.md section 3) if the
    tracked person is inside `zone` AND the after-hours rule is triggered for it —
    otherwise returns None. Deduplicated with a cooldown per (tracked_id, zone_id)
    so an ongoing presence doesn't re-fire on every consecutive frame.
    """
    if not is_person_in_zone(box, zone["polygon"]):
        return None

    if current_time is None:
        current_time = datetime.now(timezone.utc)

    if not check_after_hours_rule(zone, current_time):
        return None

    key = (tracked_id, zone["zone_id"])
    last_alert = _last_alert_at.get(key)
    if last_alert is not None and (current_time - last_alert).total_seconds() < ALERT_COOLDOWN_SECONDS:
        return None

    _last_alert_at[key] = current_time

    return {
        "alert_type": "after_hours",
        "zone_id": zone["zone_id"],
        "tracked_id": int(tracked_id),
        "timestamp": current_time.isoformat(),
        "frame": frame.copy(),
    }


if __name__ == "__main__":
    zone_polygon = [[100, 80], [300, 80], [300, 400], [100, 400]]

    test_cases = [
        {"name": "fully inside", "box": (150, 150, 250, 350), "expected": True},
        {"name": "fully outside (far right)", "box": (400, 150, 500, 350), "expected": False},
        {"name": "fully outside (above zone)", "box": (150, 0, 250, 50), "expected": False},
        {"name": "feet on polygon edge", "box": (150, 100, 250, 400), "expected": True},
        {"name": "feet just outside left edge", "box": (0, 150, 90, 350), "expected": False},
        {"name": "straddling boundary, feet inside", "box": (250, 150, 350, 350), "expected": True},
        {"name": "straddling boundary, feet outside", "box": (250, 150, 400, 50), "expected": False},
    ]

    print(f"Zone polygon: {zone_polygon}\n")
    all_passed = True
    for case in test_cases:
        result = is_person_in_zone(case["box"], zone_polygon)
        passed = result == case["expected"]
        all_passed &= passed
        status = "PASS" if passed else "FAIL"
        print(
            f"[{status}] {case['name']}: box={case['box']} -> "
            f"is_person_in_zone={result} (expected={case['expected']})"
        )

    print(f"\nAll tests passed: {all_passed}")

    # --- check_after_hours_rule tests ---
    print("\n--- check_after_hours_rule ---")

    zone_ah = {"zone_id": "hostel_gate", "polygon": zone_polygon, "rules": ["after_hours", "loitering"]}
    zone_no_ah = {"zone_id": "no_ah_zone", "polygon": zone_polygon, "rules": ["loitering"]}

    restricted_time = datetime(2026, 8, 19, 22, 0, tzinfo=timezone.utc)  # 10 PM
    allowed_time = datetime(2026, 8, 19, 14, 0, tzinfo=timezone.utc)  # 2 PM
    boundary_start = datetime(2026, 8, 19, 21, 0, tzinfo=timezone.utc)  # exactly 21:00
    boundary_end = datetime(2026, 8, 20, 6, 0, tzinfo=timezone.utc)  # exactly 06:00
    late_night = datetime(2026, 8, 20, 3, 0, tzinfo=timezone.utc)  # 3 AM, spans midnight

    ah_cases = [
        {"name": "after_hours zone, restricted time (22:00)", "zone": zone_ah, "time": restricted_time, "expected": True},
        {"name": "after_hours zone, allowed time (14:00)", "zone": zone_ah, "time": allowed_time, "expected": False},
        {"name": "no after_hours rule on zone", "zone": zone_no_ah, "time": restricted_time, "expected": False},
        {"name": "exact start boundary (21:00)", "zone": zone_ah, "time": boundary_start, "expected": True},
        {"name": "exact end boundary (06:00)", "zone": zone_ah, "time": boundary_end, "expected": False},
        {"name": "past midnight (03:00)", "zone": zone_ah, "time": late_night, "expected": True},
    ]

    ah_all_passed = True
    for case in ah_cases:
        result = check_after_hours_rule(case["zone"], case["time"])
        passed = result == case["expected"]
        ah_all_passed &= passed
        status = "PASS" if passed else "FAIL"
        print(f"[{status}] {case['name']} -> {result} (expected={case['expected']})")

    print(f"\nAll after-hours rule tests passed: {ah_all_passed}")

    # --- evaluate_after_hours_alert tests ---
    print("\n--- evaluate_after_hours_alert ---")

    dummy_frame = np.zeros((10, 10, 3), dtype=np.uint8)
    box_inside = (150, 150, 250, 350)
    box_outside = (400, 150, 500, 350)

    alert_all_passed = True

    def check_alert(name, tracked_id, box, zone, current_time, expect_alert):
        alert = evaluate_after_hours_alert(tracked_id, box, zone, dummy_frame, current_time)
        got_alert = alert is not None
        passed = got_alert == expect_alert
        status = "PASS" if passed else "FAIL"
        print(f"[{status}] {name} -> alert_fired={got_alert} (expected={expect_alert})")
        return alert, passed

    _, p = check_alert("inside zone, restricted time", 1, box_inside, zone_ah, restricted_time, True)
    alert_all_passed &= p

    _, p = check_alert("outside zone, restricted time", 1, box_outside, zone_ah, restricted_time, False)
    alert_all_passed &= p

    _, p = check_alert("inside zone, allowed time", 1, box_inside, zone_ah, allowed_time, False)
    alert_all_passed &= p

    _, p = check_alert("inside zone (no after_hours rule), restricted time", 1, box_inside, zone_no_ah, restricted_time, False)
    alert_all_passed &= p

    alert, p = check_alert("first alert for tracked_id=2 fires", 2, box_inside, zone_ah, restricted_time, True)
    alert_all_passed &= p
    if alert:
        print(f"       Alert dict: { {k: v for k, v in alert.items() if k != 'frame'} }, frame.shape={alert['frame'].shape}")

    _, p = check_alert("immediate repeat, same tracked_id, within cooldown", 2, box_inside, zone_ah, restricted_time, False)
    alert_all_passed &= p

    later_time = restricted_time + timedelta(seconds=ALERT_COOLDOWN_SECONDS + 1)
    _, p = check_alert("after cooldown expires, alert fires again", 2, box_inside, zone_ah, later_time, True)
    alert_all_passed &= p

    print(f"\nAll after-hours alert tests passed: {alert_all_passed}")
