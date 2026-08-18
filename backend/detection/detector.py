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
    if isinstance(source, int):
        cap = cv2.VideoCapture(source, cv2.CAP_DSHOW)
        if cap.isOpened():
            return cap, source
        cap = cv2.VideoCapture(source)
        if cap.isOpened():
            return cap, source
    else:
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


class HighSpeedDetector:
    """
    Decoupled vision engine:
    - Thread 1 (Stream Loop): Grabs camera frames continuously at 30-60 FPS and pushes directly to stream.
    - Thread 2 (Inference Worker): Runs YOLOv8 (imgsz=320) + DeepSORT in background without stalling the stream.
    """

    def __init__(self, cap, show_window: bool = False, stop_event: threading.Event = None):
        self.cap = cap
        try:
            self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        except Exception:
            pass
        self.show_window = show_window
        self.stop_event = stop_event or threading.Event()
        self.model = YOLO(YOLO_MODEL_PATH)
        self.tracker = DeepSort(max_age=20, n_init=2, half=True, bgr=True)

        self.latest_frame = None
        self.latest_detections = []
        self.lock = threading.Lock()
        self.running = True

    def _inference_worker(self):
        """Asynchronous background AI worker running YOLO + DeepSORT."""
        while self.running and not self.stop_event.is_set():
            frame_to_process = None
            with self.lock:
                if self.latest_frame is not None:
                    frame_to_process = self.latest_frame.copy()

            if frame_to_process is None:
                time.sleep(0.005)
                continue

            # Run YOLO with lightweight 320x320 resolution for fast CPU execution
            results = self.model(
                frame_to_process, imgsz=320, classes=[PERSON_CLASS_ID], conf=0.35, verbose=False
            )[0]

            detections = []
            for box in results.boxes:
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                conf = box.conf[0].item()
                detections.append([[x1, y1, x2 - x1, y2 - y1], conf, "person"])

            tracks = self.tracker.update_tracks(detections, frame=frame_to_process)
            active_zones = get_active_zones()

            contract_dets = []
            now = _current_time()

            for track in tracks:
                if not track.is_confirmed():
                    continue

                tracked_id = int(track.track_id)
                box = track.to_ltrb()

                contract_dets.append(
                    {
                        "tracked_id": tracked_id,
                        "box": {
                            "x": int(box[0]),
                            "y": int(box[1]),
                            "width": int(box[2] - box[0]),
                            "height": int(box[3] - box[1]),
                        },
                    }
                )

                for zone in active_zones:
                    # 1. Check After-Hours rule
                    alert = evaluate_after_hours_alert(tracked_id, box, zone, frame_to_process, now)
                    if alert:
                        push_alert(alert)
                        summary = {k: v for k, v in alert.items() if k != "frame"}
                        print(f"[Detector] After-Hours Alert fired: {summary}")

                    # 2. Check Loitering rule
                    alert = evaluate_loitering_alert(tracked_id, box, zone, frame_to_process, now)
                    if alert:
                        push_alert(alert)
                        summary = {k: v for k, v in alert.items() if k != "frame"}
                        print(f"[Detector] Loitering Alert fired: {summary}")

            with self.lock:
                self.latest_detections = contract_dets

            time.sleep(0.005)

    def run(self):
        """Main camera streaming loop running at maximum camera framerate."""
        infer_thread = threading.Thread(
            target=self._inference_worker, daemon=True, name="InferenceWorker"
        )
        infer_thread.start()

        try:
            while self.running and not self.stop_event.is_set():
                ret, frame = self.cap.read()
                if not ret or frame is None:
                    time.sleep(0.005)
                    continue

                with self.lock:
                    self.latest_frame = frame
                    current_dets = list(self.latest_detections)

                # Push frame to web client immediately with 0ms delay!
                push_frame(frame, current_dets)

                if self.show_window:
                    cv2.imshow("SAGE Vision Stream", frame)
                    if cv2.waitKey(1) & 0xFF == ord("q"):
                        break

                time.sleep(0.002)

        except KeyboardInterrupt:
            pass
        finally:
            self.running = False
            self.cap.release()
            if self.show_window:
                cv2.destroyAllWindows()


def capture_loop(show_window: bool = True, stop_event: threading.Event = None):
    cap, source = open_capture()
    print(f"Camera opened (source={source}). Real-time 0ms-latency decoupled stream started...")
    engine = HighSpeedDetector(cap, show_window=show_window, stop_event=stop_event)
    engine.run()



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

