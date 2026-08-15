# AI-Powered Campus Safety Intelligence System
### Complete Tech Stack

---

## 0. Architecture Summary

We are building a **separated frontend + backend** system, not a single Streamlit app. This is a deliberate choice: it costs more integration effort (real-time video streaming over WebSocket) but produces a dashboard that looks and feels like a real deployable product, not a generic hackathon demo — which matters directly for how judges perceive the project.

```
┌─────────────────────────────────────────────────────────────┐
│  DroidCam (phone on tripod) → virtual webcam on laptop       │
└───────────────────────────┬───────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (FastAPI, Python)                  │
│                                                                 │
│  OpenCV capture → YOLOv8 (person detection)                   │
│       → DeepSORT (persistent tracking IDs)                    │
│       → MediaPipe Pose (fall detection only)                  │
│       → Rule Engine (zones, timers, confirmation windows)      │
│       → Alert Event fires (confirmed, sustained pattern only)  │
│       → OpenAI gpt-4o Vision (narrates confirmed alert only)   │
│       → SQLite (persist alert + snapshot + narration)         │
│                                                                 │
│  Exposes:                                                      │
│   • WebSocket /ws/stream   → live annotated frames + alerts   │
│   • REST /api/zones        → save/load zone polygons          │
│   • REST /api/alerts       → alert history (for dashboard)    │
└───────────────────────────┬───────────────────────────────────┘
                             ↓ WebSocket + REST (localhost)
┌─────────────────────────────────────────────────────────────┐
│                  FRONTEND (React + Vite + Tailwind)            │
│                                                                 │
│  • Live video panel (renders streamed frames)                 │
│  • Animated real-time alert feed                              │
│  • Zone-drawing canvas (capture frame → click polygon → save) │
│  • Incident history view (pulls from SQLite via REST)         │
│  • Dark "security ops" visual theme                            │
└─────────────────────────────────────────────────────────────┘
```

**Design principle carried from the project overview:** detection is deterministic and rule-based; the LLM only narrates *after* an alert is already confirmed. This keeps the safety-critical path explainable and avoids live/open AI interaction on stage.

---

## 1. Backend

| Component | Choice | Notes |
|---|---|---|
| Language | Python 3.11 | Pin this exact version on both laptops to avoid MediaPipe/Ultralytics compatibility issues |
| Web framework | **FastAPI** | Async support needed for the video WebSocket loop; auto-generates OpenAPI docs, useful for Q&A/demo credibility |
| ASGI server | **Uvicorn** | `uvicorn main:app --reload` for dev |
| Real-time video/alerts | **WebSocket** (native FastAPI) | Streams annotated JPEG frames (base64) + alert JSON events to frontend |
| Object detection | **YOLOv8** via `ultralytics` pip package | Pretrained `yolov8n.pt` or `yolov8s.pt` (nano/small — prioritize speed for live demo over accuracy) |
| Tracking | **DeepSORT** via `deep-sort-realtime` pip package | Plugs directly into Ultralytics YOLO output; gives persistent IDs across frames |
| Pose estimation | **MediaPipe** (`mediapipe` pip package), Pose solution | Used only for fall/distress detection heuristic |
| Video I/O | **OpenCV** (`opencv-python`) | Reads DroidCam virtual webcam via `cv2.VideoCapture` |
| LLM narration | **OpenAI API**, `gpt-4o` | Called server-side only, only on confirmed alerts; sends cropped evidence frame + alert metadata |
| Database | **SQLite** via `sqlite3` (stdlib) or `SQLAlchemy` | Stores alert history, snapshot paths, narrations — powers the incident-history view |
| Config | Plain Python dataclass / `.env` via `python-dotenv` | Zone thresholds, time windows, API keys |

## 2. Frontend

