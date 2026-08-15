import React, { useState, useEffect, useRef } from 'react'
import {
  MapPin,
  Camera,
  RotateCcw,
  CheckCircle2,
  Trash2,
  Plus,
  Layers,
  AlertCircle,
  Clock,
  UserCheck,
} from 'lucide-react'

// Available rules for zones (per CONTRACT.md - fall is never a zone rule)
const AVAILABLE_RULES = [
  { id: 'after_hours', label: 'After-Hours Presence', icon: Clock, description: 'Flags presence outside allowed hours' },
  { id: 'loitering', label: 'Loitering Detection', icon: UserCheck, description: 'Flags stationary presence exceeding threshold' },
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
  const [statusMessage, setStatusMessage] = useState(null) // { type: 'success' | 'error', text: string }

  // Load saved zones on mount
  useEffect(() => {
    fetchZones()
  }, [apiBaseUrl])

  // Initialize captured frame from prop if available
  useEffect(() => {
    if (currentFrameBase64 && !capturedFrame) {
      setCapturedFrame(currentFrameBase64)
    }
  }, [currentFrameBase64, capturedFrame])

  // Redraw canvas whenever points, capturedFrame, or savedZones change
  useEffect(() => {
    drawCanvas()
  }, [capturedFrame, points, savedZones])

  const fetchZones = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${apiBaseUrl}/api/zones`)
      if (res.ok) {
        const data = await res.json()
        setSavedZones(Array.isArray(data) ? data : [])
      } else {
        console.warn('Backend /api/zones not reachable, using empty list')
      }
    } catch (err) {
      console.warn('Failed to fetch zones from backend:', err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCaptureFrame = () => {
    if (currentFrameBase64) {
      setCapturedFrame(currentFrameBase64)
      setStatusMessage({ type: 'success', text: 'Live frame captured for zone calibration.' })
    } else {
      // Generate a calibration grid test image if no live feed
      const testCanvas = document.createElement('canvas')
      testCanvas.width = 640
      testCanvas.height = 360
      const ctx = testCanvas.getContext('2d')
      ctx.fillStyle = '#111111'
      ctx.fillRect(0, 0, 640, 360)
      ctx.strokeStyle = '#282828'
      ctx.lineWidth = 1
      for (let x = 0; x < 640; x += 30) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, 360)
        ctx.stroke()
      }
      for (let y = 0; y < 360; y += 30) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(640, y)
        ctx.stroke()
      }
      ctx.fillStyle = '#444444'
      ctx.font = '14px monospace'
      ctx.fillText('STANDBY CALIBRATION FRAME (640x360)', 20, 30)
      const b64 = testCanvas.toDataURL('image/jpeg').replace(/^data:image\/jpeg;base64,/, '')
      setCapturedFrame(b64)
      setStatusMessage({ type: 'success', text: 'Generated calibration frame canvas.' })
    }
  }

  const drawCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // 1. Draw background image
    if (capturedFrame) {
      const img = new Image()
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        renderOverlays(ctx, canvas)
      }
      img.src = capturedFrame.startsWith('data:')
        ? capturedFrame
        : `data:image/jpeg;base64,${capturedFrame}`
    } else {
      // Dark backdrop if no image
      ctx.fillStyle = '#141414'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#666666'
      ctx.font = '13px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('No reference frame captured. Click "Capture Frame" below.', canvas.width / 2, canvas.height / 2)
      ctx.textAlign = 'start'
      renderOverlays(ctx, canvas)
    }
  }

  const renderOverlays = (ctx, canvas) => {
    // 2. Draw previously saved zones (in subtle cyan)
    savedZones.forEach((zone) => {
      if (zone.polygon && zone.polygon.length >= 3) {
        ctx.beginPath()
        ctx.moveTo(zone.polygon[0][0], zone.polygon[0][1])
        for (let i = 1; i < zone.polygon.length; i++) {
          ctx.lineTo(zone.polygon[i][0], zone.polygon[i][1])
        }
        ctx.closePath()
        ctx.fillStyle = 'rgba(6, 182, 212, 0.15)'
        ctx.fill()
        ctx.strokeStyle = '#06b6d4'
        ctx.lineWidth = 1.5
        ctx.stroke()

        // Label
        ctx.fillStyle = '#06b6d4'
        ctx.font = '11px sans-serif'
        ctx.fillText(zone.name || zone.zone_id, zone.polygon[0][0] + 4, zone.polygon[0][1] - 4)
      }
    })

    // 3. Draw active drawing points (in bright amber)
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
        ctx.arc(x, y, 4, 0, 2 * Math.PI)
        ctx.fillStyle = idx === 0 ? '#10b981' : '#f59e0b' // first node in green
        ctx.fill()
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 1.5
        ctx.stroke()
      })
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

    setPoints([...points, [x, y]])
  }

  const handleUndoPoint = () => {
    setPoints(points.slice(0, -1))
  }

  const handleClearPoints = () => {
    setPoints([])
  }

  const toggleRule = (ruleId) => {
    if (selectedRules.includes(ruleId)) {
      setSelectedRules(selectedRules.filter((r) => r !== ruleId))
    } else {
      setSelectedRules([...selectedRules, ruleId])
    }
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
        setSavedZones([...savedZones, saved])
        setPoints([])
        setZoneName('')
        setStatusMessage({ type: 'success', text: `Zone "${saved.name || saved.zone_id}" saved successfully!` })
        if (onZoneSaved) onZoneSaved(saved)
      } else {
        // Fallback for mock/dev environment
        const mockSaved = {
          zone_id: `zone_${Date.now()}`,
          ...payload,
        }
        setSavedZones([...savedZones, mockSaved])
        setPoints([])
        setZoneName('')
        setStatusMessage({
          type: 'success',
          text: `Zone "${payload.name}" saved locally (Backend offline).`,
        })
        if (onZoneSaved) onZoneSaved(mockSaved)
      }
    } catch (err) {
      // Local development fallback
      const mockSaved = {
        zone_id: `zone_${Date.now()}`,
        ...payload,
      }
      setSavedZones([...savedZones, mockSaved])
      setPoints([])
      setZoneName('')
      setStatusMessage({
        type: 'success',
        text: `Zone "${payload.name}" stored in local preview mode.`,
      })
      if (onZoneSaved) onZoneSaved(mockSaved)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-[#121212] border border-[#2a2a2a] rounded-lg p-5 shadow-2xl flex flex-col gap-5 text-[#e5e5e5]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#2a2a2a] pb-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-amber-400" />
          <h2 className="text-sm font-bold tracking-wide uppercase">Zone Calibration Tool</h2>
        </div>
        <button
          onClick={handleCaptureFrame}
          className="flex items-center gap-1.5 px-3 py-1 bg-[#1e1e1e] hover:bg-[#282828] border border-[#3a3a3a] rounded text-xs font-mono transition-colors"
        >
          <Camera className="w-3.5 h-3.5 text-amber-400" />
          Capture Reference Frame
        </button>
      </div>

      {/* Status banner */}
      {statusMessage && (
        <div
          className={`p-3 rounded text-xs flex items-center justify-between ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/70 border border-emerald-500/40 text-emerald-300'
              : 'bg-red-950/70 border border-red-500/40 text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-xs hover:underline opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main interactive area: Canvas + Controls Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Cols: Drawing Canvas */}
        <div className="lg:col-span-2 flex flex-col gap-2">
          <div className="relative border border-[#2a2a2a] rounded bg-black overflow-hidden flex items-center justify-center">
            <canvas
              ref={canvasRef}
              width={640}
              height={360}
              onClick={handleCanvasClick}
              className="w-full h-auto cursor-crosshair block"
            />
            {points.length === 0 && (
              <div className="absolute bottom-3 left-3 bg-black/80 px-2 py-1 rounded text-[11px] font-mono text-[#888888] border border-[#2a2a2a] pointer-events-none">
                Click on canvas to place polygon boundary points
              </div>
            )}
          </div>

          {/* Canvas action bar */}
          <div className="flex items-center justify-between text-xs font-mono">
            <div className="text-[#888888]">
              Points: <span className="text-amber-400 font-bold">{points.length}</span>
              {points.length >= 3 && <span className="ml-2 text-emerald-400 font-semibold">(Polygon Valid)</span>}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleUndoPoint}
                disabled={points.length === 0}
                className="flex items-center gap-1 px-2.5 py-1 bg-[#1a1a1a] hover:bg-[#242424] disabled:opacity-40 border border-[#2a2a2a] rounded transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Undo Point
              </button>
              <button
                type="button"
                onClick={handleClearPoints}
                disabled={points.length === 0}
                className="flex items-center gap-1 px-2.5 py-1 bg-[#1a1a1a] hover:bg-red-950/40 text-[#888888] hover:text-red-400 disabled:opacity-40 border border-[#2a2a2a] rounded transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Zone Form & List */}
        <div className="flex flex-col gap-4">
          <form onSubmit={handleSaveZone} className="flex flex-col gap-3 bg-[#181818] p-4 rounded border border-[#2a2a2a]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#888888]">Create New Zone</h3>

            {/* Name input */}
            <div>
              <label className="block text-xs text-[#888888] mb-1 font-mono">Zone Name</label>
              <input
                type="text"
                placeholder="e.g. Hostel Main Gate"
                value={zoneName}
                onChange={(e) => setZoneName(e.target.value)}
                className="w-full bg-[#0d0d0d] border border-[#333333] focus:border-amber-500 rounded px-3 py-1.5 text-xs text-[#e5e5e5] placeholder-[#555555] outline-none"
              />
            </div>

            {/* Rules checklist */}
            <div>
              <label className="block text-xs text-[#888888] mb-1.5 font-mono">Applicable Rules</label>
              <div className="flex flex-col gap-2">
                {AVAILABLE_RULES.map((rule) => {
                  const Icon = rule.icon
                  const isChecked = selectedRules.includes(rule.id)
                  return (
                    <button
                      key={rule.id}
                      type="button"
                      onClick={() => toggleRule(rule.id)}
                      className={`flex items-start gap-2.5 p-2 rounded border text-left transition-colors ${
                        isChecked
                          ? 'bg-amber-950/40 border-amber-500/50 text-amber-200'
                          : 'bg-[#121212] border-[#2a2a2a] text-[#888888] hover:border-[#3a3a3a]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="mt-0.5 pointer-events-none accent-amber-500"
                      />
                      <div className="flex-1">
                        <div className="text-xs font-semibold flex items-center gap-1.5">
                          <Icon className="w-3.5 h-3.5 text-amber-400" />
                          {rule.label}
                        </div>
                        <div className="text-[10px] opacity-75 mt-0.5">{rule.description}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || points.length < 3}
              className="mt-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-semibold rounded text-xs transition-colors shadow"
            >
              <Plus className="w-4 h-4" />
              Save Zone Polygon
            </button>
          </form>

          {/* Saved zones list */}
          <div className="bg-[#181818] p-4 rounded border border-[#2a2a2a] flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#888888]">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                Configured Zones ({savedZones.length})
              </span>
            </div>

            <div className="max-h-48 overflow-y-auto flex flex-col gap-2 pr-1">
              {savedZones.length === 0 ? (
                <p className="text-xs text-[#666666] font-mono py-2">No active zones configured yet.</p>
              ) : (
                savedZones.map((zone, i) => (
                  <div
                    key={zone.zone_id || i}
                    className="p-2 bg-[#121212] border border-[#2a2a2a] rounded flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-[#e5e5e5]">{zone.name || zone.zone_id}</div>
                      <div className="text-[10px] text-[#888888] font-mono">
                        {zone.polygon ? `${zone.polygon.length} vertices` : 'Polygon set'} &bull;{' '}
                        {zone.rules ? zone.rules.join(', ') : 'All rules'}
                      </div>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-cyan-400" title="Active on canvas" />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
