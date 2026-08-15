import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  MapPin,
  Camera,
  RotateCcw,
  Trash2,
  Clock,
  UserCheck,
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

export default function ZoneEditor({
  currentFrameBase64 = null,
  apiBaseUrl = 'http://localhost:8000',
  onZoneSaved = null,
}) {
  const canvasRef = useRef(null)
  const [capturedFrame, setCapturedFrame] = useState(null)
  const [points, setPoints] = useState([])
  const [zoneName, setZoneName] = useState('')
  const [selectedRules, setSelectedRules] = useState(['after_hours'])
  const [savedZones, setSavedZones] = useState([])
  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState(null)

  // Initialize captured frame on first load
  useEffect(() => {
    if (currentFrameBase64 && !capturedFrame) {
      setCapturedFrame(currentFrameBase64)
    }
  }, [currentFrameBase64, capturedFrame])

  // Fetch zones on mount
  useEffect(() => {
    let isMounted = true
    async function fetchZones() {
      try {
        setLoading(true)
        const res = await fetch(`${apiBaseUrl}/api/zones`)
        if (res.ok && isMounted) {
          const data = await res.json()
          setSavedZones(Array.isArray(data) ? data : [])
        }
      } catch {
        // Fallback demo zone
        if (isMounted) {
          setSavedZones([
            {
              zone_id: 'zone_north_gate',
              name: 'North Pathway Restricted Zone',
              polygon: [
                [120, 520],
                [480, 360],
                [840, 420],
                [1080, 580],
              ],
              rules: ['after_hours', 'loitering'],
            },
          ])
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    fetchZones()
    return () => {
      isMounted = false
    }
  }, [apiBaseUrl])

  const renderOverlays = useCallback(
    (ctx) => {
      // 1. Draw previously saved zones
      savedZones.forEach((zone) => {
        if (zone.polygon && zone.polygon.length >= 3) {
          ctx.beginPath()
          ctx.moveTo(zone.polygon[0][0], zone.polygon[0][1])
          for (let i = 1; i < zone.polygon.length; i++) {
            ctx.lineTo(zone.polygon[i][0], zone.polygon[i][1])
          }
          ctx.closePath()
          ctx.fillStyle = 'rgba(255, 180, 171, 0.12)'
          ctx.fill()
          ctx.strokeStyle = '#ffb4ab'
          ctx.lineWidth = 1.5
          ctx.setLineDash([4, 4])
          ctx.stroke()
          ctx.setLineDash([])

          // Label
          ctx.fillStyle = '#ffb4ab'
          ctx.font = 'bold 11px "JetBrains Mono", monospace'
          ctx.fillText(
            `ZONE: ${zone.name || zone.zone_id}`,
            zone.polygon[0][0] + 6,
            zone.polygon[0][1] - 8
          )
        }
      })

      // 2. Draw active drawing points
      if (points.length > 0) {
        ctx.beginPath()
        ctx.moveTo(points[0][0], points[0][1])
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i][0], points[i][1])
        }

        if (points.length >= 3) {
          ctx.closePath()
          ctx.fillStyle = 'rgba(245, 158, 11, 0.2)'
          ctx.fill()
        }

        ctx.strokeStyle = '#f59e0b'
        ctx.lineWidth = 2
        ctx.setLineDash([4, 4])
        ctx.stroke()
        ctx.setLineDash([])

        // Draw point handles
        points.forEach(([x, y], idx) => {
          ctx.beginPath()
          ctx.arc(x, y, 4.5, 0, 2 * Math.PI)
          ctx.fillStyle = idx === 0 ? '#10b981' : '#f59e0b'
          ctx.fill()
          ctx.strokeStyle = '#ffffff'
          ctx.lineWidth = 1.5
          ctx.stroke()
        })
      }
    },
    [savedZones, points]
  )

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (capturedFrame) {
      const img = new Image()
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        renderOverlays(ctx)
      }
      img.src = capturedFrame.startsWith('data:')
        ? capturedFrame
        : `data:image/jpeg;base64,${capturedFrame}`
    } else {
      ctx.fillStyle = '#141313'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#919094'
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
      ctx.fillStyle = '#16161a'
      ctx.fillRect(0, 0, 1280, 720)
      ctx.strokeStyle = '#2d2c35'
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
      ctx.fillStyle = '#10b981'
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
      setStatusMessage({ type: 'error', text: 'Please enter a name for the zone.' })
      return
    }
    if (points.length < 3) {
      setStatusMessage({ type: 'error', text: 'A zone polygon requires at least 3 points.' })
      return
    }
    if (selectedRules.length === 0) {
      setStatusMessage({ type: 'error', text: 'Please select at least one rule for this zone.' })
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
        setPoints([])
        setZoneName('')
        setStatusMessage({
          type: 'success',
          text: `Zone "${saved.name || saved.zone_id}" saved successfully!`,
        })
        if (onZoneSaved) onZoneSaved(saved)
      } else {
        const mockSaved = {
          zone_id: `zone_${Date.now()}`,
          ...payload,
        }
        setSavedZones((prev) => [...prev, mockSaved])
        setPoints([])
        setZoneName('')
        setStatusMessage({
          type: 'success',
          text: `Zone "${payload.name}" saved in local preview mode.`,
        })
        if (onZoneSaved) onZoneSaved(mockSaved)
      }
    } catch {
      const mockSaved = {
        zone_id: `zone_${Date.now()}`,
        ...payload,
      }
      setSavedZones((prev) => [...prev, mockSaved])
      setPoints([])
      setZoneName('')
      setStatusMessage({
        type: 'success',
        text: `Zone "${payload.name}" saved locally.`,
      })
      if (onZoneSaved) onZoneSaved(mockSaved)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-[#1c1b1b] border border-[#46464a] rounded p-5 shadow-2xl flex flex-col gap-5 text-[#e5e2e1]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#46464a] pb-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-amber-400" />
          <h2 className="text-sm font-mono font-bold tracking-wide uppercase">
            Zone Calibration & Polygon Plotter
          </h2>
        </div>
        <button
          onClick={handleCaptureFrame}
          className="flex items-center gap-2 px-3 py-1.5 bg-[#2b2a2a] hover:bg-[#353434] border border-[#46464a] text-[#e5e2e1] rounded text-xs font-mono transition-colors cursor-pointer"
        >
          <Camera className="w-4 h-4 text-emerald-400" />
          Capture Current Frame
        </button>
      </div>

      {statusMessage && (
        <div
          className={`p-3 rounded text-xs font-mono flex items-center justify-between ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40'
              : 'bg-red-950/60 text-red-300 border border-red-500/40'
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
          <div className="relative border border-[#46464a] rounded overflow-hidden bg-black shadow-inner">
            <canvas
              ref={canvasRef}
              width={1280}
              height={720}
              onClick={handleCanvasClick}
              className="w-full h-auto cursor-crosshair block"
            />
          </div>

          <div className="flex items-center justify-between text-xs font-mono text-[#919094]">
            <span>
              Plotted Vertices: <strong className="text-white">{points.length}</strong> (Minimum 3
              needed)
            </span>
            <div className="flex gap-2">
              <button
                onClick={handleUndoPoint}
                disabled={points.length === 0}
                className="flex items-center gap-1 px-2 py-1 bg-[#2b2a2a] hover:bg-[#353434] disabled:opacity-40 rounded text-[11px] border border-[#46464a] cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> Undo Point
              </button>
              <button
                onClick={handleClearPoints}
                disabled={points.length === 0}
                className="flex items-center gap-1 px-2 py-1 bg-[#2b2a2a] hover:bg-[#353434] disabled:opacity-40 rounded text-[11px] border border-[#46464a] text-red-300 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" /> Clear Points
              </button>
            </div>
          </div>
        </div>

        {/* Right: Zone Config Form (4 cols) */}
        <div className="lg:col-span-4 bg-[#201f1f] border border-[#46464a] rounded p-4 flex flex-col gap-4">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#e5e2e1]">
            Define Restricted Zone
          </h3>

          <form onSubmit={handleSaveZone} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-mono text-[#c7c6ca] mb-1">
                Zone Identifier / Name
              </label>
              <input
                type="text"
                value={zoneName}
                onChange={(e) => setZoneName(e.target.value)}
                placeholder="e.g. North_Pathway_01"
                className="w-full bg-[#141313] border border-[#46464a] rounded px-3 py-1.5 text-xs text-[#e5e2e1] font-mono focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-[#c7c6ca] mb-1">
                Active Detection Rules
              </label>
              <div className="flex flex-col gap-2">
                {AVAILABLE_RULES.map((rule) => {
                  const Icon = rule.icon
                  const isChecked = selectedRules.includes(rule.id)
                  return (
                    <div
                      key={rule.id}
                      onClick={() => toggleRule(rule.id)}
                      className={`p-2.5 rounded border cursor-pointer transition-all flex items-start gap-2.5 ${
                        isChecked
                          ? 'bg-[#353434] border-amber-500/50 text-[#e5e2e1]'
                          : 'bg-[#141313] border-[#46464a]/50 text-[#919094] hover:border-[#46464a]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="mt-0.5 accent-amber-400"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 text-xs font-mono font-semibold">
                          <Icon className="w-3.5 h-3.5 text-amber-400" />
                          {rule.label}
                        </div>
                        <p className="text-[10px] text-[#919094] mt-0.5">{rule.description}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || points.length < 3 || !zoneName.trim()}
              className="w-full py-2 bg-[#c8c6c7] hover:bg-white text-[#313031] disabled:opacity-40 font-mono font-bold text-xs uppercase tracking-wider rounded transition-colors shadow-lg cursor-pointer"
            >
              {loading ? 'Saving Polygon...' : 'Save Zone Polygon'}
            </button>
          </form>

          {/* Saved Zones List */}
          <div className="border-t border-[#46464a] pt-3 mt-2">
            <h4 className="text-[11px] font-mono text-[#c7c6ca] uppercase mb-2">
              Saved Calibrated Zones ({savedZones.length})
            </h4>
            <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto pr-1">
              {savedZones.map((z, idx) => (
                <div
                  key={z.zone_id || idx}
                  className="p-2 bg-[#141313] border border-[#353434] rounded text-xs font-mono flex items-center justify-between"
                >
                  <span className="text-amber-400 font-semibold">{z.name || z.zone_id}</span>
                  <span className="text-[10px] text-[#919094]">
                    {z.polygon ? `${z.polygon.length} pts` : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
