import React, { useState, useEffect, useRef } from 'react'
import {
  Maximize2,
  Minimize2,
  AlertTriangle,
  WifiOff,
  VideoOff,
  Eye,
} from 'lucide-react'


export default function LiveFeed({
  wsUrl = 'ws://localhost:8000/ws/stream',
  onFrameUpdate = null,
  onAlertReceived = null,
  onConnectionChange = null,
  alerts = [],
}) {
  const [currentFrame, setCurrentFrame] = useState(null)
  const [connectionStatus, setConnectionStatus] = useState('connecting')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showOverlays, setShowOverlays] = useState(true)
  const [detectionsCount, setDetectionsCount] = useState(0)

  const containerRef = useRef(null)
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
                setDetectionsCount(data.detections.length)
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
        {/* Render Live Camera Feed Image */}
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
                  Check DroidCam phone connection or camera index in backend configuration.
                </p>
              </>
            ) : (
              <>
                <WifiOff className="w-12 h-12 text-[#919094] mb-3 animate-pulse" />
                <p className="text-sm font-semibold text-[#e5e2e1] font-mono">
                  Connecting to Video Stream
                </p>
                <p className="text-xs text-[#c7c6ca] mt-1 max-w-xs font-mono">
                  Connecting to <code className="text-amber-400">{wsUrl}</code>
                </p>
              </>
            )}
          </div>
        )}

        {/* Fall Emergency Red Pulsing Halo */}
        {hasActiveFall && (
          <div className="absolute inset-0 pointer-events-none border-2 border-red-500/80 shadow-[inset_0_0_40px_rgba(239,68,68,0.4)] animate-pulse" />
        )}

        {/* Telemetry HUD Top Overlay */}
        {showOverlays && (
          <div className="absolute top-0 left-0 right-0 p-3.5 flex justify-between items-start pointer-events-none bg-gradient-to-b from-black/80 via-black/30 to-transparent">
            {/* Live Indicator + Zone */}
            <div className="flex items-center gap-2.5">
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-xs bg-red-600/90 text-white font-mono text-[10px] font-bold tracking-widest uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                LIVE
              </span>
              <span className="font-mono text-xs text-[#e5e2e1] bg-black/60 px-2 py-0.5 rounded-xs border border-white/10 tracking-tight font-medium">
                PRIMARY SENSOR
              </span>
            </div>

            {/* Top Right: Tracked People Count & Timestamp */}
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-2">
                {detectionsCount > 0 && (
                  <span className="font-mono text-[11px] text-emerald-400 bg-black/70 px-2 py-0.5 rounded-xs border border-emerald-500/30 font-semibold">
                    {detectionsCount} TRACKED
                  </span>
                )}
                <span className="font-mono text-xs text-[#c7c6ca] bg-black/60 px-2 py-0.5 rounded-xs border border-white/10">
                  {new Date().toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Controls Overlay Hover Toolbar */}
        <div className="absolute bottom-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 backdrop-blur px-2.5 py-1 rounded-sm border border-[#46464a]">
          <button
            onClick={() => setShowOverlays(!showOverlays)}
            className="p-1 text-[#c7c6ca] hover:text-white transition-colors cursor-pointer"
            title={showOverlays ? 'Hide HUD' : 'Show HUD'}
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-1 text-[#c7c6ca] hover:text-white transition-colors cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  )
}

