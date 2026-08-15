# AI-Powered Campus Safety Intelligence System
### CONTRACT.md — Frontend ↔ Backend Data Shapes

---

## Why this file exists

This is the shared agreement between backend and frontend so both sides can be built **independently, in parallel, without guessing.** The backend must always send data in exactly these shapes. The frontend must always expect data in exactly these shapes — including when using fake/mocked data during early development.

**Rule: if you need to change a shape here, both people agree first, then this file gets updated. Never change a shape silently on just one side.**

---

## 1. WebSocket Connection

**Endpoint:** `ws://localhost:8000/ws/stream`

One connection, carrying two kinds of messages distinguished by a `type` field: `"frame"` and `"alert"`. The frontend checks `message.type` to know which one it received.

---

## 2. Frame Message (backend → frontend)

Sent continuously, roughly one per processed video frame.

```json
{
  "type": "frame",
  "timestamp": "2026-08-19T21:45:03.120Z",
  "image_base64": "<base64-encoded JPEG string>",
  "detections": [
    {
      "tracked_id": 7,
      "box": { "x": 120, "y": 80, "width": 60, "height": 140 }
    }
  ]
}
```

| Field | Type | Notes |
|---|---|---|
| `timestamp` | ISO 8601 string | When this frame was captured |
| `image_base64` | string | JPEG image, base64-encoded, no `data:image/jpeg;base64,` prefix — frontend adds that when rendering |
| `detections` | array | Optional — current tracked people in this frame, for drawing boxes client-side if desired. Can be empty array. |

---

## 3. Alert Message (backend → frontend)

Sent only when a rule fires and is confirmed.

```json
{
  "type": "alert",
  "id": "a1b2c3",
  "alert_type": "after_hours",
  "zone_id": "hostel_gate",
  "tracked_id": 7,
  "timestamp": "2026-08-19T21:45:03.120Z",
  "snapshot_url": "/snapshots/a1b2c3.jpg",
  "narration": "A person has been detected near the hostel gate after permitted hours.",
  "confirmed": true
}
```

| Field | Type | Notes |
|---|---|---|
| `id` | string | Unique alert id, also the SQLite row id |
| `alert_type` | string | One of: `"after_hours"`, `"loitering"`, `"fall"` |
| `zone_id` | string | Which saved zone this relates to (`null` for `"fall"`, which isn't zone-bound) |
| `tracked_id` | number | The DeepSORT tracking id of the person involved |
| `snapshot_url` | string | Relative path to the evidence image, served by the backend |
| `narration` | string | The GPT-4o generated plain-English sentence |
| `confirmed` | boolean | Always `true` when sent — unconfirmed/in-progress detections are never sent to the frontend, only final fired alerts |

**Frontend note:** `alert_type` is what drives the badge/color/icon (e.g. `fall` gets red/urgent styling, per `IMPLEMENTATION_PLAN.md` Phase 3).

---

## 4. REST — Zones

### `GET /api/zones`
Returns all saved zones.

```json
[
  {
    "zone_id": "hostel_gate",
    "name": "Hostel Gate",
    "polygon": [[100, 80], [300, 80], [300, 400], [100, 400]],
    "rules": ["after_hours", "loitering"]
  }
]
```

### `POST /api/zones`
Saves a new zone drawn via the ZoneEditor.

**Request body:**
```json
{
  "name": "Hostel Gate",
  "polygon": [[100, 80], [300, 80], [300, 400], [100, 400]],
  "rules": ["after_hours", "loitering"]
}
```

| Field | Type | Notes |
|---|---|---|
| `polygon` | array of `[x, y]` pairs | Pixel coordinates on the reference frame the zone was drawn on |
| `rules` | array of strings | Which rule types apply to this zone. `"fall"` is never included here — fall detection applies everywhere, not per-zone |

**Response:** the saved zone object, same shape as the GET list item, with a generated `zone_id`.

---

## 5. REST — Alert History

### `GET /api/alerts`
Returns past alerts for the Incident History view. Same shape as a single Alert Message (section 3), as a list, newest first.

```json
[
  {
    "id": "a1b2c3",
    "alert_type": "loitering",
    "zone_id": "hostel_gate",
    "tracked_id": 7,
    "timestamp": "2026-08-19T21:44:10.000Z",
    "snapshot_url": "/snapshots/a1b2c3.jpg",
    "narration": "...",
    "confirmed": true
  }
]
```

Optional query params (nice-to-have, not required for MVP): `?alert_type=loitering`, `?zone_id=hostel_gate`.

---

## 6. Status / Connection Messages (WebSocket)

Small but agreed-upon now so the frontend can show connection state cleanly at the booth.

```json
{ "type": "status", "state": "connected" }
```
```json
{ "type": "status", "state": "camera_disconnected" }
```

| `state` value | Meaning |
|---|---|
| `connected` | Backend pipeline is running normally |
| `camera_disconnected` | DroidCam feed lost — frontend should show a clear warning, not just freeze |

---

## 7. Field Naming Rules (so nobody guesses differently later)

- All timestamps: ISO 8601 strings, UTC-agnostic (whatever `datetime.now().isoformat()` gives in Python — frontend formats for display)
- All ids: strings, not numbers (except `tracked_id`, which is a plain integer from DeepSORT)
- All field names: `snake_case`, matching Python/JSON convention — frontend converts to camelCase internally in JS if desired, but the wire format is always `snake_case`
- `alert_type` values are fixed strings: `"after_hours"`, `"loitering"`, `"fall"` — no new values added without updating this file first

---

## 8. Mock Data for Early Frontend Development

Until the real backend is ready, the frontend can run against a tiny mock WebSocket server or a hardcoded array sending messages on a timer — **as long as every mocked message matches the shapes above exactly.** This is what makes swapping from mock to real backend a non-event later.
