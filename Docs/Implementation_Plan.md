# AI-Powered Campus Safety Intelligence System
### Implementation Plan

---

## 0. Guiding Principle

We build **one feature at a time, fully working end-to-end, before starting the next.** "Working" means the full chain: camera → detection → tracking → rule → alert → database → AI narration → live dashboard. A feature is not "done" until you can see it happen live in the browser — not just in a terminal log.

`main` branch must always be in a working, demoable state. Nothing broken merges into `main`.

**Build order (easiest → hardest, confirmed):**
1. After-Hours Restricted Presence
2. Loitering Detection
3. Fall / Distress Detection

Each of these is a **Phase**. Inside every phase, work is broken into small numbered **Steps**. This is the level coding agents must actually follow.

---

## 0.1 Rules for Coding Agents — Read This Before Every Session

These rules apply to **every step, in every phase, for every agent** (backend or frontend, whichever CLI/model is being used):

1. **Do exactly one Step at a time.** Read the current step. Build only what that step describes. Do not start the next step in the same turn.
2. **Stop after finishing the step and wait for explicit approval** before continuing to the next one. Do not say "I'll also go ahead and do the next step" — stop, report what was done, wait.
3. **Do not add anything not asked for in the step.** No extra error handling, no extra config options, no "while I was in there I also refactored/renamed/improved X," no new dependencies, no features from a later phase or step. If you think something extra is genuinely needed, say so and ask — do not just add it.
4. **If a step is ambiguous, ask rather than assume.** Guessing and writing code based on an assumption is exactly the failure mode this rule exists to prevent.
5. **Show the actual output of the step** (the file(s) changed, and if applicable, what running it looks like) so the human can verify before approving the next step — don't just claim it works.
6. **Never touch files outside your owned scope** (per `BACKEND.md` / `FRONTEND.md` / `BACKEND_SPLIT.md`) even if a step seems to require it — flag the cross-boundary need instead.

If a coding agent violates rule 1-3 in the middle of a session, stop it, discard or review the extra work carefully before keeping any of it, and restate these rules before continuing.

---

## 1. Branching Strategy

```
main                    ← always working, demoable at every merge
 ├── backend-dev         ← your (backend) ongoing integration branch
 │     ├── feature/after-hours
 │     ├── feature/loitering
 │     └── feature/fall-detection
 └── frontend-dev        ← friend's (frontend) ongoing integration branch
       ├── feature/after-hours   (frontend side of same feature, mirrored name)
       ├── feature/loitering
       └── feature/fall-detection
```

**Rule:** a `feature/*` branch only merges into its `-dev` branch once its own phase gate (below) is passed. `backend-dev` and `frontend-dev` only merge into `main` **together, at the same time**, once a feature works end-to-end across both.

---

## 2. Phase 0 — Contract + Skeleton
**Who:** Both of you, together, before splitting off
**Goal:** Agree on the exact shape of data flowing between backend and frontend, so both sides can be built independently without guessing.

### Steps
1. **Write `CONTRACT.md`** (already done — see repo). Both of you read it fully before continuing.
2. **Create the repo + folder structure** exactly as defined in `TECH_STACK.md` section 4. Nothing inside `/backend` or `/frontend` yet except empty placeholders.
   - ✅ Checkpoint: folder structure exists, matches `TECH_STACK.md`, pushed to `main`.
3. **Backend: create an empty FastAPI app** with a single test route (e.g. `GET /health` returning `{"status": "ok"}`). Nothing else — no detection code, no WebSocket yet.
   - ✅ Checkpoint: `uvicorn main:app` starts without errors, `/health` responds.
4. **Frontend: create an empty Vite + React app** with a blank dashboard shell (just a page that says the app name, dark background per `UI_DESIGN.md`). Nothing else — no components yet.
   - ✅ Checkpoint: `npm run dev` starts without errors, blank shell renders in browser.

**Gate to move on to Phase 1:** Steps 1-4 all checked off. Both servers run independently without errors.

---

## 3. Phase 1 — After-Hours Restricted Presence (+ Zone Tool)
**Branches:** `feature/after-hours` off both `backend-dev` and `frontend-dev`
**Why first:** Simplest rule logic (no timers, no pose analysis) — this phase's real purpose is proving the *entire pipeline* works, once. Every later phase just adds a new rule module on top of this same proven chain.

### Backend Steps (per `BACKEND_SPLIT.md` ownership)
1. **[Agent A]** Open the camera (DroidCam) and read raw frames in a loop — no YOLO yet, just prove capture works. Print frame shape/size to confirm.
   - ✅ Checkpoint: frames are being read continuously without crashing.
2. **[Agent A]** Run YOLOv8 on each captured frame, draw bounding boxes on detected people, display locally (e.g. `cv2.imshow` for dev testing only).
   - ✅ Checkpoint: boxes visibly appear around real people in the test window.
3. **[Agent A]** Add DeepSORT on top of YOLO output — each box now has a persistent `tracked_id` that stays the same as the person moves across frames.
   - ✅ Checkpoint: the same person keeps the same ID across multiple frames in the test window.
