import React, { useState, useEffect, useRef } from 'react'
import {
  Maximize2,
  Minimize2,
  AlertTriangle,
  WifiOff,
  VideoOff,
  Eye,
} from 'lucide-react'
import TimelineScrubber from './TimelineScrubber'

// High-fidelity security camera simulation pattern generator
function generateRealisticCanvas(width = 1280, height = 720, step = 0) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  // 1. Dark night campus walkway gradient
  const grad = ctx.createLinearGradient(0, 0, 0, height)
  grad.addColorStop(0, '#0c0c0e')
  grad.addColorStop(0.5, '#16161a')
  grad.addColorStop(1, '#0e0e12')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, width, height)

  // 2. Perspective perspective pathway
  ctx.fillStyle = '#1c1b22'
  ctx.beginPath()
  ctx.moveTo(width * 0.42, height * 0.45)
  ctx.lineTo(width * 0.58, height * 0.45)
  ctx.lineTo(width * 0.85, height)
  ctx.lineTo(width * 0.15, height)
  ctx.closePath()
  ctx.fill()

  // Pathway borders
  ctx.strokeStyle = '#2d2c35'
  ctx.lineWidth = 2
  ctx.stroke()

  // 3. Subtle background architecture / lampposts
  ctx.fillStyle = '#222129'
  ctx.fillRect(width * 0.1, height * 0.25, 4, height * 0.5)
  ctx.fillRect(width * 0.88, height * 0.25, 4, height * 0.5)

  // Lamppost light glows
  const glow1 = ctx.createRadialGradient(
    width * 0.1,
    height * 0.25,
    5,
    width * 0.1,
    height * 0.25,
    140
  )
  glow1.addColorStop(0, 'rgba(255, 230, 180, 0.15)')
  glow1.addColorStop(1, 'transparent')
  ctx.fillStyle = glow1
  ctx.beginPath()
  ctx.arc(width * 0.1, height * 0.25, 140, 0, Math.PI * 2)
  ctx.fill()

  const glow2 = ctx.createRadialGradient(
    width * 0.88,
    height * 0.25,
    5,
    width * 0.88,
    height * 0.25,
    140
  )
  glow2.addColorStop(0, 'rgba(255, 230, 180, 0.15)')
  glow2.addColorStop(1, 'transparent')
  ctx.fillStyle = glow2
  ctx.beginPath()
  ctx.arc(width * 0.88, height * 0.25, 140, 0, Math.PI * 2)
  ctx.fill()

  // 4. Subtle security camera scanlines
  ctx.fillStyle = 'rgba(255, 255, 255, 0.015)'
  for (let y = 0; y < height; y += 4) {
    ctx.fillRect(0, y, width, 1.5)
  }

  // 5. Watermark / Raw Sensor Feed Stamp
  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)'
  ctx.font = '11px "JetBrains Mono", monospace'
  ctx.fillText(`CAM_01_RAW_FEED // SAGE_EDGE_INFERENCE [FRAME: #${10420 + step}]`, 24, height - 30)

  return canvas.toDataURL('image/jpeg', 0.85).replace(/^data:image\/jpeg;base64,/, '')
}

