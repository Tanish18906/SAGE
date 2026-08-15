# AI-Powered Campus Safety Intelligence System
### Complete Project Overview & Build Plan

---

## 1. Project Title
**AI-Powered Campus Safety Intelligence System**

## 2. Project Overview
The AI-Powered Campus Safety Intelligence System is an AI-assisted security solution that adds an intelligence layer to existing CCTV and video cameras. Instead of simply recording footage for security personnel to review later, the system analyzes video in real time to understand people, their movement, and selected behavioral patterns that may require attention.

The system is designed for campus and women's safety across locations such as hostels, isolated pathways, parking areas, gates, corridors, and other security zones. When a potentially suspicious incident is detected, the system generates an alert with relevant information and evidence for human review. **The AI provides early warning; security personnel make the final decision.**

## 3. Problem Statement
Conventional CCTV systems continuously record large amounts of video, but security personnel cannot realistically monitor every camera and every moment simultaneously. Important incidents may therefore be missed, noticed late, or require extensive manual review.

This creates a particular challenge in college campuses and women's safety environments, where incidents can occur in isolated areas, during late hours, or through behavioral patterns that may not immediately appear as obvious emergencies. A more intelligent monitoring approach is needed to help security teams identify potentially concerning situations earlier.

## 4. Proposed Solution
Our system converts passive CCTV/video footage into actionable safety intelligence. It analyzes people and their movement, identifies predefined suspicious or unusual behavioral patterns, and brings potentially relevant incidents to the attention of security personnel — without attempting to determine guilt or definitively decide whether someone is in danger. It acts as an **AI-assisted early-warning system** that helps humans focus their attention on potentially important incidents.

The system is a camera-agnostic software layer, capable of working with CCTV/IP cameras, webcams, smartphone cameras, or prerecorded video. For the Project Expo demonstration, a smartphone camera connected via **DroidCam** serves as the live video source, mounted on a tripod at the booth table.

---

## 5. Key Features / Use Cases

### 🟢 Live at Expo (fully implemented, demoed in person)
| Feature | Description |
|---|---|
| **Loitering Detection** | Flags a tracked person remaining inside a defined sensitive zone (e.g. isolated pathway, hostel gate) beyond a set duration threshold. |
| **Sudden / Distress-Like Movement (Fall Detection)** | Detects sudden falls via pose and bounding-box velocity analysis, confirmed by a sustained low-height check to avoid false triggers from bending/crouching. |
| **After-Hours Restricted Presence** | Flags a person present inside a restricted/isolated zone outside permitted hours, combining zone-check logic with time-of-day rules. |

### 🔵 Roadmap (designed & explainable in Q&A, not live-demoed)
| Feature | Description |
|---|---|
| **Potential Following** | Would use DeepSORT trajectory correlation across multiple tracked IDs to flag sustained, matching movement patterns between two people over time. Requires multi-person re-identification robustness beyond a 3-day build scope. |
| **Unusual Crowding / Isolation** | Would flag abnormal group density or solitary presence patterns. Requires multiple staged actors to demo reliably and was deprioritized for expo logistics. |

### Smart Alerts (cross-cutting, powers all features)
Brings potentially suspicious incidents to security personnel with relevant metadata, a snapshot/evidence frame, and a plain-language narration for fast human review.

---

## 6. System Architecture

```
Video Source (DroidCam live / pre-recorded fallback)
        ↓
YOLO — person detection
        ↓
DeepSORT — persistent tracking IDs across frames
        ↓
MediaPipe — body-pose analysis (fall detection only)
        ↓
Rule Engine — zone checks + time thresholds + confirmation windows
        ↓
Alert Event (fires only on confirmed, sustained pattern — not single-frame)
        ↓
OpenAI Vision API — narrates the confirmed alert only (e.g. "Person detected
        near isolated pathway gate for 47s after 9 PM — possible safety concern")
        ↓
Streamlit Dashboard — live feed + zone drawing tool + alert feed + evidence snapshots
```

