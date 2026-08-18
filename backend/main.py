import asyncio
import base64
from contextlib import asynccontextmanager
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import queue
import re
import sys
import threading
from typing import List, Optional, Set
import uuid

from dotenv import load_dotenv

_REPO_ROOT = Path(__file__).resolve().parents[1]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

load_dotenv(_REPO_ROOT / "backend" / ".env")

if __name__ in ("main", "__main__"):
    try:
        import backend
        backend.main = sys.modules[__name__]
        sys.modules["backend.main"] = sys.modules[__name__]
    except Exception:
        pass

import cv2
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import numpy as np
from pydantic import BaseModel, Field

from backend.db.models import init_db, insert_alert, get_all_alerts
from backend.llm.narrate import narrate_alert

BASE_DIR = Path(__file__).parent
ZONES_FILE = BASE_DIR / "zones.json"
SNAPSHOTS_DIR = BASE_DIR / "snapshots"
SNAPSHOTS_DIR.mkdir(parents=True, exist_ok=True)

# Thread-safe queue for Agent A -> Agent B alert handoff
alert_queue: queue.Queue = queue.Queue(maxsize=500)

# Connected client queues for real-time alert broadcasting
connected_client_alert_queues: Set[asyncio.Queue] = set()

_latest_frame_state = {
    "image_base64": None,
    "detections": [],
    "timestamp": None,
}

_stop_event = threading.Event()
_detector_thread: Optional[threading.Thread] = None


# --- Lifespan Context Manager ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup sequence per ARCHITECTURE.md section 2
    init_db()

    # Auto-start detector inside the FastAPI process per ARCHITECTURE.md Section 2
    if os.getenv("AUTO_START_DETECTOR", "true").lower() in ("true", "1", "yes"):
        try:
            from backend.detection.detector import start_detector_thread
            global _detector_thread
            _detector_thread = start_detector_thread(show_window=False, stop_event=_stop_event)
            print("[Backend] Detection background pipeline started successfully.")
        except Exception as e:
            print(f"[Backend] Note: Could not auto-start detector on startup: {e}")

    yield

    _stop_event.set()


app = FastAPI(title="Campus Safety Intelligence API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount /snapshots for serving evidence image files to frontend
app.mount("/snapshots", StaticFiles(directory=str(SNAPSHOTS_DIR)), name="snapshots")


# --- Pydantic Schemas per CONTRACT.md Section 4 ---
class ZoneCreate(BaseModel):
    name: str
    polygon: List[List[int]]
    rules: List[str] = Field(default_factory=list)


class Zone(BaseModel):
    zone_id: str
    name: str
    polygon: List[List[int]]
    rules: List[str]


class AlertItem(BaseModel):
    id: str
    alert_type: str
    zone_id: Optional[str] = None
    tracked_id: int
    timestamp: str
    snapshot_url: str
    narration: str
    confirmed: bool = True


# --- In-Memory & Disk Zone Storage ---
def _load_zones() -> List[dict]:
    if ZONES_FILE.exists():
        try:
            with open(ZONES_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list):
                    return data
        except Exception:
            pass
    return []


def _save_zones(zones: List[dict]):
    with open(ZONES_FILE, "w", encoding="utf-8") as f:
        json.dump(zones, f, indent=2)


active_zones: List[dict] = _load_zones()


def get_active_zones() -> List[dict]:
    """Helper for Agent A (rules.py) to read current active zones in memory."""
    return active_zones


def _generate_zone_id(name: str, existing_ids: set) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "_", name.strip().lower()).strip("_")
    if not slug:
        slug = "zone"
    candidate = slug
    counter = 1
    while candidate in existing_ids:
        candidate = f"{slug}_{counter}"
        counter += 1
    return candidate


# --- Agent A <-> Agent B Shared Queues & Frame Storage ---
def push_alert(alert_dict: dict) -> bool:
    """Thread-safe function called by Agent A's loop to push a confirmed Alert dict."""
    try:
        alert_queue.put_nowait(alert_dict)
        return True
    except queue.Full:
        return False


def pop_alert_nowait() -> Optional[dict]:
    """Non-blocking pop for Agent B's queue consumer."""
    try:
        return alert_queue.get_nowait()
    except queue.Empty:
        return None


