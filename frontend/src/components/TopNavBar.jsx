import React, { useState, useEffect } from 'react'
import {
  Video,
  Clock,
  Radio,
  AlertTriangle,
} from 'lucide-react'

export default function TopNavBar({
  connectionStatus = 'connected',
  isMockMode = true,
  onToggleMockMode = () => {},
  activeCamera = 'CAMERA 01',
}) {
  const [utcTime, setUtcTime] = useState('')

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const hours = String(now.getUTCHours()).padStart(2, '0')
      const minutes = String(now.getUTCMinutes()).padStart(2, '0')
      const seconds = String(now.getUTCSeconds()).padStart(2, '0')
      setUtcTime(`${hours}:${minutes}:${seconds} UTC`)
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <header className="flex justify-between items-center h-14 px-6 w-full fixed top-0 left-0 right-0 z-50 bg-panel border-b border-hairline select-none shadow-md backdrop-blur">
      {/* Left: SAGE Brand & Title */}
      <div className="flex items-center gap-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-[20px] font-display font-bold tracking-tight text-text-primary leading-none">
              SAGE
            </span>
            <span className="text-[10px] font-sans font-medium px-1.5 py-0.5 rounded bg-transparent text-text-secondary border border-hairline-bright">
              v1.0
            </span>
          </div>
          <span className="text-[9px] font-bold text-text-secondary uppercase tracking-widest mt-0.5">
            Smart AI-based Guardian for Emergencies
          </span>
        </div>
      </div>

      {/* Center / Right: Live System Status, UTC Clock, Camera HUD, Controls */}
      <div className="flex items-center gap-4 sm:gap-6 text-xs font-mono">
        {/* Connection / Live Status Indicator */}
        <div className="flex items-center gap-2">
          {connectionStatus === 'connected' ? (
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-text-tertiary" />
              <span className="text-text-secondary font-semibold tracking-wide text-[11px]">
                SYSTEM LIVE
              </span>
            </div>
          ) : connectionStatus === 'camera_disconnected' ? (
            <div className="flex items-center gap-2 text-red">
              <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />
              <span className="text-red font-semibold text-[11px]">CAMERA LOST</span>
            </div>
          ) : connectionStatus === 'connecting' ? (
            <div className="flex items-center gap-2 text-amber">
              <div className="w-2 h-2 rounded-full bg-amber animate-ping" />
              <span className="text-amber font-semibold text-[11px]">CONNECTING</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-red">
              <div className="w-2 h-2 rounded-full bg-red" />
              <span className="text-red font-semibold text-[11px]">OFFLINE</span>
            </div>
          )}
        </div>

        <div className="h-4 w-px bg-hairline" />

        {/* Live UTC Clock */}
        <div className="flex items-center gap-1.5 text-text-secondary">
          <Clock className="w-3.5 h-3.5 text-text-tertiary" />
          <span className="tracking-tight text-[11px] font-medium">{utcTime || '--:--:-- UTC'}</span>
        </div>

        <div className="h-4 w-px bg-hairline" />

        {/* Active Camera Readout — the transport (Edge WS) is implementation detail,
            folded in as a quiet suffix rather than its own loud bordered pill */}
        <div className="flex items-center gap-1.5 text-text-primary">
          <Video className="w-3.5 h-3.5 text-text-secondary" />
          <span className="text-[11px] font-semibold">{activeCamera}</span>
          <span className="flex items-center gap-1 text-telemetry text-text-tertiary">
            <Radio className="w-2.5 h-2.5" />
            EDGE WS
          </span>
        </div>
      </div>
    </header>
  )
}
