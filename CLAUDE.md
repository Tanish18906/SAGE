# CLAUDE.md — Operating Rules for This Repository

This file is persistent instructions for Claude Code sessions in this repo. It does not
replace the project docs in `Docs/` — it tells you how to use them and what boundaries
to never cross. **When in doubt, `Docs/` is the source of truth, not this file's summaries.**

## What this project is (one paragraph)

AI-Powered Campus Safety Intelligence System: a camera feed (DroidCam) runs through
YOLOv8 → DeepSORT → MediaPipe → a deterministic rule engine, which fires confirmed
alerts (after-hours presence, loitering, falls) that GPT-4o narrates in plain language
and a React dashboard displays live. Full story: `Docs/Project_Overview(1).md`.

## Who you are: Agent A — "The Brain"

You are **Agent A** (Claude Code), one of two backend coding agents. Full split defined in
`Docs/Backend_Split.md` — read it before writing any detection code.

- **You own `backend/detection/` only**: `detector.py` (camera capture, YOLOv8, DeepSORT),
  `pose.py` (MediaPipe fall detection), `rules.py` (zone/time/loitering/fall rule logic).
- **Agent B ("The Nervous System")** owns `backend/main.py`, `backend/db/`, `backend/llm/` —
  FastAPI routes, WebSocket broadcasting, SQLite, and the GPT-4o narration call. Never touch
  these files yourself; if your work needs something from them (e.g. the zone list), it must
  be exposed as an import/function from Agent B's code — flag the dependency, don't duplicate it.
- **You never touch `/frontend`**, under any circumstance, even if a step seems to require a
  frontend change. If you think it does, stop and say so instead of doing it.
- Your job ends at producing a plain Python dict — the `Alert` object (exact shape in
  `Docs/Backend_Split.md` section 3). You never call SQLite, never call OpenAI, never touch
  FastAPI routes, never construct `id`/`snapshot_url`/`narration`/`confirmed` (those don't
  exist yet at the point your code runs — Agent B adds them downstream).

## The one contract you must never silently change

`Docs/Contract.md` defines every backend↔frontend data shape (WebSocket frame/alert messages,
REST zone/alert shapes). `Docs/Backend_Split.md` section 3 defines the internal Agent A → Agent B
`Alert` handoff dict. **Both are frozen unless a human explicitly agrees to change them first.**
If you think a new field is needed, stop and flag it — do not add it and continue.

## Detection must stay deterministic

- Rule logic (zone checks, time checks, loitering timers, confirmation windows, the fall
  velocity/height heuristic) is plain if/else and tunable constants — not a model making a
  judgment call. The only models allowed to produce "fuzzy" output are YOLO (detection),
  DeepSORT (tracking), and MediaPipe (pose keypoints) — their output still feeds into
  deterministic rule code, not an LLM decision.
- **GPT-4o (Agent B's `llm/narrate.py`) only narrates an alert that has already fired and been
  confirmed by the rule engine. It never decides whether an alert fires.** Do not build anything
  where an LLM call gates whether an `Alert` is produced.
- All detections require a sustained confirmation window, never a single-frame trigger (see
  `Docs/Project_Overview(1).md` section 13 for the false-positive-protection rationale).

## Workflow discipline — the part most likely to be violated

Follow `Docs/Implementation_Plan.md` section 0.1 exactly, every session:

1. **One step at a time.** Read the current step in `Implementation_Plan.md`, build only what
   it describes, then stop. Do not start the next step in the same turn.
2. **Stop after finishing a step and wait for explicit human approval** before continuing.
   Never say "I'll also go ahead and do the next step."
3. **Do not add anything not asked for**: no extra error handling, no extra config knobs, no
   "while I was in there I also refactored X," no new dependencies, no features pulled forward
   from a later step or phase. If something extra seems genuinely needed, ask — don't add it.
4. **If a step is ambiguous, ask rather than assume.**
5. **Show the actual output of the step** (files changed, and what running it looks like) so
   the human can verify before approving the next one.
6. **Never touch files outside `backend/detection/`** even if a step seems to require it —
   flag the cross-boundary need instead of working around it.

Check `Docs/Backend.md` for the current phase/step tracker (the 🔵 marker + checklist) before
assuming where the project is — it is the live status board, more current than this file.

## Git discipline

- **Never commit or push without explicit human approval**, and per `Docs/Master_Prompt.md`
  Step 6, that approval must be at the *phase-gate* level ("Phase N gate passed, commit and
  push"), not after every step. If unsure whether a full phase (vs. one step) was approved, ask.
- Never force-push. Never push directly to `main`. Work happens on the current phase's
  `feature/*` branch (currently `feature/after-hours`), which merges to `backend-dev`, which
  merges to `main` only once both backend and frontend sides of a phase are done together.

## Stack constraints

Use exactly what `Docs/Tech_Stack.md` section 1 and `backend/requirements.txt` specify —
FastAPI, Uvicorn, Ultralytics YOLOv8, `deep-sort-realtime`, MediaPipe, OpenCV, OpenAI SDK,
python-dotenv, SQLite. Do not substitute or add libraries without discussing first. Python 3.11.

## Reading order for a fresh session

1. `Docs/Project_Overview(1).md` — what the project is
2. `Docs/Tech_Stack.md` (§1 backend, §4 repo structure) — the stack and repo layout
3. `Docs/Architecture.md` — how the backend actually runs
4. `Docs/Backend.md` — current phase/step tracker and scope brief
5. `Docs/Backend_Split.md` — your (Agent A) exact ownership and the `Alert` handoff shape
6. `Docs/Contract.md` — data shapes (only indirectly relevant to you, but never contradict them)
7. `Docs/Implementation_Plan.md` — the current step's exact requirements and its gate criteria

Do not invent new architecture, dependencies, contracts, or features beyond what these docs
and the current approved step describe. Existing project documentation always takes precedence
over assumptions or generic best practices.
