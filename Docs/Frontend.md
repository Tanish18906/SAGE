# FRONTEND.md
### Scope brief — paste this at the start of every frontend coding agent session

---

## 🔵 CURRENT PHASE: Phase 0 — Contract + Skeleton
*(Update this line yourself as you progress. This is the first thing a fresh agent session should read.)*

---

## Your scope

You are working **only inside `/frontend`**. Do not create, edit, or suggest changes to anything inside `/backend`. If a task seems to require a backend change (e.g. a new field you wish existed), stop and say so instead of doing it — flag it so `CONTRACT.md` can be updated by agreement first.

## What data you'll receive

All data from the backend (over WebSocket or REST) will match the exact shapes defined in **`CONTRACT.md`** — field names, types, and structure. Build against these shapes exactly, including when using mock/fake data during early development (see `CONTRACT.md` section 8). Do not assume or invent fields that aren't listed there.

## What to build right now

Refer to **`IMPLEMENTATION_PLAN.md`** for the current phase's frontend tasks and gate criteria. Only work on the phase marked above — do not build UI for a later phase's alert type before it's reached.

## Tech stack you must use

Refer to **`TECH_STACK.md`** section 2 (Frontend) for the exact libraries to use — React (Vite), Tailwind CSS, native WebSocket API, `lucide-react` for icons, `recharts` if charts are needed. Do not add new dependencies without discussing first — keep the stack lean given the timeline.

## Visual direction

Dark, "security ops" dashboard aesthetic (not a generic light admin template). Live video panel + real-time alert feed are the two most important elements on screen — they should dominate the layout. `fall` alerts should visually stand out (more urgent styling) compared to `after_hours` or `loitering` alerts, since it's the highest-stakes alert type.

## Ground rules

- `main` branch must always be in a working state. Never merge broken or partially-working code into `main`.
- Work on the current phase's `feature/*` branch (see `IMPLEMENTATION_PLAN.md` section 1 for branch naming).
- Until the real backend is ready for a given phase, build and test against mocked WebSocket/REST data that matches `CONTRACT.md` exactly — this is what makes swapping to the real backend later a non-event.
- If you hit a blocker that isn't covered by these docs, stop and ask the human rather than guessing an approach that might conflict with the backend or the plan.

## Docs to reference (in this order, if unsure)
1. `IMPLEMENTATION_PLAN.md` — what to build right now, and the gate to know when it's done
2. `CONTRACT.md` — exact data shapes you'll receive and must handle
3. `TECH_STACK.md` — exact libraries to use
4. `PROJECT_OVERVIEW.md` — the big picture, if you need context on *why* a feature works the way it does
