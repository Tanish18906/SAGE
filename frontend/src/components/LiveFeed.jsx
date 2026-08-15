import React, { useState, useEffect, useRef } from 'react'
import { Video, VideoOff, Wifi, WifiOff, AlertTriangle } from 'lucide-react'

// 1x1 grey PNG base64 fallback or test frame canvas generator
function generateTestFrame() {
  const canvas = document.createElement('canvas')
  canvas.width = 640
  canvas.height = 360
  const ctx = canvas.getContext('2d')
  if (ctx) {
    // Dark console background
    ctx.fillStyle = '#121212'
    ctx.fillRect(0, 0, 640, 360)
    
    // Grid pattern
    ctx.strokeStyle = '#222222'
    ctx.lineWidth = 1
    for (let x = 0; x < 640; x += 40) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, 360)
      ctx.stroke()
    }
    for (let y = 0; y < 360; y += 40) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(640, y)
      ctx.stroke()
    }

    // Mock camera readout
    ctx.fillStyle = '#00ff88'
    ctx.font = '14px monospace'
    ctx.fillText('CAM-01 [CAMPUS_ZONE_A] - TEST PATTERN', 20, 30)
    ctx.fillStyle = '#888888'
    ctx.fillText(new Date().toISOString(), 20, 50)

    // Mock tracked target box
    ctx.strokeStyle = '#f59e0b'
    ctx.lineWidth = 2
    ctx.strokeRect(260, 100, 120, 200)
    ctx.fillStyle = '#f59e0b'
    ctx.fillRect(260, 80, 80, 20)
    ctx.fillStyle = '#000000'
    ctx.font = 'bold 11px monospace'
    ctx.fillText('ID: 07 [HUMAN]', 265, 94)
  }
  return canvas.toDataURL('image/jpeg').replace(/^data:image\/jpeg;base64,/, '')
}

