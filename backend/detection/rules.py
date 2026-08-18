from datetime import datetime, time, timedelta, timezone

try:
    import cv2
except ImportError:
    cv2 = None

import numpy as np


def is_person_in_zone(box, polygon):
    """
    box: (left, top, right, bottom) — a tracked person's bounding box.
    polygon: [[x, y], ...] — a saved zone polygon.

    Evaluates key anatomical anchors (feet, torso center, head, and waist edges)
    against the zone polygon so that standing, seated, or upper-body camera angles
    reliably trigger alerts.
    """
    if not polygon or len(polygon) < 3:
        return False

    left, top, right, bottom = box
    cx = (left + right) / 2.0
    cy = (top + bottom) / 2.0

    test_points = [
        (cx, bottom),        # Feet / ground position
        (cx, cy),            # Torso / center mass
        (cx, top),           # Head
        (left, cy),          # Left body edge
        (right, cy),         # Right body edge
        (left, bottom),      # Left foot
        (right, bottom),     # Right foot
    ]

    if cv2 is not None:
        polygon_np = np.array(polygon, dtype=np.int32)
        for px, py in test_points:
            # Distance >= -20px provides instant responsive trigger as person approaches/touches zone
            if cv2.pointPolygonTest(polygon_np, (float(px), float(py)), True) >= -20.0:
                return True
        return False

    # Pure Python / NumPy ray-casting fallback across all test points
    n = len(polygon)
    for px, py in test_points:
        inside = False
        p1x, p1y = polygon[0]
        for i in range(n + 1):
            p2x, p2y = polygon[i % n]
            if py > min(p1y, p2y):
                if py <= max(p1y, p2y):
                    if px <= max(p1x, p2x):
                        if p1y != p2y:
                            xinters = (py - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                        if p1x == p2x or px <= xinters:
                            inside = not inside
            p1x, p1y = p2x, p2y
        if inside:
            return True
    return False


# Restricted window: 09:00 (9 AM) through 18:00 (6 PM).
AFTER_HOURS_START = time(9, 0)
AFTER_HOURS_END = time(18, 0)

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


# --- Loitering Detection State & Logic (Phase 2) ---
LOITERING_THRESHOLD_SECONDS = 10  # Configurable dwell threshold in seconds
LOITERING_GRACE_PERIOD_SECONDS = 2.0  # Tolerated tracking gap before resetting dwell timer
LOITERING_COOLDOWN_SECONDS = 60   # Minimum time between repeated loitering alerts for the same (tracked_id, zone_id)

_loitering_entry_times = {}  # (tracked_id, zone_id) -> datetime
_loitering_last_seen = {}    # (tracked_id, zone_id) -> datetime
_loitering_last_alert_at = {}  # (tracked_id, zone_id) -> datetime


def reset_loitering_state():
    """Resets in-memory loitering timer and alert state."""
    _loitering_entry_times.clear()
    _loitering_last_seen.clear()
    _loitering_last_alert_at.clear()


def update_loitering_timer(tracked_id, zone, is_inside, current_time=None):
    """
    Updates and returns the elapsed loitering time (in seconds) for a given tracked person in a zone.
    - If inside and zone has 'loitering' rule: accumulates time from first entry and updates last_seen.
    - If outside or missing: tolerates brief gaps up to LOITERING_GRACE_PERIOD_SECONDS without resetting.
      Once gap exceeds the grace period, resets the dwell timer to 0.0.
    - If zone lacks 'loitering' rule: clears timers and returns 0.0.
    """
    if "loitering" not in zone.get("rules", []):
        key = (tracked_id, zone.get("zone_id"))
        _loitering_entry_times.pop(key, None)
        _loitering_last_seen.pop(key, None)
        return 0.0

    if current_time is None:
        current_time = datetime.now(timezone.utc)

    key = (tracked_id, zone["zone_id"])

    if is_inside:
        _loitering_last_seen[key] = current_time
        if key not in _loitering_entry_times:
            _loitering_entry_times[key] = current_time
            return 0.0
        elapsed = (current_time - _loitering_entry_times[key]).total_seconds()
        return max(0.0, elapsed)
    else:
        if key in _loitering_entry_times and key in _loitering_last_seen:
            gap = (current_time - _loitering_last_seen[key]).total_seconds()
            if gap <= LOITERING_GRACE_PERIOD_SECONDS:
                # Brief tracking gap: maintain accumulated dwell time without reset
                elapsed = (_loitering_last_seen[key] - _loitering_entry_times[key]).total_seconds()
                return max(0.0, elapsed)

        # Gap exceeded grace period or not previously tracked: confirmed exit
        _loitering_entry_times.pop(key, None)
        _loitering_last_seen.pop(key, None)
        return 0.0


def get_loitering_elapsed_time(tracked_id, zone_id, current_time=None):
    """Returns elapsed in-zone time in seconds, or 0.0 if not currently in-zone."""
    key = (tracked_id, zone_id)
    if key not in _loitering_entry_times:
        return 0.0
    if current_time is None:
        current_time = datetime.now(timezone.utc)
    if key in _loitering_last_seen:
        gap = (current_time - _loitering_last_seen[key]).total_seconds()
        if gap > LOITERING_GRACE_PERIOD_SECONDS:
            return 0.0
    return max(0.0, (current_time - _loitering_entry_times[key]).total_seconds())


def evaluate_loitering_alert(tracked_id, box, zone, frame, current_time=None):
    """
    Evaluates whether a loitering alert should fire for this tracked person in this zone.

    Returns the internal Alert dict (per Docs/Backend_Split.md section 3) if:
      1. The zone has the 'loitering' rule.
      2. The person's feet are inside the zone.
      3. The accumulated dwell time exceeds LOITERING_THRESHOLD_SECONDS.
      4. The cooldown since the last loitering alert for this (tracked_id, zone_id) has expired.

    Otherwise returns None. The dwell timer state is always updated on each call.
    """
    if "loitering" not in zone.get("rules", []):
        return None

    if current_time is None:
        current_time = datetime.now(timezone.utc)

    is_inside = is_person_in_zone(box, zone["polygon"])
    elapsed = update_loitering_timer(tracked_id, zone, is_inside, current_time)

    if not is_inside or elapsed < LOITERING_THRESHOLD_SECONDS:
        return None

    key = (tracked_id, zone["zone_id"])
    last_alert = _loitering_last_alert_at.get(key)
    if last_alert is not None and (current_time - last_alert).total_seconds() < LOITERING_COOLDOWN_SECONDS:
        return None

    _loitering_last_alert_at[key] = current_time

    return {
        "alert_type": "loitering",
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

    # --- loitering timer tests (Phase 2 Step 1) ---
    print("\n--- update_loitering_timer ---")
    reset_loitering_state()

    zone_loiter = {"zone_id": "hostel_gate", "polygon": zone_polygon, "rules": ["loitering"]}
    zone_no_loiter = {"zone_id": "other_zone", "polygon": zone_polygon, "rules": ["after_hours"]}

    t0 = datetime(2026, 8, 19, 14, 0, 0, tzinfo=timezone.utc)
    t_plus_5 = t0 + timedelta(seconds=5)
    t_plus_12 = t0 + timedelta(seconds=12)
    t_plus_15 = t0 + timedelta(seconds=15)

    loiter_all_passed = True

    # 1. Person 1 enters loitering zone at t0
    elapsed = update_loitering_timer(1, zone_loiter, is_inside=True, current_time=t0)
    p = (elapsed == 0.0)
    loiter_all_passed &= p
    print(f"[{'PASS' if p else 'FAIL'}] Person 1 enters at t0 -> elapsed={elapsed}s (expected=0.0s)")

    # 2. Person 1 remains in zone at t+5s
    elapsed = update_loitering_timer(1, zone_loiter, is_inside=True, current_time=t_plus_5)
    p = (elapsed == 5.0)
    loiter_all_passed &= p
    print(f"[{'PASS' if p else 'FAIL'}] Person 1 still inside at t+5s -> elapsed={elapsed}s (expected=5.0s)")

    # 3. Person 1 remains in zone at t+12s
    elapsed = update_loitering_timer(1, zone_loiter, is_inside=True, current_time=t_plus_12)
    p = (elapsed == 12.0)
    loiter_all_passed &= p
    print(f"[{'PASS' if p else 'FAIL'}] Person 1 still inside at t+12s -> elapsed={elapsed}s (expected=12.0s)")

    # 4. Person 2 enters at t+5s (independent tracking)
    elapsed_p2 = update_loitering_timer(2, zone_loiter, is_inside=True, current_time=t_plus_5)
    p = (elapsed_p2 == 0.0)
    loiter_all_passed &= p
    print(f"[{'PASS' if p else 'FAIL'}] Person 2 enters at t+5s -> elapsed={elapsed_p2}s (expected=0.0s)")

    # 5. Person 1 leaves zone at t+15s -> timer resets to 0
    elapsed = update_loitering_timer(1, zone_loiter, is_inside=False, current_time=t_plus_15)
    p = (elapsed == 0.0)
    loiter_all_passed &= p
    print(f"[{'PASS' if p else 'FAIL'}] Person 1 leaves at t+15s -> elapsed={elapsed}s (expected=0.0s)")

    # 6. Check get_loitering_elapsed_time for Person 1 (should be 0.0) and Person 2 (seen at t+15s, should be 10.0)
    update_loitering_timer(2, zone_loiter, is_inside=True, current_time=t_plus_15)
    p1_time = get_loitering_elapsed_time(1, "hostel_gate", current_time=t_plus_15)
    p2_time = get_loitering_elapsed_time(2, "hostel_gate", current_time=t_plus_15)
    p = (p1_time == 0.0 and p2_time == 10.0)
    loiter_all_passed &= p
    print(f"[{'PASS' if p else 'FAIL'}] In-zone query at t+15s -> Person 1={p1_time}s (exp=0.0s), Person 2={p2_time}s (exp=10.0s)")

    # 7. Zone without loitering rule returns 0
    elapsed_no_rule = update_loitering_timer(3, zone_no_loiter, is_inside=True, current_time=t0)
    p = (elapsed_no_rule == 0.0)
    loiter_all_passed &= p
    print(f"[{'PASS' if p else 'FAIL'}] Zone without 'loitering' rule -> elapsed={elapsed_no_rule}s (expected=0.0s)")

    print(f"\nAll loitering timer tests passed: {loiter_all_passed}")

    # --- confirmation window / tracking jitter tests (Phase 2 Step 2) ---
    print("\n--- loitering confirmation window & tracking gap tolerance ---")
    reset_loitering_state()

    gap_all_passed = True
    t_start = datetime(2026, 8, 19, 15, 0, 0, tzinfo=timezone.utc)

    # 1. Person enters at t_start -> elapsed=0.0s
    update_loitering_timer(10, zone_loiter, is_inside=True, current_time=t_start)

    # 2. Person inside at t_start + 6.0s -> elapsed=6.0s
    t_6s = t_start + timedelta(seconds=6.0)
    elapsed = update_loitering_timer(10, zone_loiter, is_inside=True, current_time=t_6s)
    p = (elapsed == 6.0)
    gap_all_passed &= p
    print(f"[{'PASS' if p else 'FAIL'}] Person 10 inside at t+6s -> elapsed={elapsed}s (expected=6.0s)")

    # 3. Simulated brief tracking gap: missing/outside for 1.0s (less than 2.0s grace period)
    t_gap_1s = t_6s + timedelta(seconds=1.0)
    elapsed = update_loitering_timer(10, zone_loiter, is_inside=False, current_time=t_gap_1s)
    p = (elapsed == 6.0)  # Maintained without reset
    gap_all_passed &= p
    print(f"[{'PASS' if p else 'FAIL'}] Brief gap (1.0s <= 2.0s grace) -> timer NOT reset, elapsed={elapsed}s (expected=6.0s)")

    # 4. Person redetected inside at t+8.0s -> continues accumulating seamlessly
    t_8s = t_start + timedelta(seconds=8.0)
    elapsed = update_loitering_timer(10, zone_loiter, is_inside=True, current_time=t_8s)
    p = (elapsed == 8.0)
    gap_all_passed &= p
    print(f"[{'PASS' if p else 'FAIL'}] Person 10 redetected at t+8s -> elapsed={elapsed}s (expected=8.0s)")

    # 5. Confirmed exit: person missing/outside for 3.5s (exceeds 2.0s grace period)
    t_exit = t_8s + timedelta(seconds=3.5)
    elapsed = update_loitering_timer(10, zone_loiter, is_inside=False, current_time=t_exit)
    p = (elapsed == 0.0)  # Successfully reset
    gap_all_passed &= p
    print(f"[{'PASS' if p else 'FAIL'}] Confirmed exit (gap 3.5s > 2.0s grace) -> timer RESET, elapsed={elapsed}s (expected=0.0s)")

    # 6. Person re-enters after leaving -> starts from 0.0s
    t_reentry = t_exit + timedelta(seconds=5.0)
    elapsed = update_loitering_timer(10, zone_loiter, is_inside=True, current_time=t_reentry)
    p = (elapsed == 0.0)
    gap_all_passed &= p
    print(f"[{'PASS' if p else 'FAIL'}] Person 10 re-enters at t+16.5s -> starts new timer from {elapsed}s (expected=0.0s)")

    print(f"\nAll confirmation window / gap tolerance tests passed: {gap_all_passed}")

    # --- evaluate_loitering_alert tests (Phase 2 Step 3) ---
    print("\n--- evaluate_loitering_alert ---")
    reset_loitering_state()

    dummy_frame = np.zeros((10, 10, 3), dtype=np.uint8)
    box_inside = (150, 150, 250, 350)   # foot at (200, 350) -> inside polygon
    box_outside = (400, 150, 500, 350)  # foot at (450, 350) -> outside polygon

    zone_loiter2 = {"zone_id": "corridor_01", "polygon": zone_polygon, "rules": ["loitering"]}
    zone_no_loiter2 = {"zone_id": "no_rule_zone", "polygon": zone_polygon, "rules": ["after_hours"]}

    ta = datetime(2026, 8, 20, 10, 0, 0, tzinfo=timezone.utc)
    la_all_passed = True

    def check_loiter_alert(label, tid, box, zone, t, expect):
        alert = evaluate_loitering_alert(tid, box, zone, dummy_frame, t)
        got = alert is not None
        ok = got == expect
        print(f"[{'PASS' if ok else 'FAIL'}] {label} -> alert_fired={got} (expected={expect})")
        return alert, ok

    # 1. Below threshold: no alert
    _, p = check_loiter_alert("Person 20 inside at t+0s (0s dwell < 10s threshold)", 20, box_inside, zone_loiter2, ta, False)
    la_all_passed &= p

    # 2. Still below threshold at 5s
    ta_5 = ta + timedelta(seconds=5)
    _, p = check_loiter_alert("Person 20 inside at t+5s (5s dwell < 10s threshold)", 20, box_inside, zone_loiter2, ta_5, False)
    la_all_passed &= p

    # 3. Crosses threshold at 11s -> alert fires
    ta_11 = ta + timedelta(seconds=11)
    alert, p = check_loiter_alert("Person 20 inside at t+11s (11s dwell >= 10s threshold) -> FIRES", 20, box_inside, zone_loiter2, ta_11, True)
    la_all_passed &= p
    if alert:
        print(f"       Alert: { {k: v for k, v in alert.items() if k != 'frame'} }")

    # 4. Immediate repeat within cooldown -> suppressed
    _, p = check_loiter_alert("Immediate repeat within cooldown -> suppressed", 20, box_inside, zone_loiter2, ta_11, False)
    la_all_passed &= p

    # 5. Person outside zone -> no alert even past threshold
    _, p = check_loiter_alert("Person 21 outside zone at t+20s -> no alert", 21, box_outside, zone_loiter2, ta + timedelta(seconds=20), False)
    la_all_passed &= p

    # 6. Zone without loitering rule -> no alert
    _, p = check_loiter_alert("Zone without 'loitering' rule -> no alert", 22, box_inside, zone_no_loiter2, ta_11, False)
    la_all_passed &= p

    # 7. After cooldown expires, alert fires again for person 20
    ta_cooldown = ta_11 + timedelta(seconds=LOITERING_COOLDOWN_SECONDS + 1)
    alert, p = check_loiter_alert("After cooldown expires -> alert fires again", 20, box_inside, zone_loiter2, ta_cooldown, True)
    la_all_passed &= p
    if alert:
        print(f"       Alert: { {k: v for k, v in alert.items() if k != 'frame'} }")

    print(f"\nAll loitering alert tests passed: {la_all_passed}")

