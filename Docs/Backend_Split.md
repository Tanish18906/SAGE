# BACKEND_SPLIT.md
### Splitting backend work across two coding agents

---

## Why split

The backend covers two genuinely different kinds of work: hard, judgment-heavy CV/ML tuning, and well-specified server/plumbing work where the "shape" of the output is already fully defined by `CONTRACT.md`. Splitting along this seam — rather than by feature/phase — means both agents can work in parallel without repeatedly colliding on the same core files.

**Read `BACKEND.md` first, in both sessions — this file only adds the two-agent ownership split on top of it.**

---

## 1. Agent A — Claude Code CLI — "The Brain"

**Owns:** `/backend/detection/`
- `detector.py` — camera capture, YOLOv8 inference, DeepSORT tracking loop
- `pose.py` — MediaPipe pose analysis (fall detection)
- `rules.py` — zone-checking, time-checking, per-ID loitering timers, confirmation windows, fall heuristic (velocity/aspect-ratio spike + sustained-low-height check)

**Why this agent:** This is the hardest, most failure-prone part of the whole system — a bad threshold or a sloppy confirmation window is what causes an embarrassing false alert live in front of judges. This work benefits most from a stronger model's judgment and iterative tuning.

**Responsible for producing:** a plain Python object (or dict) representing a fired, confirmed alert — see the handoff interface in section 3. This agent does **not** touch FastAPI routes, SQLite, or the OpenAI call — it hands off a finished `Alert` and its job is done.

---

## 2. Agent B — Gemini 3.7 Flash (Antigravity CLI) — "The Nervous System"

**Owns:** `/backend/main.py`, `/backend/db/`, `/backend/llm/`
- `main.py` — FastAPI app setup, WebSocket endpoint (`/ws/stream`), REST endpoints (`/api/zones`, `/api/alerts`), startup sequence (per `ARCHITECTURE.md` section 2)
- `db/models.py` — SQLite schema + read/write functions for the `alerts` table
- `llm/narrate.py` — the GPT-4o call: takes an `Alert` + snapshot image, returns a narration string

**Why this agent:** This work has a fixed, already-written spec — `CONTRACT.md` defines exactly what the WebSocket/REST messages must look like, and the narration call is one well-defined API call with a fixed prompt shape. Well-suited to a faster/lighter model implementing a clearly specified interface rather than making judgment calls.

**Responsible for:** receiving an `Alert` object from Agent A's code, saving its snapshot, writing it to SQLite, calling GPT-4o for narration, and broadcasting the final alert message (per `CONTRACT.md` section 3) over the WebSocket. Also responsible for the continuous frame-broadcasting (per `CONTRACT.md` section 2) — pulling annotated frames from the detection loop and pushing them to connected clients.

---

## 3. The Handoff Interface — internal `Alert` object

This is the one thing both agents must agree on and never silently change — same spirit as `CONTRACT.md`, but internal to the backend rather than backend↔frontend.

Agent A's `rules.py` produces this shape whenever a rule fires and passes its confirmation window:

```python
{
    "alert_type": "after_hours",   # "after_hours" | "loitering" | "fall"
    "zone_id": "hostel_gate",      # None for "fall" (not zone-bound)
    "tracked_id": 7,               # DeepSORT tracking id, int
    "timestamp": "2026-08-19T21:45:03.120Z",
    "frame": <the raw frame/image data at the moment of firing>
}
```

Agent B's code takes this dict, and is responsible for everything downstream:
1. Save `frame` as a snapshot `.jpg`, generate a `snapshot_url`
2. Insert a row into SQLite, generate the `id`
3. Call GPT-4o with the snapshot + this metadata → get `narration` string
4. Assemble the full alert message exactly per `CONTRACT.md` section 3 (adding `id`, `snapshot_url`, `narration`, `confirmed: true`)
5. Push it over the WebSocket

**Agent A never touches `id`, `snapshot_url`, `narration`, or `confirmed` — those fields don't exist yet at the point Agent A's code runs.** Agent A never calls SQLite or OpenAI directly. Agent B never re-implements or second-guesses zone/timer/pose logic — it trusts that if it received an `Alert` dict, the detection is already confirmed.

**How they actually connect in code:** the detection loop (Agent A) pushes finished `Alert` dicts into a shared in-memory queue (per `ARCHITECTURE.md` section 2) — Agent B's WebSocket/broadcast code reads from that same queue. The queue itself is a small piece of shared plumbing in `main.py` (Agent B's file) that Agent A's loop imports and pushes into. This is the one point of contact between the two agents' code — keep it to just that.

---

## 4. Ground Rules for Both Sessions

- Both agents still follow every rule in `BACKEND.md` (stack, `main` branch discipline, phase awareness, don't touch `/frontend`)
- If Agent A needs something from Agent B's layer (e.g. "I need the current zone list to check against"), it should be exposed as a simple function/import from Agent B's zone-loading code — not duplicated. Flag this dependency explicitly rather than guessing.
- If either agent thinks the `Alert` handoff shape (section 3) needs a new field, stop and flag it — update this file first, by agreement, same as `CONTRACT.md`'s rule.
- Work on the same `feature/*` branch per the current phase (e.g. both agents' work for Phase 1 lands on `feature/after-hours` off `backend-dev`) — they're building one feature together, just different files within it.