export default function LiveFeed({
  wsUrl = 'ws://localhost:8000/ws/stream',
  onFrameUpdate = null,
  onAlertReceived = null,
  isMockMode = false,
}) {
  const [currentFrame, setCurrentFrame] = useState(null)
  const [timestamp, setTimestamp] = useState(null)
  const [detections, setDetections] = useState([])
  const [connectionStatus, setConnectionStatus] = useState('connecting') // 'connected' | 'connecting' | 'disconnected' | 'camera_disconnected'
  const wsRef = useRef(null)
  const reconnectTimeoutRef = useRef(null)
  const mockIntervalRef = useRef(null)

  // Real WebSocket stream connection
  useEffect(() => {
    if (isMockMode) {
      setConnectionStatus('connected')
      const mockBase64 = generateTestFrame()
      const mockMsg = {
        type: 'frame',
        timestamp: new Date().toISOString(),
        image_base64: mockBase64,
        detections: [{ tracked_id: 7, box: { x: 260, y: 100, width: 120, height: 200 } }],
      }
      setCurrentFrame(mockMsg.image_base64)
      setTimestamp(mockMsg.timestamp)
      setDetections(mockMsg.detections)
      if (onFrameUpdate) onFrameUpdate(mockMsg)

      mockIntervalRef.current = setInterval(() => {
        const frameData = generateTestFrame()
        const updateMsg = {
          type: 'frame',
          timestamp: new Date().toISOString(),
          image_base64: frameData,
          detections: [{ tracked_id: 7, box: { x: 260, y: 100, width: 120, height: 200 } }],
        }
        setCurrentFrame(updateMsg.image_base64)
        setTimestamp(updateMsg.timestamp)
        if (onFrameUpdate) onFrameUpdate(updateMsg)
      }, 1000)

      return () => {
        if (mockIntervalRef.current) clearInterval(mockIntervalRef.current)
      }
    }

    let isMounted = true

    function connect() {
      setConnectionStatus('connecting')
      try {
        const ws = new WebSocket(wsUrl)
        wsRef.current = ws

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
              setTimestamp(data.timestamp || new Date().toISOString())
              setDetections(data.detections || [])
              if (onFrameUpdate) onFrameUpdate(data)
            } else if (data.type === 'alert') {
              if (onAlertReceived) onAlertReceived(data)
            } else if (data.type === 'status') {
              if (data.state) {
                setConnectionStatus(data.state)
              }
            }
          } catch (err) {
            console.error('Failed to parse WebSocket message:', err)
          }
        }

        ws.onerror = (err) => {
          if (!isMounted) return
          console.warn('WebSocket stream error:', err)
        }

        ws.onclose = () => {
          if (!isMounted) return
          setConnectionStatus('disconnected')
          // Auto-reconnect every 3s
          reconnectTimeoutRef.current = setTimeout(connect, 3000)
        }
      } catch (e) {
        if (!isMounted) return
        setConnectionStatus('disconnected')
        reconnectTimeoutRef.current = setTimeout(connect, 3000)
      }
    }

    connect()

    return () => {
      isMounted = false
      if (wsRef.current) {
        wsRef.current.close()
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [wsUrl, isMockMode, onFrameUpdate, onAlertReceived])

  const imageSrc = currentFrame
    ? (currentFrame.startsWith('data:') ? currentFrame : `data:image/jpeg;base64,${currentFrame}`)
    : null

  return (
    <div className="relative w-full h-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg overflow-hidden flex flex-col items-center justify-center select-none shadow-2xl">
      {/* Top Status Overlay Bar */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-2 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-2">
          {connectionStatus === 'connected' ? (
            <span className="flex items-center gap-2 px-2 py-0.5 rounded text-xs font-mono font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              LIVE
            </span>
          ) : connectionStatus === 'camera_disconnected' ? (
            <span className="flex items-center gap-2 px-2 py-0.5 rounded text-xs font-mono font-semibold bg-amber-950/80 text-amber-400 border border-amber-500/30">
              <AlertTriangle className="w-3.5 h-3.5" />
              CAMERA DISCONNECTED
            </span>
          ) : connectionStatus === 'connecting' ? (
            <span className="flex items-center gap-2 px-2 py-0.5 rounded text-xs font-mono font-semibold bg-yellow-950/80 text-yellow-400 border border-yellow-500/30">
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-ping" />
              CONNECTING...
            </span>
          ) : (
            <span className="flex items-center gap-2 px-2 py-0.5 rounded text-xs font-mono font-semibold bg-red-950/80 text-red-400 border border-red-500/30">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              OFFLINE
            </span>
          )}

          <span className="text-xs font-mono text-[#888888]">
            {isMockMode ? '[MOCK STREAM]' : 'CAM-01'}
          </span>
        </div>

        {/* Timestamp Readout */}
        <div className="text-xs font-mono text-[#888888] tracking-tight">
          {timestamp ? new Date(timestamp).toLocaleTimeString() : '--:--:--'}
        </div>
      </div>

      {/* Video Content Display */}
      {imageSrc && connectionStatus !== 'camera_disconnected' ? (
        <div className="relative w-full h-full flex items-center justify-center bg-black">
          <img
            src={imageSrc}
            alt="Live Stream Feed"
            className="w-full h-full object-contain pointer-events-none"
          />

          {/* Detections Counter Badge */}
          {detections.length > 0 && (
            <div className="absolute bottom-3 left-3 z-10 px-2 py-1 bg-black/70 border border-[#2a2a2a] rounded text-[11px] font-mono text-[#888888]">
              Tracked Objects: <span className="text-white font-semibold">{detections.length}</span>
            </div>
          )}
        </div>
      ) : (
        /* Standby / Disconnected State */
        <div className="flex flex-col items-center justify-center p-8 text-center">
          {connectionStatus === 'camera_disconnected' ? (
            <>
              <VideoOff className="w-12 h-12 text-amber-400/80 mb-3 animate-pulse" />
              <p className="text-sm font-semibold text-amber-300 font-mono">Camera Feed Lost</p>
              <p className="text-xs text-[#888888] mt-1 max-w-xs">
                Check DroidCam phone connection and ensure client is streaming.
              </p>
            </>
          ) : (
            <>
              <WifiOff className="w-12 h-12 text-[#444444] mb-3" />
              <p className="text-sm font-semibold text-[#e5e5e5] font-mono">Waiting for Video Stream</p>
              <p className="text-xs text-[#888888] mt-1 max-w-xs">
                Connecting to <code className="text-neutral-400">{wsUrl}</code>
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