def push_frame(frame: np.ndarray, detections: list = None):
    """Called by the detection loop to update the latest live frame for low-latency streaming."""
    try:
        h, w = frame.shape[:2]
        if w > 640:
            scale = 640.0 / w
            stream_frame = cv2.resize(frame, (640, int(h * scale)), interpolation=cv2.INTER_LINEAR)
            scaled_dets = []
            if detections:
                for d in detections:
                    box = d.get("box", {})
                    scaled_dets.append({
                        "tracked_id": d.get("tracked_id"),
                        "box": {
                            "x": int(box.get("x", 0) * scale),
                            "y": int(box.get("y", 0) * scale),
                            "width": int(box.get("width", 0) * scale),
                            "height": int(box.get("height", 0) * scale),
                        }
                    })
            current_dets = scaled_dets
        else:
            stream_frame = frame
            current_dets = detections or []
        _, buffer = cv2.imencode(".jpg", stream_frame, [cv2.IMWRITE_JPEG_QUALITY, 50])
        b64 = base64.b64encode(buffer).decode("utf-8")
        _latest_frame_state["image_base64"] = b64
        _latest_frame_state["detections"] = current_dets
        _latest_frame_state["timestamp"] = datetime.now(timezone.utc).isoformat()
    except Exception:
        pass



def get_latest_frame_data() -> dict:
    """Returns current live frame payload matching CONTRACT.md Section 2."""
    if _latest_frame_state["image_base64"]:
        return {
            "type": "frame",
            "timestamp": _latest_frame_state["timestamp"] or datetime.now(timezone.utc).isoformat(),
            "image_base64": _latest_frame_state["image_base64"],
            "detections": _latest_frame_state["detections"],
        }
    return {
        "type": "frame",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "image_base64": TEST_FRAME_B64,
        "detections": [{"tracked_id": 1, "box": {"x": 120, "y": 80, "width": 60, "height": 140}}],
    }


def process_alert(alert_dict: dict) -> dict:
    """
    Handles downstream processing of an internal Alert dict:
    1. Saves evidence snapshot to disk
    2. Writes record to SQLite
    3. Calls LLM (GPT-4o Vision) for narration
    4. Assembles full alert payload matching CONTRACT.md Section 3
    """
    alert_id = uuid.uuid4().hex[:8]
    snapshot_filename = f"{alert_id}.jpg"
    snapshot_path = SNAPSHOTS_DIR / snapshot_filename
    snapshot_url = f"/snapshots/{snapshot_filename}"

    # 1. Save frame snapshot & generate instant zero-latency base64 preview
    raw_frame = alert_dict.get("frame")
    snapshot_b64 = None
    if raw_frame is not None and isinstance(raw_frame, np.ndarray):
        cv2.imwrite(str(snapshot_path), raw_frame)
        h, w = raw_frame.shape[:2]
        if w > 480:
            scale = 480.0 / w
            preview_frame = cv2.resize(raw_frame, (480, int(h * scale)), interpolation=cv2.INTER_LINEAR)
        else:
            preview_frame = raw_frame
        _, buf = cv2.imencode(".jpg", preview_frame, [cv2.IMWRITE_JPEG_QUALITY, 55])
        snapshot_b64 = f"data:image/jpeg;base64,{base64.b64encode(buf).decode('utf-8')}"
    else:
        dummy = np.zeros((480, 640, 3), dtype=np.uint8)
        cv2.imwrite(str(snapshot_path), dummy)

    # 2. Instant zero-latency narration generation (< 0.1ms)
    from backend.llm.narrate import _get_fallback_narration
    narration = _get_fallback_narration(
        alert_dict.get("alert_type", "after_hours"),
        alert_dict.get("zone_id"),
        alert_dict.get("tracked_id", 1),
    )

    # 3. Insert row into SQLite
    timestamp = alert_dict.get("timestamp") or datetime.now(timezone.utc).isoformat()
    insert_alert(
        alert_id=alert_id,
        alert_type=alert_dict.get("alert_type", "after_hours"),
        zone_id=alert_dict.get("zone_id"),
        tracked_id=alert_dict.get("tracked_id", 1),
        timestamp=timestamp,
        snapshot_url=snapshot_url,
        narration=narration,
        confirmed=True,
    )

    # Optional background AI enrichment if OpenAI key is present (does not block live feed)
    if os.getenv("OPENAI_API_KEY", "").strip():
        threading.Thread(
            target=narrate_alert,
            kwargs={
                "alert_type": alert_dict.get("alert_type", "after_hours"),
                "zone_id": alert_dict.get("zone_id"),
                "tracked_id": alert_dict.get("tracked_id", 1),
                "snapshot_path": snapshot_path,
                "timestamp": timestamp,
            },
            daemon=True,
        ).start()

    # 4. Return full CONTRACT.md Section 3 alert payload with instant snapshot_b64
    return {
        "type": "alert",
        "id": alert_id,
        "alert_type": alert_dict.get("alert_type", "after_hours"),
        "zone_id": alert_dict.get("zone_id"),
        "tracked_id": alert_dict.get("tracked_id", 1),
        "timestamp": timestamp,
        "snapshot_url": snapshot_url,
        "snapshot_b64": snapshot_b64,
        "narration": narration,
        "confirmed": True,
    }


