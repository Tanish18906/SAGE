# MASTER_PROMPT.md
### Paste this as the very first message in a brand new coding agent session

---

## STOP — Read this entire file before doing anything. Do not install, create, or run anything yet.

---

## Step 1: Determine your role

Ask the human right now, before doing anything else, if it isn't already stated in the same message this file was pasted with:

> **"Are you working as the BACKEND person or the FRONTEND person on this project?"**

Do not proceed past this question until you have a clear answer. Everything below forks based on the answer.

---

## Step 2: Read the relevant docs, in this exact order

**If BACKEND:**
1. `PROJECT_OVERVIEW.md` — what the project is, briefly
2. `TECH_STACK.md` — section 1 (Backend) and section 4 (repo structure)
3. `ARCHITECTURE.md` — how the backend actually runs
4. `BACKEND.md` — your scope boundary and ground rules
5. `BACKEND_SPLIT.md` — if two backend agents are being used, find out from the human which one you are (Agent A / "the Brain" doing detection+rules, or Agent B / "the Nervous System" doing server+db+narration) and read your specific ownership section
6. `CONTRACT.md` — the exact data shapes you must produce
7. `IMPLEMENTATION_PLAN.md` — the current phase and step you're on (check the 🔵 marker in `BACKEND.md` for which phase; the plan itself has the step-by-step detail)

**If FRONTEND:**
1. `PROJECT_OVERVIEW.md` — what the project is, briefly
2. `TECH_STACK.md` — section 2 (Frontend) and section 4 (repo structure)
3. `UI_DESIGN.md` — visual and layout direction
4. `FRONTEND.md` — your scope boundary and ground rules
5. `CONTRACT.md` — the exact data shapes you'll receive and must handle
6. `IMPLEMENTATION_PLAN.md` — the current phase and step you're on (check the 🔵 marker in `FRONTEND.md`)

Do not skip any of these. Do not proceed to Step 3 until all relevant docs are read.

---

## Step 3: Install requirements — ONLY for your role

**Do not install anything for the other role.** Backend does not touch `/frontend` or install Node/npm packages. Frontend does not touch `/backend` or install Python/pip packages. If you're unsure whether something is needed for your role, ask before installing it.

**If BACKEND:**
- Set up a Python virtual environment (confirm Python version matches `TECH_STACK.md` section 1 first)
- Install the packages needed for the backend stack as listed in `TECH_STACK.md` section 1 and section 5 (FastAPI, Uvicorn, Ultralytics/YOLOv8, `deep-sort-realtime`, MediaPipe, OpenCV, OpenAI SDK, python-dotenv, etc.)
- Confirm DroidCam is set up and the virtual camera is visible to OpenCV on this machine (ask the human to confirm DroidCam Client is running if you can't detect it)
- Create a `.env` file (gitignored) for the `OPENAI_API_KEY` — ask the human for it, never hardcode it in source files
- Verify installation by running a minimal smoke test (e.g. import each library successfully, confirm GPU/CUDA is detected if on the RTX 3050 machine)
- **Report back exactly what was installed and the smoke test result. Do not proceed to actual coding yet.**

**If FRONTEND:**
- Set up the Vite + React project per `TECH_STACK.md` section 2 and section 4's folder structure
- Install the packages needed (`react`, `vite`, `tailwindcss`, `lucide-react`, and `recharts` only if/when actually needed per the plan)
- Verify installation by running `npm run dev` and confirming the dev server starts
- **Report back exactly what was installed and confirm the dev server runs. Do not proceed to actual coding yet.**

---

## Step 4: Confirm the current phase and step, then wait

After installation is confirmed working, state clearly:
- Which Phase and Step (per `IMPLEMENTATION_PLAN.md`) you are about to start
- What that specific step asks for — nothing more

Then **stop and wait for the human to say go.** Do not begin coding the step until told to proceed.

---

## Step 5: Follow the step-by-step discipline for the rest of the session

Once approved to proceed, follow `IMPLEMENTATION_PLAN.md` section 0.1 for the remainder of this session and every session after:
- One step at a time
- Stop after each step, show the actual result, wait for approval before the next step
- Never add anything not asked for in the current step
- Ask rather than assume when a step is ambiguous
- Never touch files outside your owned scope

**Use connected MCPs when they'd genuinely help.** If Sequential Thinking is available, use it for any step that involves real design/debugging judgment (e.g. tuning the fall heuristic, structuring the rule engine) rather than jumping straight to code. If Context7 is available, use it to pull current, accurate docs for a library (YOLOv8, DeepSORT, MediaPipe, FastAPI, etc.) instead of relying on possibly-outdated training knowledge. Don't force either tool where it doesn't add value — a trivial step doesn't need Sequential Thinking, and a library you already know well doesn't need a Context7 lookup.

---

## Step 6: Git commits and pushes — STRICT RULE

**Commit and push to GitHub ONLY when the human explicitly approves that a full Phase's gate has been passed** (per the gate checklist in `IMPLEMENTATION_PLAN.md` section 7) — not after every individual step, and never on your own judgment.

Concretely:
- After finishing a step, do NOT commit. Just stop and wait, per Step 5 above.
- Only when the human says something equivalent to **"Phase [N] gate passed, commit and push"** should you run `git add`, `git commit` (with a clear message describing the completed phase), and `git push` to the correct branch (`feature/*` → `backend-dev`/`frontend-dev`, per `IMPLEMENTATION_PLAN.md` section 1 branching strategy).
- If you are ever unsure whether the human has actually approved a full phase (versus just one step within it), **ask before committing.** Committing broken or partial work to a shared branch is a bigger problem than asking one extra clarifying question.
- Never force-push, never push directly to `main` — only to your `feature/*` or `-dev` branch. Merges to `main` happen only when both backend and frontend sides of a phase are done together, per `IMPLEMENTATION_PLAN.md`.

---

## Summary — the whole point of this file

1. Figure out who you're talking to (backend or frontend)
2. Read only the docs relevant to that role
3. Install only what that role needs, and prove it works
4. State the current step, then stop and wait
5. Build one step at a time, always stopping for approval
6. Commit and push only on an explicit phase-level "gate passed" approval — never automatically, never mid-phase
