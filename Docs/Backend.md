# BACKEND.md
### Scope brief — paste this at the start of every backend coding agent session

---

## 🔵 CURRENT PHASE: Phase 0 — Contract + Skeleton
*(Update this line yourself as you progress. This is the first thing a fresh agent session should read.)*

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
