import os
import sys
from datetime import datetime
from pathlib import Path

import cv2
import numpy as np
from deep_sort_realtime.deepsort_tracker import DeepSort
from dotenv import load_dotenv
from ultralytics import YOLO

_REPO_ROOT = Path(__file__).resolve().parents[2]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from backend.detection.rules import evaluate_after_hours_alert, evaluate_loitering_alert, is_person_in_zone
from backend.main import get_active_zones, push_alert, push_frame

_ENV_PATH = _REPO_ROOT / "backend" / ".env"
load_dotenv(_ENV_PATH)

def _get_camera_source():
    load_dotenv(_ENV_PATH, override=True)
    source_env = os.getenv("CAMERA_INDEX", "0").strip()
    if source_env.isdigit():
        return int(source_env)
    return source_env


def _current_time():
    load_dotenv(_ENV_PATH, override=True)
    sim_time = os.getenv("SIMULATED_TIME", "")
    if sim_time:
        return datetime.fromisoformat(sim_time)
    return datetime.now().astimezone()


YOLO_MODEL_PATH = "yolov8n.pt"
PERSON_CLASS_ID = 0


def open_capture():
    source = _get_camera_source()
    cap = cv2.VideoCapture(source)
    if cap.isOpened():
        return cap, source

    fallback = os.getenv("FALLBACK_VIDEO_PATH", "")
    if fallback:
        cap = cv2.VideoCapture(fallback)
        if cap.isOpened():
            return cap, fallback

    raise RuntimeError(
        f"Could not open camera source '{source}'"
        + (f" or fallback video '{fallback}'" if fallback else "")
    )


import threading
import time


class FreshFrameReader:
    """
    Continuously drains frames from cv2.VideoCapture in a dedicated thread.
    This prevents internal buffer buildup and guarantees zero frame-delay latency.
    """

    def __init__(self, cap):
        self.cap = cap
        self.frame = None
        self.ret = False
        self.running = True
        self.lock = threading.Lock()
        self.thread = threading.Thread(target=self._reader, daemon=True, name="FreshFrameReader")
        self.thread.start()

    def _reader(self):
        while self.running:
            ret, frame = self.cap.read()
            if not ret:
                time.sleep(0.01)
                continue
            with self.lock:
                self.frame = frame
                self.ret = ret

    def read(self):
        with self.lock:
            if self.frame is None:
                return False, None
            return self.ret, self.frame.copy()

    def stop(self):
        self.running = False
        if self.thread.is_alive():
            self.thread.join(timeout=0.5)


def capture_loop(show_window: bool = True, stop_event: threading.Event = None):
    cap, source = open_capture()
    reader = FreshFrameReader(cap)
    model = YOLO(YOLO_MODEL_PATH)
    tracker = DeepSort(max_age=15, n_init=2)
    print(f"Camera opened (source={source}). Real-time inference started...")

    frame_count = 0
    try:
        while True:
            ret, frame = reader.read()
            if not ret or frame is None:
                time.sleep(0.005)
                continue

            frame_count += 1

            # Run YOLO inference with optimal imgsz for fast CPU execution
            results = model(frame, imgsz=640, classes=[PERSON_CLASS_ID], verbose=False)[0]

            detections = []
            for box in results.boxes:
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                conf = box.conf[0].item()
                detections.append([[x1, y1, x2 - x1, y2 - y1], conf, "person"])

            tracks = tracker.update_tracks(detections, frame=frame)

            active_zones = get_active_zones()

            annotated_frame = frame.copy()
            for zone in active_zones:
                if not zone.get("polygon") or len(zone["polygon"]) < 3:
                    continue
                pts = np.array(zone["polygon"], dtype=np.int32).reshape((-1, 1, 2))
                cv2.polylines(annotated_frame, [pts], isClosed=True, color=(255, 200, 0), thickness=2)
                cv2.putText(
                    annotated_frame,
                    zone.get("name") or zone.get("zone_id", ""),
                    tuple(zone["polygon"][0]),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.5,
                    (255, 200, 0),
                    1,
                )

            for track in tracks:
                if not track.is_confirmed():
                    continue

                tracked_id = int(track.track_id)
                box = track.to_ltrb()
                x1, y1, x2, y2 = box

                zones_inside = [
                    zone["zone_id"] for zone in active_zones if is_person_in_zone(box, zone["polygon"])
                ]

                for zone in active_zones:
                    now = _current_time()

                    # After-hours rule check
                    alert = evaluate_after_hours_alert(tracked_id, box, zone, frame, now)
                    if alert:
                        push_alert(alert)
                        alert_summary = {k: v for k, v in alert.items() if k != "frame"}
                        print(f"[Detector] Alert fired & pushed: {alert_summary}")

                    # Loitering rule check
                    alert = evaluate_loitering_alert(tracked_id, box, zone, frame, now)
                    if alert:
                        push_alert(alert)
                        alert_summary = {k: v for k, v in alert.items() if k != "frame"}
                        print(f"[Detector] Alert fired & pushed: {alert_summary}")

                box_color = (0, 0, 255) if zones_inside else (0, 255, 0)
                cv2.rectangle(annotated_frame, (int(x1), int(y1)), (int(x2), int(y2)), box_color, 2)
                label = f"ID: {tracked_id}" + (f" IN:{','.join(zones_inside)}" if zones_inside else "")
                cv2.putText(
                    annotated_frame,
                    label,
                    (int(x1), int(y1) - 10),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.6,
                    box_color,
                    2,
                )

            contract_detections = [
                {
                    "tracked_id": int(t.track_id),
                    "box": {
                        "x": int(t.to_ltrb()[0]),
                        "y": int(t.to_ltrb()[1]),
                        "width": int(t.to_ltrb()[2] - t.to_ltrb()[0]),
                        "height": int(t.to_ltrb()[3] - t.to_ltrb()[1]),
                    },
                }
                for t in tracks
                if t.is_confirmed()
            ]
            push_frame(annotated_frame, contract_detections)

            if show_window:
                cv2.imshow("YOLOv8 + DeepSORT Tracking", annotated_frame)
                if cv2.waitKey(1) & 0xFF == ord("q"):
                    print("Stopped by user (q pressed).")
                    break

            if stop_event is not None and stop_event.is_set():
                break
    except KeyboardInterrupt:
        print("Stopped by user.")
    finally:
        reader.stop()
        cap.release()
        if show_window:
            cv2.destroyAllWindows()



def start_detector_thread(show_window: bool = False, stop_event: threading.Event = None) -> threading.Thread:
    """Helper to start the detection pipeline in a background daemon thread."""
    thread = threading.Thread(
        target=capture_loop,
        kwargs={"show_window": show_window, "stop_event": stop_event},
        daemon=True,
        name="DetectorPipelineThread",
    )
    thread.start()
    return thread


if __name__ == "__main__":
    capture_loop(show_window=True)

