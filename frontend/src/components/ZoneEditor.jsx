import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  MapPin,
  Camera,
  RotateCcw,
  Trash2,
  Clock,
  UserCheck,
  Check,
  X,
} from 'lucide-react'



// Available rules for zones (per CONTRACT.md - fall is never a zone rule)
const AVAILABLE_RULES = [
  {
    id: 'after_hours',
    label: 'After-Hours Presence',
    icon: Clock,
    description: 'Flags presence outside allowed curfew hours',
  },
  {
    id: 'loitering',
    label: 'Loitering Detection',
    icon: UserCheck,
    description: 'Flags stationary presence exceeding threshold duration',
  },
]

// Point in polygon test helper for canvas hit testing
function isPointInPolygon(point, vs) {
  const x = point[0]
  const y = point[1]
  let inside = false
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][0]
    const yi = vs[i][1]
    const xj = vs[j][0]
    const yj = vs[j][1]
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }
  return inside
}

export default function ZoneEditor({
  currentFrameBase64 = null,
  apiBaseUrl = 'http://localhost:8000',
  onZoneSaved = null,
  onZoneDeleted = null,
}) {
  const canvasRef = useRef(null)
  const [capturedFrame, setCapturedFrame] = useState(null)
  const [points, setPoints] = useState([])
  const [zoneName, setZoneName] = useState('')
  const [selectedRules, setSelectedRules] = useState(['after_hours'])
  const [savedZones, setSavedZones] = useState([])
  const [selectedZoneId, setSelectedZoneId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState(null)

  // Initialize captured frame on first load
  useEffect(() => {
    if (currentFrameBase64 && !capturedFrame) {
      setCapturedFrame(currentFrameBase64)
    }
  }, [currentFrameBase64, capturedFrame])

  // Fetch zones on mount
  const fetchZones = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`${apiBaseUrl}/api/zones`)
      if (res.ok) {
        const data = await res.json()
        setSavedZones(Array.isArray(data) ? data : [])
      }
    } catch {
      // Keep existing zones or fallback
    } finally {
      setLoading(false)
    }
  }, [apiBaseUrl])

  useEffect(() => {
    fetchZones()
  }, [fetchZones])

  const renderOverlays = useCallback(
    (ctx) => {
      // 1. Draw previously saved zones
      savedZones.forEach((zone) => {
        if (zone.polygon && zone.polygon.length >= 3) {
          const isSelected = zone.zone_id === selectedZoneId

          ctx.beginPath()
          ctx.moveTo(zone.polygon[0][0], zone.polygon[0][1])
          for (let i = 1; i < zone.polygon.length; i++) {
            ctx.lineTo(zone.polygon[i][0], zone.polygon[i][1])
          }
          ctx.closePath()

          if (isSelected) {
            // Highlighted selected zone style — amber: this zone is the one actively being worked with
            ctx.fillStyle = 'rgba(245, 166, 35, 0.24)'
            ctx.fill()
            ctx.strokeStyle = '#f5a623'
            ctx.lineWidth = 2.5
            ctx.setLineDash([])
            ctx.stroke()

            // Draw vertex points for selected zone
            zone.polygon.forEach(([x, y]) => {
              ctx.beginPath()
              ctx.arc(x, y, 4, 0, 2 * Math.PI)
              ctx.fillStyle = '#f5a623'
              ctx.fill()
              ctx.strokeStyle = '#0a0a0c'
              ctx.lineWidth = 1.5
              ctx.stroke()
            })

            // Prominent selection badge
            ctx.fillStyle = '#f5a623'
            ctx.font = 'bold 12px "JetBrains Mono", monospace'
            ctx.fillText(
              `SELECTED: ${zone.name || zone.zone_id}`,
              zone.polygon[0][0] + 8,
              zone.polygon[0][1] - 10
            )
          } else {
            // Normal subtle zone style — neutral: a saved zone with no active alert is not urgent
            ctx.fillStyle = 'rgba(122, 122, 125, 0.10)'
            ctx.fill()
            ctx.strokeStyle = '#7a7a7d'
            ctx.lineWidth = 1.5
            ctx.setLineDash([4, 4])
            ctx.stroke()
            ctx.setLineDash([])

            // Label
            ctx.fillStyle = '#7a7a7d'
            ctx.font = 'bold 11px "JetBrains Mono", monospace'
            ctx.fillText(
              `ZONE: ${zone.name || zone.zone_id}`,
              zone.polygon[0][0] + 6,
              zone.polygon[0][1] - 8
            )
          }
        }
      })

      // 2. Draw active drawing points — amber: this polygon is being live-edited right now
      if (points.length > 0) {
        ctx.beginPath()
        ctx.moveTo(points[0][0], points[0][1])
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i][0], points[i][1])
        }

        if (points.length >= 3) {
          ctx.closePath()
          ctx.fillStyle = 'rgba(245, 166, 35, 0.18)'
          ctx.fill()
        }

        ctx.strokeStyle = '#f5a623'
        ctx.lineWidth = 2
        ctx.setLineDash([4, 4])
        ctx.stroke()
        ctx.setLineDash([])

        // Draw point handles with mono coordinate readouts
        points.forEach(([x, y]) => {
          ctx.beginPath()
          ctx.arc(x, y, 5, 0, 2 * Math.PI)
          ctx.fillStyle = '#f5a623'
          ctx.fill()
          ctx.strokeStyle = '#0a0a0c'
          ctx.lineWidth = 1.5
          ctx.stroke()

          ctx.fillStyle = '#e8e8e6'
          ctx.font = '10px "JetBrains Mono", monospace'
          ctx.fillText(`${x},${y}`, x + 8, y - 8)
        })
      }
    },
    [savedZones, selectedZoneId, points]
  )

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (capturedFrame) {
      const img = new Image()
      img.onload = () => {
        if (img.naturalWidth && img.naturalHeight) {
          if (canvas.width !== img.naturalWidth || canvas.height !== img.naturalHeight) {
            canvas.width = img.naturalWidth
            canvas.height = img.naturalHeight
          }
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        renderOverlays(ctx)
      }
      img.src = capturedFrame.startsWith('data:')
        ? capturedFrame
        : `data:image/jpeg;base64,${capturedFrame}`
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#0e0e10'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#7a7a7d'
      ctx.font = '12px "JetBrains Mono", monospace'
      ctx.textAlign = 'center'
      ctx.fillText(
        'STANDBY REFERENCE CANVAS // CLICK "CAPTURE CURRENT FRAME" TO BEGIN',
        canvas.width / 2,
        canvas.height / 2
      )
      ctx.textAlign = 'start'
      renderOverlays(ctx)
    }
  }, [capturedFrame, renderOverlays])

  useEffect(() => {
    drawCanvas()
  }, [drawCanvas])

  const handleCaptureFrame = () => {
    if (currentFrameBase64) {
      setCapturedFrame(currentFrameBase64)
      setStatusMessage({ type: 'success', text: 'Live frame captured for zone calibration.' })
    } else {
      // Create a test calibration canvas
      const testCanvas = document.createElement('canvas')
      testCanvas.width = 1280
      testCanvas.height = 720
      const ctx = testCanvas.getContext('2d')
      ctx.fillStyle = '#0e0e10'
      ctx.fillRect(0, 0, 1280, 720)
      ctx.strokeStyle = '#232326'
      ctx.lineWidth = 1
      for (let x = 0; x < 1280; x += 40) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, 720)
        ctx.stroke()
      }
      for (let y = 0; y < 720; y += 40) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(1280, y)
        ctx.stroke()
      }
      ctx.fillStyle = '#7a7a7d'
      ctx.font = '14px "JetBrains Mono", monospace'
      ctx.fillText('CALIBRATION GRID [1280x720] // READY FOR POLYGON PLOT', 24, 36)
      const b64 = testCanvas.toDataURL('image/jpeg').replace(/^data:image\/jpeg;base64,/, '')
      setCapturedFrame(b64)
      setStatusMessage({ type: 'success', text: 'Calibration grid frame ready.' })
    }
  }

  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    const x = Math.round((e.clientX - rect.left) * scaleX)
    const y = Math.round((e.clientY - rect.top) * scaleY)

    // If not drawing a new polygon, clicking can select a saved zone
    if (points.length === 0) {
      const clickedZone = savedZones.find(
        (z) => z.polygon && z.polygon.length >= 3 && isPointInPolygon([x, y], z.polygon)
      )
      if (clickedZone) {
        setSelectedZoneId((prev) => (prev === clickedZone.zone_id ? null : clickedZone.zone_id))
        return
      }
    }

    // Otherwise add vertex point
    setPoints((prev) => [...prev, [x, y]])
  }

  const handleUndoPoint = () => {
    setPoints((prev) => prev.slice(0, -1))
  }

  const handleClearPoints = () => {
    setPoints([])
  }

  const toggleRule = (ruleId) => {
    setSelectedRules((prev) =>
      prev.includes(ruleId) ? prev.filter((r) => r !== ruleId) : [...prev, ruleId]
    )
  }

  const handleSaveZone = async (e) => {
    e.preventDefault()
    if (!zoneName.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter a name for the zone (e.g. "Booth_Front_Zone") in the text input.' })
      return
    }
    if (points.length < 3) {
      setStatusMessage({
        type: 'error',
        text: `A zone polygon requires at least 3 vertices. Please click on the camera frame canvas to plot your polygon (currently: ${points.length} points).`,
      })
      return
    }
    if (selectedRules.length === 0) {
      setStatusMessage({ type: 'error', text: 'Please select at least one detection rule (After-Hours or Loitering).' })
      return
    }

    const payload = {
      name: zoneName.trim(),
      polygon: points,
      rules: selectedRules,
    }

    try {
      setLoading(true)
      const res = await fetch(`${apiBaseUrl}/api/zones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        const saved = await res.json()
        setSavedZones((prev) => [...prev, saved])
        setSelectedZoneId(saved.zone_id)
        setPoints([])
        setZoneName('')
        setStatusMessage({
          type: 'success',
          text: `Zone "${saved.name || saved.zone_id}" saved successfully!`,
        })
        if (onZoneSaved) onZoneSaved(saved)
      } else {
        setStatusMessage({
          type: 'error',
          text: `Failed to save zone "${payload.name}" to server.`,
        })
      }
    } catch {
      setStatusMessage({
        type: 'error',
        text: `Network error: Could not reach backend server at ${apiBaseUrl}.`,
      })
    } finally {
      setLoading(false)
    }
  }

  // Delete a calibrated zone
  const handleDeleteZone = async (zoneId) => {
    const targetZone = savedZones.find((z) => z.zone_id === zoneId)
    const targetName = targetZone?.name || zoneId

    try {
      setLoading(true)
      const res = await fetch(`${apiBaseUrl}/api/zones/${zoneId}`, {
        method: 'DELETE',
      })

      if (res.ok || res.status === 404) {
        setSavedZones((prev) => prev.filter((z) => z.zone_id !== zoneId))
        if (selectedZoneId === zoneId) {
          setSelectedZoneId(null)
        }
        setStatusMessage({
          type: 'success',
          text: `Zone "${targetName}" deleted successfully.`,
        })
        if (onZoneDeleted) onZoneDeleted(zoneId)
      } else {
        // Optimistic local deletion fallback
        setSavedZones((prev) => prev.filter((z) => z.zone_id !== zoneId))
        if (selectedZoneId === zoneId) {
          setSelectedZoneId(null)
        }
        setStatusMessage({
          type: 'success',
          text: `Zone "${targetName}" removed.`,
        })
        if (onZoneDeleted) onZoneDeleted(zoneId)
      }
    } catch {
      setSavedZones((prev) => prev.filter((z) => z.zone_id !== zoneId))
      if (selectedZoneId === zoneId) {
        setSelectedZoneId(null)
      }
      setStatusMessage({
        type: 'success',
        text: `Zone "${targetName}" removed locally.`,
      })
      if (onZoneDeleted) onZoneDeleted(zoneId)
    } finally {
      setLoading(false)
    }
  }

  const selectedZone = savedZones.find((z) => z.zone_id === selectedZoneId)

  return (
    <div className="bg-panel border border-hairline rounded p-5 shadow-2xl flex flex-col gap-5 text-text-primary">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-hairline pb-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-text-secondary" />
          <h2 className="text-sm font-display font-bold tracking-wide uppercase">
            Zone Calibration & Polygon Plotter
          </h2>
        </div>
        <button
          onClick={handleCaptureFrame}
          className="flex items-center gap-2 px-3 py-1.5 bg-transparent hover:bg-panel-high border border-hairline-bright text-text-secondary hover:text-text-primary rounded text-xs font-sans font-semibold transition-colors cursor-pointer"
        >
          <Camera className="w-4 h-4" />
          Capture Current Frame
        </button>
      </div>

      {statusMessage && (
        <div
          className={`p-3 rounded text-xs font-sans flex items-center justify-between ${
            statusMessage.type === 'success'
              ? 'bg-green/10 text-green border border-green/40'
              : 'bg-red/10 text-red border border-red/40'
          }`}
        >
          <span>{statusMessage.text}</span>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-xs hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Grid: Canvas + Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Canvas viewport (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-2">
          <div className="relative border border-hairline rounded overflow-hidden bg-recessed shadow-inner">
            <canvas
              ref={canvasRef}
              width={1280}
              height={720}
              onClick={handleCanvasClick}
              className="w-full h-auto cursor-crosshair block"
            />
          </div>

          <div className="flex items-center justify-between text-xs font-sans text-text-secondary">
            <span>
              {points.length > 0 ? (
                <>
                  Plotted Vertices: <strong className="font-mono text-amber">{points.length}</strong> (Min 3 needed)
                </>
              ) : selectedZone ? (
                <span className="text-amber">
                  Click on canvas or list to select zones. Currently selected: <strong className="text-text-primary">{selectedZone.name || selectedZone.zone_id}</strong>
                </span>
              ) : (
                'Click canvas to plot vertices or click existing zones to select'
              )}
            </span>
            <div className="flex gap-2">
              <button
                onClick={handleUndoPoint}
                disabled={points.length === 0}
                className="flex items-center gap-1 px-2 py-1 bg-panel-high hover:bg-panel-highest disabled:opacity-40 rounded text-[11px] border border-hairline-bright cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> Undo Point
              </button>
              <button
                onClick={handleClearPoints}
                disabled={points.length === 0}
                className="flex items-center gap-1 px-2 py-1 bg-panel-high hover:bg-panel-highest disabled:opacity-40 rounded text-[11px] border border-hairline-bright text-text-secondary hover:text-red cursor-pointer"
              >
                <Trash2 className="w-3 h-3" /> Clear Points
              </button>
            </div>
          </div>
        </div>

        {/* Right: Zone Config & Management Panel (4 cols) */}
        <div className="lg:col-span-4 bg-panel-high border border-hairline rounded p-4 flex flex-col gap-4">

          {/* Selected Zone Quick Action Card */}
          {selectedZone && (
            <div className="p-3 bg-amber/10 border border-amber/40 rounded-md flex flex-col gap-2 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-sans font-bold text-amber">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>SELECTED ZONE</span>
                </div>
                <button
                  onClick={() => setSelectedZoneId(null)}
                  className="text-text-tertiary hover:text-text-primary text-[11px] font-sans cursor-pointer"
                  title="Deselect Zone"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="text-xs font-sans">
                <div className="font-semibold text-text-primary text-sm">{selectedZone.name || selectedZone.zone_id}</div>
                <div className="text-[10px] text-text-secondary mt-0.5 font-mono">ID: {selectedZone.zone_id} &bull; {selectedZone.polygon?.length || 0} vertices</div>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {(selectedZone.rules || []).map((r) => (
                    <span
                      key={r}
                      className="px-1.5 py-0.5 rounded bg-amber/15 text-amber border border-amber/30 text-[9px] font-sans font-semibold uppercase"
                    >
                      {r.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 mt-1 pt-2 border-t border-amber/20">
                <button
                  type="button"
                  onClick={() => handleDeleteZone(selectedZone.zone_id)}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-panel border border-hairline-bright text-text-secondary hover:text-red hover:border-red/50 font-sans text-xs font-bold rounded transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Zone
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedZoneId(null)}
                  className="px-3 py-1.5 bg-panel hover:bg-panel-highest border border-hairline-bright text-text-secondary font-sans text-xs rounded transition-colors cursor-pointer"
                >
                  Deselect
                </button>
              </div>
            </div>
          )}

          {/* Form to Plot / Define Zone */}
          <div>
            <h3 className="text-xs font-display font-bold uppercase tracking-wider text-text-primary mb-3">
              Define New Restricted Zone
            </h3>

            <form onSubmit={handleSaveZone} className="flex flex-col gap-3.5">
              <div>
                <label className="block text-xs font-sans text-text-secondary mb-1">
                  Zone Identifier / Name
                </label>
                <input
                  type="text"
                  value={zoneName}
                  onChange={(e) => setZoneName(e.target.value)}
                  placeholder="e.g. North_Pathway_01"
                  className="w-full bg-recessed border border-hairline-bright rounded px-3 py-1.5 text-xs text-text-primary font-sans focus:border-amber focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-sans text-text-secondary mb-1">
                  Active Detection Rules
                </label>
                <div className="flex flex-col gap-2">
                  {AVAILABLE_RULES.map((rule) => {
                    const Icon = rule.icon
                    const isChecked = selectedRules.includes(rule.id)
                    return (
                      <div
                        key={rule.id}
                        role="checkbox"
                        aria-checked={isChecked}
                        tabIndex={0}
                        onClick={() => toggleRule(rule.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            toggleRule(rule.id)
                          }
                        }}
                        className={`p-2.5 rounded border cursor-pointer transition-all flex items-start gap-2.5 ${
                          isChecked
                            ? 'bg-amber/10 border-amber text-text-primary'
                            : 'bg-recessed border-hairline text-text-secondary hover:border-hairline-bright'
                        }`}
                      >
                        {/* Arming indicator, not a form checkbox */}
                        <div
                          className={`mt-0.5 w-4 h-4 rounded-xs border flex items-center justify-center shrink-0 transition-colors ${
                            isChecked ? 'bg-amber border-amber' : 'bg-recessed border-hairline-bright'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 text-black" strokeWidth={3} />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5 text-xs font-sans font-semibold">
                            <Icon className={`w-3.5 h-3.5 ${isChecked ? 'text-amber' : 'text-text-tertiary'}`} />
                            {rule.label}
                          </div>
                          <p className="text-[10px] text-text-secondary mt-0.5 font-sans">{rule.description}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Validation Readiness Checklist */}
              <div className="bg-recessed border border-hairline rounded p-2.5 flex flex-col gap-1.5 text-[11px] font-sans">
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">1. Zone Name:</span>
                  <span className={zoneName.trim() ? 'text-green font-mono font-semibold' : 'text-amber'}>
                    {zoneName.trim() ? `✓ ${zoneName.trim()}` : 'Required'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">2. Polygon Vertices:</span>
                  <span className={points.length >= 3 ? 'text-green font-mono font-semibold' : 'text-amber'}>
                    {points.length >= 3 ? `✓ ${points.length} points` : `Plot on canvas (${points.length}/3)`}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">3. Active Rules:</span>
                  <span className={selectedRules.length > 0 ? 'text-green font-mono font-semibold' : 'text-amber'}>
                    {selectedRules.length > 0 ? `✓ ${selectedRules.length} selected` : 'Select ≥ 1 rule'}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-2.5 font-sans font-bold text-xs uppercase tracking-wider rounded transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer ${
                  points.length >= 3 && zoneName.trim() && selectedRules.length > 0
                    ? 'bg-amber text-black hover:bg-amber/90 active:scale-[0.99]'
                    : 'bg-panel-highest border border-hairline-bright text-text-secondary hover:text-text-primary hover:border-amber/50'
                }`}
              >
                {loading ? (
                  <span>Saving Polygon...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Save Zone Polygon</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Saved Zones List with Select & Delete */}
          <div className="border-t border-hairline pt-3 mt-1">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[11px] font-sans font-semibold text-text-secondary uppercase">
                Calibrated Zones ({savedZones.length})
              </h4>
              <span className="text-[10px] font-sans text-text-tertiary">Click to choose</span>
            </div>

            <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
              {savedZones.length === 0 ? (
                <div className="p-3 text-center text-xs font-sans text-text-secondary bg-recessed rounded border border-hairline">
                  Click the canvas above to start plotting your first zone.
                </div>
              ) : (
                savedZones.map((z, idx) => {
                  const isSelected = z.zone_id === selectedZoneId
                  return (
                    <div
                      key={z.zone_id || idx}
                      onClick={() =>
                        setSelectedZoneId((prev) => (prev === z.zone_id ? null : z.zone_id))
                      }
                      className={`p-2.5 rounded text-xs font-sans flex items-center justify-between cursor-pointer transition-all border ${
                        isSelected
                          ? 'bg-amber/10 border-amber/60 shadow-sm'
                          : 'bg-recessed border-hairline hover:border-hairline-bright'
                      }`}
                    >
                      <div className="flex flex-col flex-1 min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-semibold truncate ${
                              isSelected ? 'text-amber' : 'text-text-primary'
                            }`}
                          >
                            {z.name || z.zone_id}
                          </span>
                          {isSelected && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-amber/20 text-amber uppercase font-sans font-semibold">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-text-secondary mt-0.5 font-mono">
                          <span>{z.polygon ? `${z.polygon.length} pts` : ''}</span>
                          <span>&bull;</span>
                          <span>{(z.rules || []).join(', ')}</span>
                        </div>
                      </div>

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteZone(z.zone_id)
                        }}
                        disabled={loading}
                        className="p-1.5 text-text-tertiary hover:text-red hover:bg-red/10 rounded transition-colors cursor-pointer shrink-0"
                        title={`Delete zone "${z.name || z.zone_id}"`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