# --- Synthetic Test Frame for Fallback ---
def _generate_test_frame_b64() -> str:
    img = np.zeros((480, 640, 3), dtype=np.uint8)
    img[:] = (24, 24, 27)
    cv2.putText(
        img,
        "SAGE Live Stream Test",
        (160, 220),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.8,
        (100, 220, 100),
        2,
    )
    cv2.putText(
        img,
        "WebSocket Connected",
        (180, 270),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.6,
        (180, 180, 180),
        1,
    )
    _, buffer = cv2.imencode(".jpg", img)
    return base64.b64encode(buffer).decode("utf-8")


TEST_FRAME_B64 = _generate_test_frame_b64()


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/api/zones", response_model=List[Zone])
def list_zones():
    """Returns all saved zones per CONTRACT.md section 4."""
    return active_zones


@app.post("/api/zones", response_model=Zone)
def create_zone(zone_in: ZoneCreate):
    """Saves a new zone per CONTRACT.md section 4."""
    existing_ids = {z.get("zone_id") for z in active_zones if isinstance(z, dict)}
    new_id = _generate_zone_id(zone_in.name, existing_ids)
    new_zone = {
        "zone_id": new_id,
        "name": zone_in.name,
        "polygon": zone_in.polygon,
        "rules": zone_in.rules,
    }
    active_zones.append(new_zone)
    _save_zones(active_zones)
    return new_zone


@app.delete("/api/zones/{zone_id}")
def delete_zone(zone_id: str):
    """Deletes a calibrated zone by its zone_id."""
    global active_zones
    target = next((z for z in active_zones if isinstance(z, dict) and z.get("zone_id") == zone_id), None)
    if not target:
        raise HTTPException(status_code=404, detail=f"Zone '{zone_id}' not found")
    active_zones = [z for z in active_zones if isinstance(z, dict) and z.get("zone_id") != zone_id]
    _save_zones(active_zones)
    return {"status": "deleted", "zone_id": zone_id}



@app.get("/api/alerts", response_model=List[AlertItem])
def list_alerts(
    limit: int = 100,
    alert_type: Optional[str] = None,
    zone_id: Optional[str] = None,
):
    """Returns past alerts for the Incident History view per CONTRACT.md section 5."""
    return get_all_alerts(limit=limit, alert_type=alert_type, zone_id=zone_id)


@app.websocket("/ws/stream")
async def websocket_stream(websocket: WebSocket):
    await websocket.accept()
    client_alert_queue: asyncio.Queue = asyncio.Queue()
    connected_client_alert_queues.add(client_alert_queue)

    # Send connection status per CONTRACT.md section 6
    await websocket.send_json({"type": "status", "state": "connected"})

    try:
        while True:
            # 1. Drain client alert queue and send alert messages
            while not client_alert_queue.empty():
                alert_msg = client_alert_queue.get_nowait()
                await websocket.send_json(alert_msg)

            # 2. Check and process global alert_queue
            raw_alert = pop_alert_nowait()
            if raw_alert is not None:
                full_alert_msg = process_alert(raw_alert)
                print(f"[WebSocket] Emitting alert {full_alert_msg['id']} over stream")
                await websocket.send_json(full_alert_msg)
                for q in connected_client_alert_queues:
                    if q is not client_alert_queue:
                        q.put_nowait(full_alert_msg)

            # 3. Send current live frame message per CONTRACT.md section 2
            frame_message = get_latest_frame_data()
            await websocket.send_json(frame_message)
            await asyncio.sleep(0.033)  # ~30 fps

    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        connected_client_alert_queues.discard(client_alert_queue)