export default function LiveFeed({
  wsUrl = 'ws://localhost:8000/ws/stream',
  onFrameUpdate = null,
  onAlertReceived = null,
  isMockMode = true,
  activeZone = 'NORTH_PATHWAY_01',
  alerts = [],
}) {
  const [currentFrame, setCurrentFrame] = useState(null)
  const [connectionStatus, setConnectionStatus] = useState('connected')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showOverlays, setShowOverlays] = useState(true)

  const containerRef = useRef(null)
  const onFrameUpdateRef = useRef(onFrameUpdate)
  const onAlertReceivedRef = useRef(onAlertReceived)

  useEffect(() => {
    onFrameUpdateRef.current = onFrameUpdate
  }, [onFrameUpdate])

  useEffect(() => {
    onAlertReceivedRef.current = onAlertReceived
  }, [onAlertReceived])

  // WebSocket or Mock Stream loop
  useEffect(() => {
    if (isMockMode) {
      setConnectionStatus('connected')
      let frameCount = 0
      const initialFrame = generateRealisticCanvas(1280, 720, frameCount)
      setCurrentFrame(initialFrame)

      const interval = setInterval(() => {
        frameCount += 1
        const frameData = generateRealisticCanvas(1280, 720, frameCount)
        setCurrentFrame(frameData)
        if (onFrameUpdateRef.current) {
          onFrameUpdateRef.current({
            type: 'frame',
            timestamp: new Date().toISOString(),
            image_base64: frameData,
            detections: [
              { tracked_id: 7, status: 'normal' },
              { tracked_id: 9, status: 'fall' },
            ],
          })
        }
      }, 1500)

      return () => clearInterval(interval)
    }

    let isMounted = true
    let ws = null
    let reconnectTimer = null

    function connect() {
      setConnectionStatus('connecting')
      try {
        ws = new WebSocket(wsUrl)

        ws.onopen = () => {
          if (!isMounted) return
          setConnectionStatus('connected')
        }

        ws.onmessage = (event) => {
          if (!isMounted) return
          try {
            const data = JSON.parse(event.data)
            if (data.type === 'frame') {
              setCurrentFrame(data.image_base64)
              if (onFrameUpdateRef.current) onFrameUpdateRef.current(data)
            } else if (data.type === 'alert') {
              if (onAlertReceivedRef.current) onAlertReceivedRef.current(data)
            } else if (data.type === 'status' && data.state) {
              setConnectionStatus(data.state)
            }
          } catch (err) {
            console.error('WebSocket parse error:', err)
          }
        }

        ws.onerror = () => {
          if (!isMounted) return
          setConnectionStatus('disconnected')
        }

        ws.onclose = () => {
          if (!isMounted) return
          setConnectionStatus('disconnected')
          reconnectTimer = setTimeout(connect, 3000)
        }
      } catch {
        if (!isMounted) return
        setConnectionStatus('disconnected')
        reconnectTimer = setTimeout(connect, 3000)
      }
    }

    connect()

    return () => {
      isMounted = false
      if (ws) ws.close()
      if (reconnectTimer) clearTimeout(reconnectTimer)
    }
  }, [wsUrl, isMockMode])

  const toggleFullscreen = () => {
    if (!containerRef.current) return
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }

  const imageSrc = currentFrame
    ? currentFrame.startsWith('data:')
      ? currentFrame
      : `data:image/jpeg;base64,${currentFrame}`
    : null

  // Check if there is an active fall alert in the alert list
  const hasActiveFall = alerts.some((a) => a.alert_type === 'fall')

  return (
    <div className="w-full h-full flex flex-col justify-between">
      {/* Video Viewport Container */}
      <div
        ref={containerRef}
        className="relative w-full flex-1 bg-black border border-[#46464a]/80 rounded overflow-hidden group shadow-2xl flex items-center justify-center min-h-[380px]"
      >
        {/* Render Live / Simulated Camera Feed Image */}
        {imageSrc && connectionStatus !== 'camera_disconnected' ? (
          <div className="relative w-full h-full flex items-center justify-center bg-[#0d0d0d] overflow-hidden">
            <img
              src={imageSrc}
              alt="Live Surveillance Video"
              className="w-full h-full object-cover select-none pointer-events-none"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center bg-[#141313] w-full h-full">
            {connectionStatus === 'camera_disconnected' ? (
              <>
                <VideoOff className="w-12 h-12 text-amber-400 mb-3 animate-pulse" />
                <p className="text-sm font-semibold text-amber-300 font-mono">Camera Feed Lost</p>
                <p className="text-xs text-[#c7c6ca] mt-1 max-w-xs font-mono">
                  Check DroidCam phone connection or ensure camera stream client is transmitting.
                </p>
              </>
            ) : (
              <>
                <WifiOff className="w-12 h-12 text-[#919094] mb-3 animate-pulse" />
                <p className="text-sm font-semibold text-[#e5e2e1] font-mono">
                  Awaiting Video Stream
                </p>
                <p className="text-xs text-[#c7c6ca] mt-1 max-w-xs font-mono">
                  Connecting to <code className="text-amber-400">{wsUrl}</code>
                </p>
              </>
            )}
          </div>
        )}

        {/* Video Overlay UI & HUD */}
        <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between z-20">
          {/* Top HUD Row */}
          <div className="flex justify-between items-start">
            <div className="bg-black/75 backdrop-blur-xs px-2.5 py-1 border border-[#46464a]/80 flex items-center gap-2 rounded-xs shadow">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
              <span className="font-mono text-xs font-bold text-white tracking-wider">REC</span>
              <span className="font-mono text-xs text-[#c7c6ca] ml-2">1080p 60FPS</span>
            </div>

            <div className="bg-black/75 backdrop-blur-xs px-3 py-1 border border-[#46464a]/80 rounded-xs shadow">
              <span className="font-mono text-xs font-semibold text-white tracking-wide">
                ZONE: {activeZone}
              </span>
            </div>
          </div>

          {/* AI Overlays */}
          {showOverlays && (
            <div className="absolute inset-0 pointer-events-none">
              {/* Restricted Zone Polygon */}
              <svg className="absolute inset-0 w-full h-full opacity-40" preserveAspectRatio="none">
                <polygon
                  fill="rgba(255, 180, 171, 0.08)"
                  points="120,520 480,360 840,420 1080,580"
                  stroke="#ffb4ab"
                  strokeDasharray="4 4"
                  strokeWidth="1.5"
                />
              </svg>

              {/* Tracked Target: ID 07 [NORMAL] */}
              <div className="absolute top-[38%] left-[28%] border border-white/60 w-20 h-40 bg-white/5 transition-all shadow-[0_0_8px_rgba(255,255,255,0.1)]">
                <div className="absolute -top-5 left-0 bg-black/80 px-1.5 py-0.5 border border-white/40 whitespace-nowrap">
                  <span className="font-mono text-[9px] text-white font-medium">
                    ID: 07 [NORMAL]
                  </span>
                </div>
              </div>

              {/* Tracked Target: ID 09 [FALL DETECTED / CRITICAL] */}
              {(hasActiveFall || isMockMode) && (
                <div className="absolute top-[58%] left-[58%] border-2 border-[#ff3b30] w-32 h-20 bg-[#ff3b30]/15 shadow-[0_0_12px_rgba(255,59,48,0.4)] animate-pulse">
                  <div className="absolute -top-5 left-0 bg-[#ff3b30] px-1.5 py-0.5 whitespace-nowrap shadow">
                    <span className="font-mono text-[9px] text-white font-bold tracking-tight">
                      ID: 09 [FALL DETECTED]
                    </span>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <AlertTriangle className="w-8 h-8 text-[#ff3b30]/70" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bottom HUD Row */}
          <div className="flex justify-between items-end">
            <div className="bg-black/75 backdrop-blur-xs px-3 py-1 border border-[#46464a]/80 rounded-xs shadow">
              <span className="font-mono text-xs text-[#c7c6ca]">
                MODEL: <span className="text-white font-semibold">SAGE_V4.2</span> | CONF:{' '}
                <span className="text-emerald-400 font-semibold">98.4%</span>
              </span>
            </div>

            <div className="flex gap-2 pointer-events-auto">
              <button
                onClick={() => setShowOverlays(!showOverlays)}
                className="bg-[#2b2a2a] border border-[#46464a] p-2 hover:bg-[#3a3939] text-[#e5e2e1] transition-colors rounded-xs shadow cursor-pointer"
                title={showOverlays ? 'Hide AI Overlays' : 'Show AI Overlays'}
              >
                <Eye className={`w-3.5 h-3.5 ${showOverlays ? 'text-emerald-400' : 'text-[#919094]'}`} />
              </button>

              <button
                onClick={toggleFullscreen}
                className="bg-[#2b2a2a] border border-[#46464a] p-2 hover:bg-[#3a3939] text-[#e5e2e1] transition-colors rounded-xs shadow cursor-pointer"
                title="Toggle Fullscreen"
              >
                {isFullscreen ? (
                  <Minimize2 className="w-3.5 h-3.5" />
                ) : (
                  <Maximize2 className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Scrubber Component */}
      <TimelineScrubber alerts={alerts} />
    </div>
  )
}
