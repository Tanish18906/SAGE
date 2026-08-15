# BACKEND.md
### Scope brief — paste this at the start of every backend coding agent session

---

## 🔵 CURRENT PHASE: Phase 1 — After-Hours Restricted Presence (+ Zone Tool)
*(Branch: `feature/after-hours`)*

### Backend Progress Tracker:
- [x] **Phase 0**: Dependencies installed, `.env` template set up, empty FastAPI `/health` route verified.
- [ ] **Phase 1, Step 1-3 [Agent A - Claude]**:
  - [x] Step 1: Camera capture loop in `backend/detection/detector.py` (verified ~15fps, shape=(480, 640, 3)).
  - [x] Step 2: YOLOv8 inference & bounding boxes on detected people (verified on frames, confidence logging).
  - [x] Step 3: DeepSORT persistent tracking IDs across frames (verified persistent IDs over 250+ frames).
- [ ] **Phase 1, Step 4-5 [Agent B - Antigravity]**:
  - [x] Step 4: FastAPI WebSocket `/ws/stream` with frame/status messages matching `CONTRACT.md`.
  - [x] Step 5: Zone storage REST endpoints (`POST /api/zones`, `GET /api/zones`) with disk persistence & in-memory accessor.
- [ ] **Phase 1, Step 6-8 [Agent A - Claude]**:
  - [x] Step 6: Standalone zone-check function `is_person_in_zone` in `backend/detection/rules.py` (7/7 tests passed).
  - [x] Step 7: Wire zone-check into live detection loop with `get_active_zones()` (verified live zone boundary checks).
  - [x] Step 8: After-hours time-check rule producing internal `Alert` dict (verified in rules.py and live loop).
- [ ] **Phase 1, Step 9-12 [Agent B - Antigravity]**:
  - [x] Step 9: Shared queue handoff (`push_alert`, `pop_alert_nowait`, `push_frame`, `get_latest_frame_data`).
  - [x] Step 10: Snapshot saving, SQLite persistence, and GPT-4o narration (`llm/narrate.py`).
  - [x] Step 11: WebSocket alert broadcast & real annotated frame stream (verified with live client).
  - [x] Step 12: `GET /api/alerts` endpoint matching `CONTRACT.md` Section 5 (verified newest-first SQLite query & filters).



---

## Your scope

You are working **only inside `/backend`**. Do not create, edit, or suggest changes to anything inside `/frontend`. If a task seems to require a frontend change, stop and say so instead of doing it — the frontend is being built independently by a teammate.

## What you must produce

All data you send to the frontend (over WebSocket or REST) must match the exact shapes defined in **`CONTRACT.md`** — field names, types, and structure. Do not invent new fields or rename existing ones without the human explicitly updating `CONTRACT.md` first.

## What to build right now

Refer to **`IMPLEMENTATION_PLAN.md`** for the current phase's backend tasks, gate criteria, and build order. Only work on the phase marked above — do not jump ahead to a later phase's logic even if it seems easy, since each phase must be fully proven before the next begins.

## Tech stack you must use

Refer to **`TECH_STACK.md`** section 1 (Backend) for the exact libraries and versions to use — FastAPI, Ultralytics YOLOv8, `deep-sort-realtime`, MediaPipe, OpenCV, OpenAI (`gpt-4o`), SQLite. Do not substitute different libraries without discussing first.

## Ground rules

- `main` branch must always be in a working state. Never merge broken or partially-working code into `main`.
- Work on the current phase's `feature/*` branch (see `IMPLEMENTATION_PLAN.md` section 1 for branch naming).
- Detection/rule logic must stay deterministic (plain if/else, thresholds, timers). The only place an AI model makes a "judgment call" is MediaPipe pose analysis (Phase 3) and DeepSORT tracking — never let GPT-4o decide whether something is an alert. GPT-4o only narrates alerts that already fired.
- If you hit a blocker that isn't covered by these docs, stop and ask the human rather than guessing an approach that might conflict with the frontend or the plan.

## Docs to reference (in this order, if unsure)
1. `IMPLEMENTATION_PLAN.md` — what to build right now, and the gate to know when it's done
2. `CONTRACT.md` — exact data shapes you must send
3. `TECH_STACK.md` — exact libraries/versions to use
4. `PROJECT_OVERVIEW.md` — the big picture, if you need context on *why* a feature works the way it does