**Design principle:** Detection is deterministic and rule-based first. The LLM (OpenAI Vision) is only invoked *after* an alert has already been confirmed by the rule engine — it narrates, it does not decide. This keeps the safety-critical path explainable and avoids relying on a live/open AI Q&A on stage, which would introduce unnecessary risk.

## 7. Technology Stack

| Technology | Role |
|---|---|
| YOLO | Person and object detection |
| DeepSORT | Tracking people across video frames with persistent IDs |
| MediaPipe | Body-pose and movement analysis for fall detection |
| OpenAI Vision-Capable Model | Narrates confirmed alerts in plain language |
| Python / OpenCV | Video processing and system integration |
| Streamlit | Live dashboard, zone-drawing tool, and alert visualization |
| DroidCam | Smartphone camera input for the live demonstration |

The project uses pre-trained AI models rather than training models from scratch.

## 8. Target Users / Application
- College administrations
- Hostel wardens
- Campus security personnel

Potential deployment areas include college campuses, hostels, parking areas, gates, corridors, isolated pathways, and other locations requiring additional security awareness.

## 9. Key Value / Innovation
Ordinary CCTV primarily records footage. Our system adds an AI intelligence layer that analyzes video, identifies potentially suspicious behavioral patterns, and brings relevant incidents to human attention — without replacing security personnel. The innovation is helping humans monitor large video environments more intelligently and respond to potentially important situations earlier.

## 10. One-Line Pitch
> An AI-assisted campus safety intelligence system that transforms ordinary CCTV footage into early-warning alerts for potentially suspicious behavior, helping security personnel identify and review important incidents faster.

---

## 11. Team & Roles
| Role | Responsibility |
|---|---|
| Lead Developer (strong vibe coder) | Core CV pipeline, rule engine, architecture |
| Support Developer (beginner vibe coder) | Dashboard, testing, zone tool, integration support |
| Presentation Lead (x2) | PPT design, storytelling, Q&A prep |

## 12. Hardware
| Machine | Spec | Role |
|---|---|---|
| Laptop A | i5 12th Gen, 8GB RAM | Light dev / secondary support |
| Laptop B | RTX 3050, GPU | **Primary build + live demo machine** |

## 13. Demo Format
**Both** — live acting in front of judges (via DroidCam) as the primary demo, with 2-3 pre-recorded backup videos of each scenario ready as an instant fallback if live conditions fail (lighting, crowd noise, camera issues at the booth).

**Venue setup:** Table + laptop + phone on tripod via DroidCam.

**Zone calibration at venue:** A dedicated Streamlit page captures one live frame at the booth, lets the team click to draw a zone polygon directly on that frame, and saves it — done in under 2 minutes on-site, no code editing required.

**False-positive protection:** All detections require a *sustained confirmation window*, not a single-frame trigger (e.g. loitering must hold continuously through the full threshold with tolerance for brief tracking flicker; falls require a spike *plus* a sustained low-height check afterward to rule out bending/crouching). Thresholds are exposed as tunable constants for quick on-site adjustment.

---

## 14. Timeline

| Days | Focus |
|---|---|
| **Day 1 — Aug 15** | Repo scaffold + README skeleton. YOLO person detection live on RTX 3050. DeepSORT integrated for persistent IDs. |
| **Day 2 — Aug 16** | Zone-drawing tool (JSON-based). Loitering logic. After-Hours logic. MediaPipe pose + fall detection heuristic. All 3 detections firing on test footage. |
| **Day 3 — Aug 17** | Streamlit dashboard (live feed + alert feed + evidence snapshots). OpenAI Vision narration wired to confirmed alerts. Record backup demo videos. Finalize README with architecture diagram. **Register with GitHub repo link (deadline).** |
| **Day 4-5 — Aug 18-19** | Buffer only — no new features. Bug fixes, full demo rehearsals (including live→backup switch), PPT + Q&A prep with full team. **Expo: Aug 19.** |

## 15. Open Items (to revisit during buffer days)
- Q&A / responsible-use talking points: data retention, false-alert handling, misuse-prevention framing (privacy safeguards for a CCTV-based safety system).
