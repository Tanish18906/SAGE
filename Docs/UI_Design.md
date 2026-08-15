# AI-Powered Campus Safety Intelligence System
### UI_DESIGN.md — Visual & Layout Direction

This document gives the frontend concrete design direction so the dashboard looks like a deliberate product, not a generic dark-mode admin template. Read alongside `FRONTEND.md` for scope/build rules.

---

## 1. Design Principle

At a booth, judges glance for seconds, not minutes. The screen must communicate **"this is a live, watching, working system"** instantly — and when an alert fires, it must be unmistakable without anyone needing to explain what they're looking at.

Two things dominate the screen: the **live video feed** and the **alert feed**. Everything else (zone tool, incident history) is secondary and can live behind a tab or a smaller panel.

---

## 2. Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│  Top bar: system name, live "connected" status indicator      │
├───────────────────────────────────────┬───────────────────────┤
│                                          │                       │
│                                          │   ALERT FEED          │
│                                          │   (scrollable,        │
│         LIVE VIDEO FEED                 │    newest on top)     │
│         (large, center, dominant)       │                       │
│                                          │   [Alert card]        │
│                                          │   [Alert card]        │
│                                          │   [Alert card]        │
│                                          │                       │
├───────────────────────────────────────┴───────────────────────┤
│  Bottom bar / tab: Zone Editor  |  Incident History             │
└─────────────────────────────────────────────────────────────┘
```

- **Video feed**: large, center-left, roughly 65-70% of screen width. This is the visual anchor — it should feel like a real monitoring console, not a small embedded player.
- **Alert feed**: right-side panel, roughly 30-35% width, vertically scrollable, newest alert always at top. New alerts animate in (slide/fade), not just appear instantly — a small motion cue draws the eye at the exact moment it matters.
- **Zone Editor** and **Incident History**: not shown by default — accessed via a simple tab or button at the bottom, since they're setup/review tools, not the live "wow" moment. Zone Editor is used once at venue setup; Incident History gets glanced at during Q&A, not during the live demo itself.

---

## 3. Color Palette

**Minimal, dark, restrained — color is reserved almost entirely for alerts.**

| Purpose | Direction |
|---|---|
| Background | Pure black / very dark charcoal (near-`#0a0a0a` to `#121212`) |
| Panels/cards | Slightly lighter charcoal than background (near-`#1a1a1a` to `#1e1e1e`), subtle elevation via a faint border or shadow, not bright fills |
| Primary text | Off-white / light gray (near-`#e5e5e5`), never pure white-on-black (too harsh under booth lighting) |
| Secondary text (timestamps, labels) | Muted gray (near-`#888`) |
| Borders/dividers | Very subtle, near-`#2a2a2a` — structure without visual noise |
| **Alert — after_hours** | Amber/orange accent (near-`#f59e0b`) — "caution," not emergency |
| **Alert — loitering** | Same amber/orange family, slightly distinct shade or icon — "caution" tier |
| **Alert — fall (urgent)** | **Red** (near-`#ef4444` to `#dc2626`), the only alert type that gets a pulsing/glowing treatment — this is the highest-stakes alert and must read as urgent instantly |
| Connected/status indicator | Small green dot when live, red/gray when disconnected |

The rule: **nothing on screen is colorful by default.** Color only appears when something worth noticing has happened — this makes color itself meaningful instead of decorative, and makes a fired alert visually impossible to miss.

---

## 4. Typography

- Sans-serif, clean, monitoring-console feel — a system font stack (e.g. Inter, or the OS default sans) is completely fine, no need to source a custom font under time pressure
- Timestamps and IDs can use a monospace font for a "technical readout" feel (e.g. `tracked_id: 7`, `21:45:03`) — this small detail reinforces the "real system" impression
- Alert narration text (the GPT-4o sentence) should be the most readable, largest text within an alert card — it's the thing a human actually needs to read fastest

---

## 5. Alert Card Anatomy

Each alert in the feed should show, top to bottom:
1. **Icon + type badge** (color-coded per section 3) — e.g. an amber clock icon for loitering, a red falling-figure icon for fall
2. **Snapshot thumbnail** — small evidence image, not full-size (keeps the feed scannable)
3. **Narration sentence** (GPT-4o output) — the main readable content
4. **Metadata row** — zone name, timestamp, tracked ID — smaller, muted text

Fall alerts additionally get: a red left-border or full-card glow, and ideally a brief pulse animation on arrival (subtle, not flashing/seizure-risk — a slow 1-2 second fade-pulse is enough).

---

## 6. Live Video Feed Treatment

- Bounding boxes drawn on tracked people: thin, minimal-color outline (white or light gray for normal tracking) — switching to the alert's color (amber/red) briefly around a person when they trigger a specific alert, so judges can visually connect "that person, that box" to "that alert card" without explanation
- A small "LIVE" indicator with the green connected-dot, top-left or top-right of the video panel
- No heavy UI chrome around the video itself — let it feel like a monitoring feed, not a boxed-in video player widget

---

## 7. What to Avoid

- No bright gradients, no glassmorphism-heavy effects, no default Bootstrap/Material look — these read as generic template, undermining the "real product" impression
- No color used decoratively (e.g. a blue sidebar just because) — every non-neutral color on screen should mean something specific
- No dense data tables as the primary view — the Incident History tab can have a simple list/table, but it's secondary, not what greets a judge first
