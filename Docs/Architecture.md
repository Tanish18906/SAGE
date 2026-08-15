# AI-Powered Campus Safety Intelligence System
### ARCHITECTURE.md — How the system actually runs

This document explains runtime structure: what processes exist, what starts in what order, and how data moves through memory while the system is live. `TECH_STACK.md` covers *what* each component is built with; this covers *how they run together*.

---

## 1. Process Structure

**Two processes total, running side by side on the same machine (or across the two laptops):**

1. **Backend process** — one Python process running FastAPI (via Uvicorn). Contains everything: video capture, YOLO, DeepSORT, MediaPipe, rule engine, SQLite, OpenAI calls, WebSocket/REST server.
2. **Frontend process** — one Node process running the Vite dev server, serving the React app to a browser.

**No separate worker processes, no message queue (Redis etc.), no microservices.** For a 3-day build with one live camera source, this is unnecessary complexity — a single backend process handling everything in one place is simpler to build, debug, and demo.

---

## 2. Inside the Backend Process — Concurrency Model

FastAPI needs to do two things at once:
- Continuously run the detection pipeline (capture frame → YOLO → DeepSORT → MediaPipe → rules) — this needs to keep running constantly, frame after frame
- Serve WebSocket connections and REST requests without freezing while that loop runs

**Solution: one async background task + a shared queue.**

```
On server startup:
  1. Load YOLO model, initialize DeepSORT, initialize MediaPipe
  2. Open camera connection (DroidCam virtual webcam)
  3. Load saved zones from disk into memory
  4. Start the detection loop as an async background task
  5. THEN start accepting WebSocket/REST connections

Detection loop (runs continuously, forever, in the background):
  1. Read one frame from camera
  2. Run YOLO → boxes
  3. Run DeepSORT → tracked IDs
  4. Run MediaPipe pose (if needed for fall detection)
  5. Run rule engine against zones + tracked IDs + time
  6. If a rule fires and passes its confirmation window → build Alert object
      → save snapshot, write to SQLite, call GPT-4o for narration
  7. Push the annotated frame (always) and any new alert (if one fired)
     into an in-memory queue

WebSocket handler (per connected client):
  - Reads from the queue continuously
  - Forwards frame/alert messages to the connected browser,
    matching CONTRACT.md shapes exactly
```

This means the detection loop never waits on the network, and the WebSocket never blocks the detection loop — they're decoupled by the queue.

**Startup order matters and must be enforced**: camera + models must be ready *before* the server starts accepting connections, otherwise the frontend connects to a live socket that has nothing to send yet, which looks like a bug during a demo.

---

## 3. Where State Lives

| Data | Where it lives while running | Where it's persisted |
|---|---|---|
| Zone polygons | In memory (loaded at startup, updated on POST `/api/zones`) | `zones.json` or a `zones` table in SQLite — re-read into memory on save, never re-read from disk per-frame |
| Per-person loitering timers | In memory only, keyed by DeepSORT tracked_id | Not persisted — timers reset if the backend restarts, which is acceptable for a live demo |
| Alerts | Written to SQLite immediately when fired | SQLite file on disk, this is the permanent record |
| Evidence snapshots | Saved as `.jpg` files to `/backend/snapshots/` | Referenced by path in the SQLite `alerts` table |
| Live frame stream | Never persisted, exists only in the in-memory queue → WebSocket | N/A — it's a live stream, not stored (only alert-triggered snapshots are saved) |

---

## 4. Data Flow — One Full Cycle

This is the same story from the plain-English walkthrough, mapped to actual runtime steps:

```
DroidCam → cv2.VideoCapture() reads frame
    ↓
YOLOv8 → person bounding boxes
    ↓
DeepSORT → persistent tracked_id per person
    ↓
[If checking for fall] MediaPipe Pose → skeleton keypoints
    ↓
Rule Engine checks:
    - after_hours: is tracked_id inside a zone with "after_hours" rule,
      AND is current time outside allowed hours?
    - loitering: is tracked_id inside a zone with "loitering" rule,
      AND has this tracked_id's in-zone timer exceeded threshold,
      AND did it pass the confirmation window (no long gaps)?
    - fall: did this tracked_id's pose show a velocity/aspect-ratio spike,
      AND is it now sustained low for the confirmation beat?
    ↓
[If a rule fires] → Alert object created
    ↓
Snapshot saved to /snapshots  →  SQLite row written  →  GPT-4o narrates
    ↓
Alert message + current frame pushed to in-memory queue
    ↓
WebSocket handler forwards to all connected frontend clients
    ↓
React frontend receives, renders live video + alert card
```

---

## 5. Why This Structure (not something more complex)

- **No microservices / message broker**: one camera, one demo booth, one backend process is all the load this system will ever see in its current scope. Adding Redis/Celery/separate workers would add setup risk for zero benefit at this scale.
- **No persisted per-frame data**: only alert-triggering moments are saved as evidence — saving every frame would fill disk fast and isn't needed for the product's purpose (early-warning alerts, not full video archival).
- **Single WebSocket channel for both frames and alerts**: simpler than two separate connections; the `type` field in each message (per `CONTRACT.md`) is enough for the frontend to route messages correctly.
- **In-memory zone state, disk-backed**: zones change rarely (drawn once at venue setup, maybe adjusted once), so re-reading from disk on every frame would be wasteful — load once, update in memory on change, persist to disk so a restart doesn't lose them.

---

## 6. Two-Laptop Setup Note

Given the hardware split in `PROJECT_OVERVIEW.md` (RTX 3050 laptop for GPU-heavy inference, i5/8GB as secondary):

- **Simplest option for the expo booth:** run both backend and frontend on the RTX 3050 laptop, open the browser locally (`localhost`). Zero network complexity, zero risk of laptop-to-laptop connectivity issues at a crowded venue.
- **Only if you want a second physical screen for judges:** the i5 laptop can run just the frontend, connecting to the 3050's backend over a shared WiFi hotspot / local network IP instead of `localhost`. This adds a real risk (venue WiFi/hotspot reliability) — recommended only if tested and proven stable well before the 19th, otherwise default to single-laptop mode.
