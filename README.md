# 🛡️ SAGE — Smart AI-based Guardian for Emergencies
### AI-Powered Campus Safety & Behavioral Intelligence System

[![Python 3.11](https://img.shields.io/badge/Python-3.11-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![YOLOv8](https://img.shields.io/badge/Ultralytics-YOLOv8-00FFFF?style=for-the-badge&logo=yolo&logoColor=black)](https://github.com/ultralytics/ultralytics)
[![OpenAI GPT-4o](https://img.shields.io/badge/OpenAI-GPT--4o_Vision-412991?style=for-the-badge&logo=openai&logoColor=white)](https://openai.com/)
[![SQLite](https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://www.sqlite.org/)

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Tech Stack](#-tech-stack)
- [Repository Structure](#-repository-structure)
- [Complete Setup Guide](#-complete-setup-guide)
  - [Prerequisites](#1-prerequisites)
  - [Step 1: Clone Repository](#2-clone-repository)
  - [Step 2: Backend Setup & Environment](#3-backend-setup--environment)
  - [Step 3: Frontend Setup](#4-frontend-setup)
  - [Step 4: Running the System](#5-running-the-system)
- [Camera Configuration (DroidCam / Webcam / Video)](#-camera-configuration)
- [Venue Calibration & Zone Drawing Guide](#-venue-calibration--zone-drawing-guide)
- [API & WebSocket Specification](#-api--websocket-specification)
- [False-Positive Protection & Deterministic Logic](#-false-positive-protection--deterministic-logic)
- [Troubleshooting & FAQ](#-troubleshooting--faq)
- [License & Contributors](#-license--contributors)

---

## 🌟 Overview

**SAGE** (*Smart AI-based Guardian for Emergencies*) is an AI-assisted campus safety intelligence system that transforms standard passive CCTV/video surveillance feeds into an active, real-time behavioral monitoring and early-warning engine.

Designed specifically for **college campuses, hostel gates, isolated pathways, and women's safety zones**, SAGE continuously analyzes video streams to detect suspicious or hazardous behavior:
- **Restricted presence outside permitted hours** (e.g. after-hours entry)
- **Prolonged loitering** in sensitive locations
- **Sudden distress or fall movement**

When a safety incident is confirmed by the deterministic rule engine, SAGE captures an evidence snapshot, logs the event to SQLite, produces a concise natural-language incident narration via **OpenAI GPT-4o Vision**, and broadcasts the alert and annotated video feed live to a modern security operations dashboard via **WebSockets**.

> 💡 **Core Design Philosophy:** *Detection is strictly deterministic and rule-based. The AI provides early warning; human security personnel make the final decision.*

---

## 🚀 Key Features

| Feature | Description | Status |
|---|---|---|
| 🌙 **After-Hours Presence Detection** | Identifies individuals entering designated sensitive zones (hostel perimeter, isolated walkways) during curfew/restricted time windows (e.g., 21:00 – 06:00). | 🟢 Fully Implemented |
| ⏱️ **Loitering Monitoring** | Tracks per-person ground positions and flags sustained presence exceeding threshold duration (with tolerance for tracking jitter). | 🟢 Fully Implemented |
| 🚨 **Fall & Distress Movement** | Detects sudden collapses and distress dynamics using bounding-box velocity and MediaPipe pose keypoints, verified by sustained low-height confirmation. | 🟢 Fully Implemented |
| 🎯 **Persistent DeepSORT Tracking** | Assigns persistent tracking IDs across frames to track trajectories and prevent duplicate triggers. | 🟢 Fully Implemented |
| 📐 **Interactive Zone Calibration** | Web-based polygon canvas tool allows security operators to draw and arm custom zones on live camera frames in under 2 minutes. | 🟢 Fully Implemented |
| 🎙️ **GPT-4o Incident Narration** | Automatically drafts a single-sentence plain-English summary of confirmed security alerts with visual context. | 🟢 Fully Implemented |
| 🖥️ **Tactical Security Dashboard** | Recessed tactical HUD viewport, real-time animated alert feed, telemetry overlays, and snapshot modal review. | 🟢 Fully Implemented |
| 🗄️ **Incident History & Audit Vault** | Persistent SQLite storage with snapshot image archiving and REST querying for post-incident review. | 🟢 Fully Implemented |

---

## 🏗️ System Architecture

```
                                  ┌───────────────────────────────┐
                                  │   Camera Source (DroidCam,    │
                                  │    USB Webcam, or Video)      │
                                  └───────────────┬───────────────┘
                                                  │ cv2.VideoCapture()
                                                  ▼
                                  ┌───────────────────────────────┐
                                  │ FreshFrameReader Thread (0ms) │
                                  └───────────────┬───────────────┘
                                                  │
                        ┌─────────────────────────┴─────────────────────────┐
                        │              BACKEND PIPELINE (FastAPI)           │
                        │                                                   │
                        │  1. YOLOv8 (ultralytics) → Person Detections      │
                        │  2. DeepSORT → Persistent Tracked IDs             │
                        │  3. MediaPipe Pose → Keypoint & Fall Analysis     │
                        │  4. Deterministic Rule Engine (Zones, Time)       │
                        │  5. Sustained Confirmation Window Check           │
                        └─────────────────────────┬─────────────────────────┘
                                                  │ Confirmed Alert Event
                                                  ▼
                        ┌───────────────────────────────────────────────────┐
                        │  • Save Snapshot (.jpg) to /backend/snapshots     │
                        │  • Persist Record to SQLite (campus_safety.db)    │
                        │  • GPT-4o Vision API Narration (with fallback)    │
                        └─────────────────────────┬─────────────────────────┘
                                                  │
                                  ┌───────────────┴───────────────┐
                                  │   FastAPI Async Queue Hub     │
                                  └───────┬───────────────┬───────┘
                                          │               │
                     WebSocket: /ws/stream│               │REST: /api/zones, /api/alerts
                                          ▼               ▼
                        ┌───────────────────────────────────────────────────┐
                        │             FRONTEND (React 19 + Vite)            │
                        │                                                   │
                        │  • Tactical Live Monitor Viewport & Reticles      │
                        │  • Real-Time Alert Feed & Snapshot Inspection     │
                        │  • Zone Calibration Canvas (Point-&-Click)        │
                        │  • Incident History & Audit Screen                │
                        └───────────────────────────────────────────────────┘
```

---

## 💻 Tech Stack

### Backend
- **Python 3.11**
- **FastAPI & Uvicorn**: Async ASGI web server and real-time WebSocket broadcasting.
- **Ultralytics YOLOv8** (`yolov8n.pt`): Fast real-time person detection.
- **DeepSORT** (`deep-sort-realtime`): Real-time multi-object tracking with persistent IDs.
- **MediaPipe Pose**: Body-pose and skeletal keypoint estimation.
- **OpenCV** (`opencv-python`): Video stream decoding, polygon point testing, and frame annotation.
- **OpenAI Python SDK** (`gpt-4o`): Plain-English alert narration from evidence snapshots.
- **SQLite 3**: Zero-config persistent incident logging.

### Frontend
- **React 19** + **Vite 8**: High-performance UI development and rapid HMR.
- **Tailwind CSS v4**: Tactical security operations design system.
- **Lucide React**: Modern iconography.
- **HTML5 Canvas**: Frame capture and polygon zone calibration editor.

---

## 📂 Repository Structure

```
SAGE/
├── backend/
│   ├── main.py                # FastAPI server, REST routes, WebSocket stream & lifecycle
│   ├── requirements.txt       # Pinned backend Python dependencies
│   ├── .env.example           # Environment template (API keys, camera source, ports)
│   ├── zones.json             # Calibrated zone polygons and assigned active rules
│   ├── campus_safety.db       # SQLite incident database
│   ├── snapshots/             # Saved evidence frames for verified alerts
│   ├── detection/
│   │   ├── detector.py        # FreshFrameReader, YOLOv8 + DeepSORT live capture loop
│   │   └── rules.py           # Polygon point-in-zone test, after-hours & loitering rules
│   ├── llm/
│   │   └── narrate.py         # OpenAI GPT-4o Vision incident narration with fallback
│   └── db/
│       └── models.py          # SQLite schema initialization and alert queries
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── LiveFeed.jsx        # Video canvas, telemetry overlay, HUD reticles
│   │   │   ├── AlertFeed.jsx       # Real-time animated incident card feed
│   │   │   ├── AlertCard.jsx       # Alert card item with urgency badge and snapshot modal
│   │   │   ├── ZoneEditor.jsx      # Interactive polygon zone calibration canvas
│   │   │   ├── IncidentHistory.jsx # Searchable historical alert records & filters
│   │   │   ├── SnapshotModal.jsx   # High-resolution evidence viewer
│   │   │   ├── TopNavBar.jsx       # Status bar, connection indicator, camera label
│   │   │   └── BottomNavBar.jsx    # Module switcher & alert badge counter
│   │   ├── App.jsx                 # Root React application component
│   │   ├── main.jsx                # React DOM entrypoint
│   │   └── index.css               # Design tokens and styling
│   ├── package.json           # Frontend dependencies and npm scripts
│   └── vite.config.js         # Vite configuration with Tailwind CSS plugin
├── Docs/                      # Architecture, contract, and design documentation
├── yolov8n.pt                 # YOLOv8 nano pre-trained weights
├── CLAUDE.md                  # Project rules and agent guidelines
└── README.md                  # Main project guide and setup manual
```

---

## 🛠️ Complete Setup Guide

Follow these steps to run SAGE locally on Linux, macOS, or Windows.

### 1. Prerequisites
Ensure you have the following installed on your system:
- **Python 3.11** (`python3 --version` or `python --version`)
- **Node.js 18+** & **npm** (`node --version`, `npm --version`)
- **Git** (`git --version`)
- A webcam, smartphone with DroidCam, or an RTSP/MP4 video file.

---

### 2. Clone Repository

```bash
git clone https://github.com/Tanish18906/SAGE.git
cd SAGE
```

---

### 3. Backend Setup & Environment

#### a. Create and Activate Python Virtual Environment
```bash
# Navigate to repository root
cd /path/to/SAGE

# Create virtual environment with Python 3.11
python3.11 -m venv backend/.venv

# Activate the virtual environment
# On Linux / macOS:
source backend/.venv/bin/activate
# On Windows (Command Prompt):
# backend\.venv\Scripts\activate.bat
# On Windows (PowerShell):
# backend\.venv\Scripts\Activate.ps1
```

#### b. Install Python Dependencies
```bash
pip install --upgrade pip
pip install -r backend/requirements.txt
```

#### c. Configure Environment Variables
Copy `.env.example` to `.env` inside `backend/`:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your settings:
```env
# Optional: Set your OpenAI API Key for GPT-4o plain-English incident narrations
# If left blank, the system automatically falls back to deterministic rule summaries
OPENAI_API_KEY=your_openai_api_key_here

# Camera Source:
#   - Set to 0, 1, or 2 for built-in/USB webcam
#   - Set to DroidCam URL (e.g., http://192.168.1.50:4747/video)
#   - Set to local video path (e.g., test_video.mp4)
CAMERA_INDEX=0

# Server Host & Port
PORT=8000
HOST=0.0.0.0

# Automatically start the background detection loop when FastAPI launches
AUTO_START_DETECTOR=true

# Optional: Override clock for testing after-hours presence during daytime (ISO-8601)
# SIMULATED_TIME="2026-08-15T22:30:00+00:00"
```

---

### 4. Frontend Setup

Open a new terminal window, navigate to the `frontend/` directory, and install npm packages:

```bash
cd frontend
npm install
```

---

### 5. Running the System

#### Terminal 1 — Start the Backend:
```bash
# Ensure virtual environment is activated
source backend/.venv/bin/activate

# Run FastAPI backend with Uvicorn
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```
*The backend will initialize SQLite (`campus_safety.db`), load YOLOv8, open the camera feed, and start the WebSocket server at `ws://localhost:8000/ws/stream`.*

#### Terminal 2 — Start the Frontend:
```bash
cd frontend
npm run dev
```

Open your browser and navigate to:
```
http://localhost:5173
```

---

## 📹 Camera Configuration

SAGE is camera-agnostic and supports multiple video input sources.

### Option A: Built-in / USB Webcam (Default)
Set `CAMERA_INDEX` in `backend/.env`:
```env
CAMERA_INDEX=0
```

### Option B: Smartphone via DroidCam (Recommended for Live Demos)
1. Install **DroidCam** on your Android or iOS device.
2. Connect your phone and PC to the same Wi-Fi network (or connect via USB with ADB port forwarding).
3. Open the DroidCam app and note the **Wi-Fi IP** and **Port** (e.g., `192.168.1.50:4747`).
4. Update `backend/.env`:
   ```env
   CAMERA_INDEX=http://192.168.1.50:4747/video
   ```
5. Restart the backend server.

### Option C: Pre-Recorded Video File
```env
CAMERA_INDEX=path/to/demo_footage.mp4
```

---

## 📐 Venue Calibration & Zone Drawing Guide

Calibrating monitoring zones takes under 2 minutes directly in the web UI:

```
Step 1: Open SAGE Dashboard  ──►  Step 2: Switch to "Zone Calibration" tab
                                            │
Step 4: Arm Rules (After-Hours /) ◄──  Step 3: Click "Capture Current Frame"
        Loitering) & Click "Save"              and Click points to draw polygon
```

1. Open the dashboard at `http://localhost:5173` and click the **Zone Calibration** tab in the bottom bar.
2. Click **Capture Current Frame** to freeze a reference frame from the live stream.
3. Click anywhere on the frame to place polygon boundary points (e.g., around a doorway, walkway, or hostel gate).
4. Enter a descriptive **Zone Name** (e.g., `Hostel Main Gate`, `South Pathway`).
5. Select active detection rules:
   - ☑️ **After-Hours Presence** (restricts entry during night-time hours)
   - ☑️ **Loitering Detection** (alerts on sustained presence)
6. Click **Save Zone Polygon**. The zone immediately persists to `backend/zones.json` and syncs with the live detection loop in real time.

---

## 🔌 API & WebSocket Specification

### WebSocket Stream
- **URL**: `ws://localhost:8000/ws/stream`

#### Incoming Frame Message:
```json
{
  "type": "frame",
  "timestamp": "2026-08-19T21:45:03.120Z",
  "image_base64": "<base64_encoded_jpeg>",
  "detections": [
    {
      "tracked_id": 7,
      "box": { "x": 120, "y": 80, "width": 60, "height": 140 }
    }
  ]
}
```

#### Incoming Alert Message:
```json
{
  "type": "alert",
  "id": "a1b2c3d4",
  "alert_type": "after_hours",
  "zone_id": "hostel_gate",
  "tracked_id": 7,
  "timestamp": "2026-08-19T21:45:03.120Z",
  "snapshot_url": "/snapshots/a1b2c3d4.jpg",
  "narration": "A person has been detected entering the hostel gate during restricted after-hours.",
  "confirmed": true
}
```

### REST Endpoints
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Server health check |
| `GET` | `/api/zones` | Retrieve all configured active zones |
| `POST` | `/api/zones` | Save a new calibrated zone polygon |
| `DELETE` | `/api/zones/{zone_id}` | Delete an existing zone |
| `GET` | `/api/alerts` | Query incident history with optional `limit`, `alert_type`, and `zone_id` |
| `GET` | `/snapshots/{filename}` | Serve evidence snapshot image |

---

## 🛡️ False-Positive Protection & Deterministic Logic

To prevent false alarms in crowded or noisy environments:

1. **Ground Point Geometry**: The detection engine tests the person's **bottom-center coordinate (feet position)** against the polygon boundary using `cv2.pointPolygonTest`. A person merely walking *beside* a zone will not trigger it.
2. **Sustained Confirmation Windows**: Detections require continuous presence across multiple frames rather than single-frame spikes.
3. **Alert Cooldown Deduplication**: An active person inside a restricted zone triggers one alert and enters a 60-second cooldown timer, preventing alert floods while maintaining continuous operator awareness.
4. **Decoupled AI Narration**: GPT-4o Vision is only called *after* an alert has been confirmed deterministically. It produces human-readable context, but never acts as a gatekeeper for detection logic.

---

## ❓ Troubleshooting & FAQ

#### Q: The video stream in the dashboard is black or shows "Connecting to Video Stream".
- Ensure the backend server is running and the detector started.
- Check `backend/.env` to ensure `CAMERA_INDEX` is accessible.
- If using DroidCam, verify that your phone and PC can ping each other and the DroidCam port (`4747`) is not blocked by a firewall.

#### Q: Alerts are not firing during daytime testing.
- After-hours rules trigger between `21:00` (9 PM) and `06:00` (6 AM).
- To test during the day, uncomment and set `SIMULATED_TIME` in `backend/.env`:
  ```env
  SIMULATED_TIME="2026-08-15T22:30:00+00:00"
  ```
  Restart the backend for the simulated time to take effect.

#### Q: What if I don't have an OpenAI API Key?
- SAGE works completely offline without an OpenAI API key. If `OPENAI_API_KEY` is not provided, the built-in deterministic fallback narration engine automatically formats clean incident descriptions.

#### Q: How do I test the backend detection independently?
- You can run the standalone OpenCV detector window:
  ```bash
  source backend/.venv/bin/activate
  python backend/detection/detector.py
  ```

---

## 👥 Authors & Acknowledgments

- **Lead CV & Architecture**: SAGE Development Team
- **Models & Tools**: Ultralytics YOLOv8, DeepSORT Realtime, MediaPipe, FastAPI, Vite, React
- **Designed for**: College Campus Safety, Hostel Perimeter Security, and Women's Safety Operations

---

<p align="center">
  <b>SAGE — Early Warning Intelligence for Safer Campuses.</b>
</p>
