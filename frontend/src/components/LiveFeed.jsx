import React, { useState, useEffect, useRef } from 'react'
import {
  Maximize2,
  Minimize2,
  Eye,
} from 'lucide-react'

// A currently-active alert (recent enough that the reticle should still flag it) —
// tracked ids get recycled by DeepSORT, so a stale historical alert must not relight one
const ACTIVE_ALERT_WINDOW_MS = 90_000

function elapsedShort(isoTimestamp) {
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(isoTimestamp).getTime()) / 1000))
  if (diffSec < 60) return `-${diffSec}s`
  return `-${Math.floor(diffSec / 60)}m`
}

function TrackReticle({ x, y, width, height, scale, boxBorder, boxBg, badgeBg, badgeText, label }) {
  const left = x * scale
  const top = y * scale
  const w = Math.max(width * scale, 16)
  const h = Math.max(height * scale, 16)

  return (
    <div
      className={`absolute pointer-events-none transition-all duration-75 border-2 rounded-xs ${boxBorder} ${boxBg}`}
      style={{ left, top, width: w, height: h }}
    >
      {/* Corner Bracket Accents */}
      <span className="absolute -top-1 -left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-current" />
      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-current" />
      <span className="absolute -bottom-1 -left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-current" />
      <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-current" />

      {/* Track ID & Status Badge */}
      {label && (
        <div
          className={`absolute -top-6 left-0 px-2 py-0.5 rounded-xs font-mono text-[11px] font-bold tracking-wide whitespace-nowrap shadow-lg flex items-center gap-1.5 ${badgeBg} ${badgeText}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />
          {label}
        </div>
      )}
    </div>
  )
}

export default function LiveFeed({
  wsUrl = 'ws://localhost:8000/ws/stream',
  onFrameUpdate = null,
  onAlertReceived = null,
  onConnectionChange = null,
  alerts = [],
  zones = [],
}) {
  const [currentFrame, setCurrentFrame] = useState(null)
  const [detections, setDetections] = useState([])
  const [frameSize, setFrameSize] = useState({ width: 1280, height: 720 })
  const [wellWidth, setWellWidth] = useState(0)
  const [connectionStatus, setConnectionStatus] = useState('connecting')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showOverlays, setShowOverlays] = useState(true)

  const housingRef = useRef(null)
  const wellRef = useRef(null)
  const onFrameUpdateRef = useRef(onFrameUpdate)
  const onAlertReceivedRef = useRef(onAlertReceived)
  const onConnectionChangeRef = useRef(onConnectionChange)

  useEffect(() => {
    onFrameUpdateRef.current = onFrameUpdate
  }, [onFrameUpdate])

  useEffect(() => {
    onAlertReceivedRef.current = onAlertReceived
  }, [onAlertReceived])

  useEffect(() => {
    onConnectionChangeRef.current = onConnectionChange
  }, [onConnectionChange])

  // Live WebSocket stream connection
  useEffect(() => {
    let isMounted = true
    let ws = null
    let reconnectTimer = null

    function updateStatus(status) {
      if (!isMounted) return
      setConnectionStatus(status)
      if (onConnectionChangeRef.current) {
        onConnectionChangeRef.current(status)
      }
    }

    function connect() {
      updateStatus('connecting')
      try {
        ws = new WebSocket(wsUrl)

        ws.onopen = () => {
          if (!isMounted) return
          updateStatus('connected')
        }

        ws.onmessage = (event) => {
          if (!isMounted) return
          try {
            const data = JSON.parse(event.data)
            if (data.type === 'frame') {
              setCurrentFrame(data.image_base64)
              if (Array.isArray(data.detections)) {
                setDetections(data.detections)
              }
              if (onFrameUpdateRef.current) onFrameUpdateRef.current(data)
            } else if (data.type === 'alert') {
              if (onAlertReceivedRef.current) onAlertReceivedRef.current(data)
            } else if (data.type === 'status' && data.state) {
              updateStatus(data.state)
            }
          } catch (err) {
            console.error('WebSocket parse error:', err)
          }
        }

        ws.onerror = () => {
          if (!isMounted) return
          updateStatus('disconnected')
        }

        ws.onclose = () => {
          if (!isMounted) return
          updateStatus('disconnected')
          reconnectTimer = setTimeout(connect, 3000)
        }
      } catch {
        if (!isMounted) return
        updateStatus('disconnected')
        reconnectTimer = setTimeout(connect, 3000)
      }
    }

    connect()

    return () => {
      isMounted = false
      if (ws) ws.close()
      if (reconnectTimer) clearTimeout(reconnectTimer)
    }
  }, [wsUrl])

  // Track the well's rendered width so source-pixel detection boxes scale onto it correctly
  useEffect(() => {
    const el = wellRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWellWidth(entry.contentRect.width)
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const toggleFullscreen = () => {
    if (!housingRef.current) return
    if (!document.fullscreenElement) {
      housingRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }

  const imageSrc = currentFrame
    ? currentFrame.startsWith('data:')
      ? currentFrame
      : `data:image/jpeg;base64,${currentFrame}`
    : null

  const handleImageLoad = (e) => {
    const { naturalWidth, naturalHeight } = e.target
    if (naturalWidth && naturalHeight) {
      setFrameSize((prev) =>
        prev.width === naturalWidth && prev.height === naturalHeight
          ? prev
          : { width: naturalWidth, height: naturalHeight }
      )
    }
  }

  const scale = wellWidth > 0 ? wellWidth / frameSize.width : 0

  // Only alerts recent enough to still be "currently happening" light up a reticle;
  // stale history (recycled tracked ids) must never relight in amber/red
  const now = Date.now()
  const activeAlertByTrackedId = new Map()
  for (const a of alerts) {
    if (a.tracked_id == null) continue
    if (now - new Date(a.timestamp).getTime() > ACTIVE_ALERT_WINDOW_MS) continue
    const existing = activeAlertByTrackedId.get(a.tracked_id)
    if (!existing || (a.alert_type === 'fall' && existing.alert_type !== 'fall')) {
      activeAlertByTrackedId.set(a.tracked_id, a)
    }
  }
  const hasActiveFall = [...activeAlertByTrackedId.values()].some((a) => a.alert_type === 'fall')

  return (
    <div className="w-full h-full flex flex-col justify-between">
      {/* Console Housing — the bezel around the instrument */}
      <div
        ref={housingRef}
        className="relative w-full flex-1 bg-panel-high border border-hairline rounded p-2.5 shadow-2xl flex items-center justify-center min-h-[380px] group"
      >
        {/* Recessed Well — aspect-locked to the source sensor resolution */}
        <div
          ref={wellRef}
          className="relative w-full max-h-full overflow-hidden rounded-sm bg-recessed"
          style={{
            aspectRatio: `${frameSize.width} / ${frameSize.height}`,
            boxShadow:
              'inset 0 2px 10px rgba(0,0,0,0.75), inset 0 0 0 1px rgba(0,0,0,0.5)',
          }}
        >
          {/* Render Live Camera Feed Image */}
          {imageSrc && connectionStatus !== 'camera_disconnected' ? (
            <img
              src={imageSrc}
              alt="Live Surveillance Video"
              onLoad={handleImageLoad}
              className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
            />
          ) : (
            <>
              {connectionStatus !== 'camera_disconnected' && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <div
                    className="absolute inset-x-0 h-20 [animation:sage-scan-sweep_3.2s_ease-in-out_infinite]"
                    style={{
                      background:
                        'linear-gradient(to bottom, transparent, rgba(245,166,35,0.10), transparent)',
                    }}
                  />
                </div>
              )}
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                {connectionStatus === 'camera_disconnected' ? (
                  <>
                    {/* Lost-signal frame — same corner-bracket vocabulary, but static and red:
                        a hard failure, not activity, so no sweep and no pulse */}
                    <div className="relative w-12 h-12 mb-3">
                      <span className="absolute left-0 top-0 w-3 h-3 border-t-2 border-l-2 border-red" />
                      <span className="absolute right-0 top-0 w-3 h-3 border-t-2 border-r-2 border-red" />
                      <span className="absolute left-0 bottom-0 w-3 h-3 border-b-2 border-l-2 border-red" />
                      <span className="absolute right-0 bottom-0 w-3 h-3 border-b-2 border-r-2 border-red" />
                    </div>
                    <p className="text-sm font-semibold text-red font-sans">Camera Feed Lost</p>
                    <p className="text-xs text-text-secondary mt-1 max-w-xs font-sans">
                      Check DroidCam phone connection or camera index in backend configuration.
                    </p>
                  </>
                ) : (
                  <>
                    {/* Acquiring-signal frame — same corner-bracket vocabulary as the tracking reticles */}
                    <div className="relative w-12 h-12 mb-3">
                      <span className="absolute left-0 top-0 w-3 h-3 border-t-2 border-l-2 border-text-tertiary" />
                      <span className="absolute right-0 top-0 w-3 h-3 border-t-2 border-r-2 border-text-tertiary" />
                      <span className="absolute left-0 bottom-0 w-3 h-3 border-b-2 border-l-2 border-text-tertiary" />
                      <span className="absolute right-0 bottom-0 w-3 h-3 border-b-2 border-r-2 border-text-tertiary" />
                    </div>
                    <p className="text-sm font-semibold text-text-primary font-sans">
                      Connecting to Video Stream
                    </p>
                    <p className="text-xs text-text-secondary mt-1 max-w-xs font-sans">
                      Connecting to <code className="font-mono text-text-secondary">{wsUrl}</code>
                    </p>
                  </>
                )}
              </div>
            </>
          )}

          {/* Calibrated Restricted Zone Polygons Overlay */}
          {showOverlays && scale > 0 && imageSrc && connectionStatus !== 'camera_disconnected' && zones && zones.length > 0 && (
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox={`0 0 ${frameSize.width} ${frameSize.height}`}
              preserveAspectRatio="none"
            >
              {zones.map((zone) => {
                if (!zone.polygon || zone.polygon.length < 3) return null
                const pointsStr = zone.polygon.map(([x, y]) => `${x},${y}`).join(' ')
                const firstPt = zone.polygon[0]
                const isLoitering = zone.rules?.includes('loitering')
                const strokeColor = isLoitering ? '#22c4e0' : '#f5a623'
                const fillColor = isLoitering ? 'rgba(34, 196, 224, 0.18)' : 'rgba(245, 166, 35, 0.18)'

                return (
                  <g key={zone.zone_id}>
                    {/* Shaded polygon zone */}
                    <polygon
                      points={pointsStr}
                      fill={fillColor}
                      stroke={strokeColor}
                      strokeWidth="2.5"
                      strokeDasharray="6,4"
                    />
                    {/* Vertex point markers */}
                    {zone.polygon.map(([px, py], i) => (
                      <circle key={i} cx={px} cy={py} r="4" fill={strokeColor} stroke="#0a0a0c" strokeWidth="1.5" />
                    ))}
                    {/* Zone Name Label */}
                    <text
                      x={firstPt[0] + 6}
                      y={Math.max(16, firstPt[1] - 8)}
                      fill={strokeColor}
                      fontSize="13"
                      fontWeight="bold"
                      fontFamily="'JetBrains Mono', monospace"
                      filter="drop-shadow(0px 1px 3px rgba(0,0,0,0.9))"
                    >
                      {zone.name || zone.zone_id}
                    </text>
                  </g>
                )
              })}
            </svg>
          )}

          {/* Tracking Bounding Boxes & Reticles */}
          {showOverlays && scale > 0 && imageSrc && connectionStatus !== 'camera_disconnected' && (
            <>
              {detections.map((d) => {
                if (!d.box) return null
                const activeAlert = activeAlertByTrackedId.get(d.tracked_id)
                const isInZone = Boolean(d.in_zone || activeAlert)

                let boxBorder = 'border-emerald-400'
                let boxBg = 'bg-emerald-500/15 shadow-[0_0_15px_rgba(16,185,129,0.35)]'
                let badgeBg = 'bg-emerald-500'
                let badgeText = 'text-black'
                let label = `PERSON ID·${String(d.tracked_id).padStart(2, '0')}`

                if (isInZone) {
                  // Inside Restricted Polygon Zone -> BRIGHT RED ALARM BOX
                  boxBorder = 'border-red-500 animate-pulse'
                  boxBg = 'bg-red-500/25 shadow-[0_0_22px_rgba(239,68,68,0.75)]'
                  badgeBg = 'bg-red-500'
                  badgeText = 'text-white'
                  const zoneTag = d.zone_name ? `[${d.zone_name.toUpperCase()}] ` : ''

                  if (activeAlert?.alert_type === 'loitering') {
                    label = `🚨 ${zoneTag}LOITERING · ID·${String(d.tracked_id).padStart(2, '0')}`
                  } else if (activeAlert?.alert_type === 'fall') {
                    label = `🚨 FALL DETECTED · ID·${String(d.tracked_id).padStart(2, '0')}`
                  } else {
                    label = `🚨 ${zoneTag}ZONE INTRUSION · ID·${String(d.tracked_id).padStart(2, '0')}`
                  }
                }

                return (
                  <TrackReticle
                    key={d.tracked_id}
                    x={d.box.x}
                    y={d.box.y}
                    width={d.box.width}
                    height={d.box.height}
                    scale={scale}
                    boxBorder={boxBorder}
                    boxBg={boxBg}
                    badgeBg={badgeBg}
                    badgeText={badgeText}
                    label={label}
                  />
                )
              })}
            </>
          )}

          {/* Vignette — draws the eye inward, reads as a sensor feed rather than a pasted image */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ boxShadow: 'inset 0 0 90px 18px rgba(0,0,0,0.5)' }}
          />

          {/* Fall Emergency Red Pulsing Halo */}
          {hasActiveFall && (
            <div className="absolute inset-0 pointer-events-none border-2 border-red/80 shadow-[inset_0_0_40px_rgba(224,57,62,0.4)] animate-pulse" />
          )}

          {/* Telemetry HUD Top Overlay */}
          {showOverlays && (
            <div className="absolute top-0 left-0 right-0 p-3 flex justify-between items-start pointer-events-none bg-gradient-to-b from-black/75 via-black/25 to-transparent">
              {/* Live Indicator + Zone */}
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-xs bg-amber/90 text-black font-mono text-telemetry font-bold tracking-widest uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-black/70 [animation:sage-live-pulse_2.6s_ease-in-out_infinite]" />
                  LIVE
                </span>
                <span className="font-mono text-telemetry text-text-primary bg-black/60 px-2 py-0.5 rounded-xs border border-white/10 tracking-tight font-medium">
                  PRIMARY SENSOR
                </span>
              </div>

              {/* Top Right: Tracked People Count & Timestamp */}
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-2">
                  {detections.length > 0 && (
                    <span className="font-mono text-telemetry text-text-primary bg-black/70 px-2 py-0.5 rounded-xs border border-white/10 font-semibold">
                      {detections.length} TRACKED
                    </span>
                  )}
                  <span className="font-mono text-telemetry text-text-secondary bg-black/60 px-2 py-0.5 rounded-xs border border-white/10">
                    {new Date().toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Controls Overlay Hover Toolbar */}
          <div className="absolute bottom-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 backdrop-blur px-2.5 py-1 rounded-sm border border-hairline">
            <button
              onClick={() => setShowOverlays(!showOverlays)}
              className="p-1 text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
              title={showOverlays ? 'Hide HUD' : 'Show HUD'}
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-1 text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