| Component | Choice | Notes |
|---|---|---|
| Framework | **React** (via **Vite**) | Fast dev server, minimal config, ideal for a beginner vibe coder to iterate quickly |
| Styling | **Tailwind CSS** | Fast to vibe-code a polished dark UI without hand-writing CSS |
| Video rendering | `<img>` or `<canvas>` updated from WebSocket frame stream | Native `WebSocket` API in React, no extra library needed |
| Zone drawing | HTML5 `<canvas>` click-to-place-point polygon tool | Captures one frame, overlays clickable canvas, sends polygon coords to backend REST endpoint |
| Icons | `lucide-react` | Clean icon set, fits a security-ops dashboard aesthetic |
| Charts (optional, incident history) | `recharts` | If time allows — e.g. alerts-per-zone bar chart for the history view |
| State/data fetching | React built-in `useState`/`useEffect` | No need for Redux/React Query at this scale — keep it simple |

## 3. Storage

| Component | Choice | Notes |
|---|---|---|
| Database | **SQLite** | Single file, zero setup, real persistence — enables a genuine "incident history" screen, not just a live feed |
| Schema (minimal) | `alerts` table: `id, timestamp, alert_type, zone_id, tracked_person_id, snapshot_path, narration, confirmed` | Simple enough to build in an hour, enough to demo real history |
| Evidence snapshots | Saved as `.jpg` files to a local `/snapshots` folder on the backend, path referenced in DB | Avoids storing large blobs directly in SQLite |

## 4. Dev Tooling & Repo Structure

```
campus-safety-ai/
├── backend/
│   ├── main.py                # FastAPI app, WebSocket + REST routes
│   ├── detection/
│   │   ├── detector.py        # YOLO + DeepSORT loop
│   │   ├── pose.py            # MediaPipe fall detection
│   │   └── rules.py           # Zone/time/confirmation-window logic
│   ├── llm/
│   │   └── narrate.py         # OpenAI gpt-4o alert narration
│   ├── db/
│   │   └── models.py          # SQLite schema + helpers
│   ├── zones.json             # Saved zone polygons (venue-calibrated)
│   ├── snapshots/             # Evidence frame images
│   ├── requirements.txt
│   └── .env                   # OPENAI_API_KEY etc. (gitignored)
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── LiveFeed.jsx
│   │   │   ├── AlertFeed.jsx
│   │   │   ├── ZoneEditor.jsx
│   │   │   └── IncidentHistory.jsx
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
├── README.md
├── PROJECT_OVERVIEW.md
├── TECH_STACK.md
└── .gitignore
```

| Tool | Purpose |
|---|---|
| Git + GitHub | Version control, required for expo registration link |
| `requirements.txt` (backend) | Pin exact package versions once installed and working |
| `package.json` (frontend) | Standard npm/Vite dependency management |
| `.gitignore` | Exclude `.env`, `node_modules/`, `__pycache__/`, `snapshots/`, `*.db` |
| `.env.example` | Committed placeholder showing required env vars without real keys |

## 5. Key Package Versions (pin once confirmed working)

```
# backend/requirements.txt (approximate — pin exact versions after first successful install)
fastapi
uvicorn[standard]
ultralytics          # YOLOv8
deep-sort-realtime
mediapipe
opencv-python
openai
python-dotenv
websockets
```

```
# frontend/package.json (key deps)
react
vite
tailwindcss
lucide-react
recharts   # optional, for incident-history charts
```

## 6. Hardware Mapping (from Project Overview)

| Machine | Role in this stack |
|---|---|
| RTX 3050 laptop | Runs the **backend** (YOLO/DeepSORT/MediaPipe inference) — GPU-bound work belongs here |
| i5/8GB laptop | Runs the **frontend** dev server, or acts as a secondary display for judges while backend runs on the 3050 |

## 7. Risk Note (carried over from planning discussion)

The WebSocket video-streaming bridge between backend and frontend is the highest-risk integration point in this stack — not the ML models themselves, which are pretrained and well-documented. This will be built and validated first, on Day 1 (even as a trivial "colored box moving on screen" proof), specifically so there are still 2 full days to fall back to a simpler approach if it fights us.