4. **[Agent B]** Build the FastAPI WebSocket endpoint (`/ws/stream`) that can accept a connection and send a hardcoded test `frame` message matching `CONTRACT.md` — no real detection data yet, just proving the socket works.
   - ✅ Checkpoint: a simple test client (or the frontend's LiveFeed component) receives the hardcoded message.
5. **[Agent B]** Build `POST /api/zones` and `GET /api/zones` — save/load a zone polygon to/from SQLite or `zones.json`, matching `CONTRACT.md` section 4 exactly. No zone-checking logic yet, just storage.
   - ✅ Checkpoint: a zone can be POSTed and then GET returns it back correctly.
6. **[Agent A]** Build the **zone-check function**: given a saved zone polygon + a tracked person's box, return true/false for "is this person inside this zone." Test it standalone with a hardcoded zone and hardcoded box coordinates first, before wiring to live video.
   - ✅ Checkpoint: function correctly returns true/false against a few manual test cases.
7. **[Agent A]** Wire the zone-check into the live detection loop from Step 3 — for each tracked person, check against all saved zones (loaded via Agent B's Step 5 storage).
   - ✅ Checkpoint: walking into a real drawn zone correctly flips the check to true, live.
8. **[Agent A]** Build the **after-hours time-check rule**: if a person is inside a zone that has the `"after_hours"` rule AND current time is outside allowed hours → produce the internal `Alert` dict (per `BACKEND_SPLIT.md` section 3). For testing, allow overriding "current time" so this can be tested at any hour, not just actually late at night.
   - ✅ Checkpoint: `Alert` dict is correctly produced (printed/logged) when both conditions are true, and NOT produced when only one is true.
9. **[Agent B]** Build the queue-based handoff: Agent A's loop pushes `Alert` dicts into a shared queue; Agent B's code reads from it.
   - ✅ Checkpoint: an `Alert` dict pushed by Agent A's code is successfully read on Agent B's side (can be tested with a manually-triggered fake alert first).
10. **[Agent B]** On receiving an `Alert`: save snapshot image, write row to SQLite, call GPT-4o (`llm/narrate.py`) for narration, assemble the full alert message per `CONTRACT.md` section 3.
    - ✅ Checkpoint: a real alert produces a saved snapshot file, a new SQLite row, and a real GPT-4o narration string.
11. **[Agent B]** Push the assembled alert message over the WebSocket (replacing the Step 4 hardcoded test message) and continuously push real annotated frames (replacing the Step 4 test frame).
    - ✅ Checkpoint: a connected client receives both live frames and real fired alerts, matching `CONTRACT.md` exactly.
12. **[Agent B]** Build `GET /api/alerts` — returns alert history from SQLite, matching `CONTRACT.md` section 5.
    - ✅ Checkpoint: after a few test alerts, the endpoint returns them correctly, newest first.

### Frontend Steps
1. **LiveFeed component** — connect to the WebSocket, render incoming `frame` messages as an image. Test against Backend Step 4's hardcoded frame first before the real one exists.
   - ✅ Checkpoint: a static/hardcoded test image renders correctly from a WebSocket message.
2. **ZoneEditor component** — capture one frame (can be a manual snapshot for now), render on a canvas, let the user click points to draw a polygon, "save" button sends it via `POST /api/zones`.
   - ✅ Checkpoint: a drawn polygon successfully saves and can be fetched back via `GET /api/zones`.
3. **AlertFeed component** — listen for `alert` WebSocket messages, render a basic alert card (photo + narration + timestamp) per `UI_DESIGN.md` section 5. Test against a hardcoded fake alert message first.
   - ✅ Checkpoint: a fake test alert renders correctly as a card in the feed.
4. **Dashboard layout** — assemble LiveFeed + AlertFeed + ZoneEditor (as a tab, per `UI_DESIGN.md` section 2) into the actual layout structure (video dominant, alert feed side panel).
   - ✅ Checkpoint: layout matches `UI_DESIGN.md` structure, all three components visible and positioned correctly.
5. **Swap from mock data to the real backend** — once Backend Steps 1-12 are done, point LiveFeed/AlertFeed/ZoneEditor at the real WebSocket/REST endpoints instead of hardcoded test data.
   - ✅ Checkpoint: real live video and real alerts now appear, no mock data remaining.

**Gate to merge into `main`:** With a test video (or live), you can draw a zone through the UI, simulate an after-hours time window, walk/stand in that zone, and watch a real alert card appear in the browser with a photo and a written explanation — with zero manual steps in between. Only then merge `feature/after-hours` → `backend-dev` + `frontend-dev` → `main`.

---

## 4. Phase 2 — Loitering Detection
**Branches:** `feature/loitering` off both dev branches
**Why it's easier now:** Reuses the exact same zone-check module and WebSocket/alert/narration pipeline from Phase 1. This phase only adds new logic — it does not touch what already works.

### Backend Steps
1. **[Agent A]** Add a per-`tracked_id` in-zone timer: when a person enters a zone with the `"loitering"` rule, start tracking elapsed time; when they leave, stop/reset it. Test standalone with hardcoded enter/exit events before wiring to live video.
   - ✅ Checkpoint: timer correctly starts, accumulates, and resets against manual test cases.
2. **[Agent A]** Add the confirmation window: tolerate brief tracking gaps (e.g. person "lost" for 1-2 frames) without resetting the timer to zero.
   - ✅ Checkpoint: a simulated brief gap does not reset an in-progress timer; a real exit does.
3. **[Agent A]** Fire the `Alert` dict (`alert_type: "loitering"`) when the timer exceeds the threshold constant. Wire into the live loop.
   - ✅ Checkpoint: standing in a real drawn loitering zone past the threshold produces a real `Alert`, and leaving early does not.
4. **[Agent B]** No new endpoints needed — confirm the existing Step 9-12 pipeline from Phase 1 handles `alert_type: "loitering"` correctly with no changes required (since it's already generic).
   - ✅ Checkpoint: a real loitering alert flows through snapshot → SQLite → narration → WebSocket exactly like an after-hours one did.

### Frontend Steps
1. Add a distinct badge/icon/color for `"loitering"` in the existing AlertFeed card (per `UI_DESIGN.md` section 3) — likely a small conditional on `alert_type`, no new component.
   - ✅ Checkpoint: a loitering alert visibly looks different from an after-hours alert in the feed.

**Gate to merge into `main`:** Stand inside a drawn zone continuously past the threshold duration and see a loitering alert fire distinctly from an after-hours alert (test both in the same session to confirm they don't interfere with each other). Merge only after this is confirmed stable.

---

## 5. Phase 3 — Fall / Distress Detection
**Branches:** `feature/fall-detection` off both dev branches
**Why it's last:** Needs a new AI model (MediaPipe pose) and a real tuned heuristic — the only phase that isn't "just reuse the zone module."

### Backend Steps
1. **[Agent A]** Run MediaPipe Pose on each tracked person, extract keypoints — no fall logic yet, just confirm keypoints are being detected correctly (visualize the skeleton on the test window).
   - ✅ Checkpoint: skeleton keypoints visibly track a real person's pose in the test window.
2. **[Agent A]** Build the velocity/aspect-ratio spike detector: track a person's bounding-box shape/position frame-to-frame, flag a sudden large change. Test standalone against a recorded test clip of a real fall first.
   - ✅ Checkpoint: the spike detector correctly flags the moment of the fall in the test clip.
3. **[Agent A]** Add the sustained-low-height confirmation: after a spike, only confirm as a real fall if the person stays low for a short beat afterward (not an instant bounce-back, which would indicate a crouch/bend or noise).
   - ✅ Checkpoint: a real fall clip confirms; a crouch-and-stand-back-up clip does NOT confirm.
4. **[Agent A]** Fire the `Alert` dict (`alert_type: "fall"`, `zone_id: null`) when confirmed. Wire into the live loop.
   - ✅ Checkpoint: a real live fall produces a real `Alert`; a real live crouch does not.
5. **[Agent B]** Confirm the existing pipeline handles `alert_type: "fall"` with `zone_id: null` correctly (no changes expected, but verify).
   - ✅ Checkpoint: a real fall alert flows through the full pipeline exactly like the other two types.

### Frontend Steps
1. Distinct, higher-urgency visual treatment for `"fall"` alerts (red glow/pulse, per `UI_DESIGN.md` section 3 and 5) in the existing AlertFeed.
   - ✅ Checkpoint: a fall alert is immediately visually distinguishable from the other two types, at a glance.

**Gate to merge into `main`:** Simulate a real fall on camera → alert fires correctly. Simulate a crouch/bend-down → alert does **not** fire. Test both after-hours and loitering still work correctly alongside this new rule (regression check) before merging.

---

## 6. After Phase 3 — Full Prototype Complete

At this point `main` has all 3 features working end-to-end, plus the zone tool and incident-history view. This is the **Day 3 (Aug 17) target** — matching the registration deadline.

**Remaining polish (if time allows, not blocking):**
- Incident-history view refinements (charts, filters)
- UI visual polish pass
- Backup demo video recordings of all 3 scenarios

**Day 4-5 (Aug 18-19):** Buffer only — bug fixes and rehearsal, no new features, per the timeline in `PROJECT_OVERVIEW.md`.

---

## 7. Quick Reference — Gate Checklist

| Phase | Gate to merge to `main` |
|---|---|
| 0 | Backend + frontend both run empty/blank without errors; `CONTRACT.md` written |
| 1 | Zone drawn via UI → after-hours alert fires live → visible in browser with photo + narration |
| 2 | Loitering alert fires after sustained duration, distinct from after-hours, both still work together |
| 3 | Fall fires on real fall, does NOT fire on crouch, after-hours + loitering still work (regression check) |

**Reminder:** within every phase, follow section 0.1 — one step at a time, stop and wait for approval after each, never add unrequested scope.
