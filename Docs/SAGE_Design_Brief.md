# SAGE — UI Design Brief
### For execution in Claude Design

---

## 0. Brief for the Designer

SAGE is a live campus safety monitoring console — it takes ordinary CCTV footage and adds an AI layer that flags loitering, restricted after-hours presence, and falls/distress, surfacing alerts to a human operator in real time. The audience is **college administrations, hostel wardens, and campus security staff** — people evaluating whether this is credible, deployable software, not a hobby project or a hackathon toy.

**The problem with the current build:** it reads as a generic dark-mode dashboard — flat uniform panels, one accent color used decoratively everywhere instead of meaningfully, default icon-library choices, boilerplate-feeling empty states. Nothing is wrong exactly, but nothing is *distinctive* either — it could be any dashboard for any product.

**The fix is not "add more dark-mode flourishes."** The subject matter — live tracking, zones, real-time alerts — has its own real-world visual vernacular: operations-room monitoring software, radar/telemetry readouts, targeting overlays on tracked subjects. We want to borrow *that* vernacular, deliberately, but executed clean and restrained — closer to professional enterprise security software (airport ops centers, datacenter monitoring tools) than a tactical/military HUD or a video game. Confidence and precision, not aggression.

**Do not change the core color palette** — black/charcoal base, amber accent, red reserved for critical alerts is correct for this subject (it has real lineage — radar scopes, warning systems — and matches a security product's need to feel serious, not playful). What needs to change is *discipline in how that palette is applied*, plus real typographic and structural identity, so the whole thing stops reading as templated.

---

## 1. Design Plan — Token System

### Color (kept, but disciplined — described as roles, not just hex swatches)

| Role | Value (approx.) | Where it's allowed to appear |
|---|---|---|
| Base background | Near-black, `#0a0a0c` | The canvas everything sits on |
| Panel surface | Slightly raised charcoal, `#151517` | Cards, panels — but not all at identical elevation, see Layout |
| Recessed surface | Slightly darker than panel, `#0e0e10` | Inputs, the video canvas itself, "wells" that content sits inside |
| Primary text | `#e8e8e6` (warm off-white, not pure white) | Headlines, primary readouts |
| Secondary text | `#7a7a7d` | Labels, metadata, timestamps in their non-live state |
| Hairline borders | `#232326` | Structural dividers only — thin, never decorative |
| **Amber (signal accent)** | `#f5a623` | **Reserved exclusively for: live/active states, the after-hours + loitering alert family, and data actively being read right now (live coordinates, active timer).** Never used for static UI chrome, buttons-by-default, or decoration. |
| **Red (critical accent)** | `#e0393e` | **Reserved exclusively for fall/distress alerts and hard failure states (camera lost, connection error).** The rarest color in the system — its rarity is what makes it read as urgent. |
| Confirmation green | `#3ecf8e` | Used sparingly — "secure," "saved," "confirmed" states only |

**The actual fix here isn't new colors — it's a rule:** amber and red must mean something (live, active, alert) every single time they appear. If a color's use can't be justified by "this is currently true and worth noticing," it doesn't get that color. Everything else stays in the neutral charcoal/gray family.

### Typography (two roles, deliberately paired)

- **Display/structural face:** a tight, technical geometric sans for headings, nav, section titles — something with slightly condensed, engineered character (e.g. in the family of Neue Montreal, General Sans, or system equivalents like a condensed Inter variant) — gives SAGE its own "brand voice" rather than defaulting to whatever the base UI font is.
- **Body/UI face:** a clean, highly legible sans for body copy, descriptions, form labels — can be the same family as display at a lighter weight, or a quieter complementary sans. Should almost disappear — its job is clarity, not personality.
- **Data/telemetry face:** monospace, but used **only** for live or precise data — timestamps, coordinates, tracked IDs, durations, zone counts. This is the key structural rule: **monospace = "this is a live machine reading," proportional sans = "this is UI chrome."** Right now everything blurs together; this single rule alone will make the interface feel more intentional.

### Layout Concept

```
┌────────────────────────────────────────────────────────────────┐
│ SAGE  v1.0                    [live status]  [time]  [source]   │  ← thin header,
│ tight display face, small     quiet, mono data                  │    quiet by default
├─────────────────────────────────────────┬────────────────────────┤
│                                            │ LIVE ALERTS   0 ACTIVE│
│                                            │                        │
│   ⌐ PRIMARY SENSOR ⌐    recessed well,    │  (alert cards —        │
│   video feed sits IN the well,            │   see section 3)       │
│   not floating on a flat panel            │                        │
│                                            │  Empty state: designed,│
│   tracked people get corner-bracket       │  not boilerplate       │
│   targeting overlays (see section 4)      │  (see section 5)       │
│                                            │                        │
├─────────────────────────────────────────┴────────────────────────┤
│  LIVE MONITOR   ZONE CALIBRATION   INCIDENT HISTORY               │  ← quiet tab bar
└────────────────────────────────────────────────────────────────┘
```

Key change from current build: the video panel should sit in a visibly **recessed well** (subtle inner shadow / darker surface than surrounding chrome), not a flat bordered box identical to every other panel. This alone creates real depth hierarchy — video is clearly the "instrument," everything around it is clearly "console."

### Signature Element

**The tracking overlay on the live video feed.** Instead of plain rectangular bounding boxes, tracked people get **corner-bracket reticles** (four short corner marks forming an implied box, not a solid rectangle — the classic "targeting" visual language, but minimal and clean, not aggressive) with a small monospace telemetry readout beside each one — `ID·07` and nothing else by default, expanding to show zone/duration only when relevant. This is the one place the "operations console" identity gets to be bold; everything else in the UI stays quiet and disciplined around it, per the restraint principle.

---

## 2. Header

- "SAGE" in the display face, tight tracking, small — paired with "v1.0" as a quiet outlined tag, not a badge screaming for attention
- Tagline ("Smart AI-based Guardian for Emergencies") in secondary gray, small, beneath — present but not competing with the wordmark
- Status readouts (connection state, time, camera source) live on the right in the mono/data face — quiet, technical, correctly using amber *only* while actually connecting/live, settling to neutral gray once stable (right now "CONNECTING" sits in amber even at rest-adjacent moments — reserve the color for the actual transient state)
- Remove or de-emphasize "EDGE WS STREAM" as a loud bordered pill — this is implementation detail, not something an operator needs shouting at them; fold it into a smaller status readout instead

## 3. Live Alerts Panel

- Alert cards should visually differ by *family*, not just icon color: after-hours and loitering (amber family, calm-but-alert) vs. fall (red family, urgent) — per `UI_DESIGN.md` section 3/5, now reinforced by the stricter "color must be justified" rule above
- Each card: icon, one-line narration (largest/clearest text in the card — this is what a human actually reads first), then a quieter metadata row in the mono/data face (zone · tracked ID · timestamp)
- New alerts should feel like they *arrive*, not just appear — a brief, restrained motion (short slide + fade, under 300ms) is enough; avoid anything flashier, per the skill's warning that excess motion itself reads as AI-generated

## 4. Live Video Panel (signature element, detailed)

- Video sits in a recessed well, subtle vignette at the edges (draws the eye inward, feels like a real sensor feed rather than a pasted image)
- "LIVE" indicator: small pulsing dot (slow, restrained pulse — not a flashing alarm) plus the label, top-left, minimal chrome
- Tracked people: corner-bracket reticles (signature element, described above) — default state in a quiet neutral/white-gray, switching to amber or red *only* when that specific person is the subject of a currently-active alert, so the visual connection between "this person" and "that alert card" is immediate and readable
- Timestamp overlay in the mono/data face, small, corner-anchored — a real telemetry detail, not decoration

## 5. Empty & Connecting States (currently boilerplate — needs real design attention)

- "Connecting to Video Stream" — treat as a designed moment: a subtle animated scan-line sweep or pulse within the recessed well while connecting, replacing the plain crossed-out wifi icon, which currently reads as a generic system icon rather than something considered
- "Area Secure // No Violations" — good instinct already (calm, confident copy). Keep the shield-check but consider a quieter custom mark instead of a default icon-library glyph, and ensure the green only appears here, reinforcing the "green = confirmed-safe" rule from the palette
- "No calibrated zones yet" — rewrite as a direct instruction rather than a passive statement, e.g. treating the empty state as an invitation to act (per the skill's writing guidance): tell the operator exactly what to do next in the interface's own voice, not a generic placeholder tone

## 6. Zone Calibration Screen

- "Capture Current Frame" and "Save Zone Polygon" as the two key actions — keep them visually distinct in weight (capture = secondary/outline, save = primary/filled) so the flow's sequence is legible at a glance
- Plotted polygon points and lines: render in amber (live editing = active/amber, correctly applying the color rule) with small mono coordinate readouts near each vertex as they're placed — reinforces the telemetry identity even in the setup tool, not just the live view
- "Active Detection Rules" checkboxes: keep the card-style selection (good instinct in the current build), but tighten so the selected state uses amber border + subtle amber-tinted fill rather than a generic checkbox — make selection feel like arming a sensor rule, not filling out a form

## 7. Restraint Check (per the design skill's self-critique step)

Before executing: the signature (tracking reticles + telemetry readouts) is the one bold move. Everything else — header, panels, tabs, forms — should stay quiet, disciplined, and consistent so the signature has room to land. If a screen doesn't have a tracked person or an active alert on it, it should feel calm, almost administrative — the drama is reserved for the moments that deserve it (a live tracked subject, a fired alert), not spread evenly across every pixel.
