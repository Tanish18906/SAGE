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
    <header className="flex justify-between items-center h-14 px-6 w-full fixed top-0 left-0 right-0 z-50 bg-[#201f1f] border-b border-[#46464a]/60 select-none shadow-md backdrop-blur">
      {/* Left: SAGE Brand & Title */}
      <div className="flex items-center gap-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-[20px] font-black tracking-tighter text-[#e5e2e1] leading-none">
              SAGE
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#353434] text-[#c7c6ca] border border-[#46464a]">
              v1.0
            </span>
          </div>
          <span className="text-[9px] font-bold text-[#c7c6ca] uppercase tracking-widest mt-0.5">
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
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.7)]" />
              <span className="text-emerald-400 font-semibold tracking-wide text-[11px]">
                SYSTEM LIVE
              </span>
            </div>
          ) : connectionStatus === 'camera_disconnected' ? (
            <div className="flex items-center gap-2 text-amber-400">
              <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />
              <span className="text-amber-400 font-semibold text-[11px]">CAMERA LOST</span>
            </div>
          ) : connectionStatus === 'connecting' ? (
            <div className="flex items-center gap-2 text-yellow-400">
              <div className="w-2 h-2 rounded-full bg-yellow-400 animate-ping" />
              <span className="text-yellow-400 font-semibold text-[11px]">CONNECTING</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-red-400">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-red-400 font-semibold text-[11px]">OFFLINE</span>
            </div>
          )}
        </div>

        <div className="h-4 w-px bg-[#46464a]" />

        {/* Live UTC Clock */}
        <div className="flex items-center gap-1.5 text-[#c7c6ca]">
          <Clock className="w-3.5 h-3.5 text-[#919094]" />
          <span className="tracking-tight text-[11px] font-medium">{utcTime || '--:--:-- UTC'}</span>
        </div>

        <div className="h-4 w-px bg-[#46464a]" />

        {/* Active Camera Readout */}
        <div className="flex items-center gap-1.5 text-[#e5e2e1]">
          <Video className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[11px] font-semibold">{activeCamera}</span>
        </div>

        <div className="h-4 w-px bg-[#46464a]" />

        {/* Live Stream Telemetry Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono bg-[#2b2a2a] text-emerald-400 border border-emerald-500/30">
          <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
          <span>EDGE WS STREAM</span>
        </div>
      </div>
    </header>
  )
}
