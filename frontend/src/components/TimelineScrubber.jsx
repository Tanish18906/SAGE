import React from 'react'

export default function TimelineScrubber({ alerts = [] }) {
  return (
    <div className="mt-3 h-11 bg-[#1c1b1b] border border-[#46464a]/70 rounded px-4 flex items-center relative select-none shadow-inner">
      {/* Background Track */}
      <div className="w-full h-1.5 bg-[#353434] rounded-full relative overflow-visible">
        {/* Filled active track (past 80%) */}
        <div className="absolute left-0 top-0 h-full w-[82%] bg-[#919094] rounded-l-full" />

        {/* Dynamic Incident Markers based on alerts */}
        {alerts.slice(0, 5).map((alert, idx) => {
          // Space out markers realistically across the timeline
          const positions = [22, 45, 62, 74, 80]
          const pos = positions[idx] || 50
          const isCritical = alert.alert_type === 'fall'

          return (
            <div
              key={alert.id || idx}
              title={`Incident #${alert.tracked_id || idx + 1}: ${alert.alert_type}`}
              className={`absolute top-1/2 -translate-y-1/2 w-2 h-4 rounded-xs cursor-pointer transition-transform hover:scale-125 z-10 ${
                isCritical
                  ? 'bg-[#ff3b30] shadow-[0_0_8px_rgba(255,59,48,0.8)] animate-pulse'
                  : 'bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.6)]'
              }`}
              style={{ left: `${pos}%` }}
            />
          )
        })}

        {/* Fallback Static Reference Markers if empty */}
        {alerts.length === 0 && (
          <>
            <div
              className="absolute left-[25%] top-1/2 -translate-y-1/2 w-2 h-3.5 bg-amber-400/80 rounded-xs"
              title="Loitering Warning (-15m)"
            />
            <div
              className="absolute left-[65%] top-1/2 -translate-y-1/2 w-2 h-3.5 bg-amber-400/80 rounded-xs"
              title="After-Hours Warning (-5m)"
            />
            <div
              className="absolute left-[78%] top-1/2 -translate-y-1/2 w-2 h-4 bg-[#ff3b30] animate-pulse rounded-xs shadow-[0_0_8px_rgba(255,59,48,0.7)]"
              title="Critical Fall Detected"
            />
          </>
        )}

        {/* Live Playhead Needle */}
        <div className="absolute left-[82%] top-1/2 -translate-y-1/2 w-1.5 h-6 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.9)] z-20" />
      </div>

      {/* "LIVE" Marker Badge floating on playhead */}
      <div className="absolute -top-3.5 left-[82%] -translate-x-1/2 bg-[#2b2a2a] border border-[#46464a] px-1.5 py-0.2 rounded text-[9px] font-mono font-bold text-[#e5e2e1] shadow">
        LIVE
      </div>
    </div>
  )
}
