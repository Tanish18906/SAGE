import React, { useState } from 'react'
import {
  AlertOctagon,
  Clock,
  UserCheck,
  Maximize2,
  Check,
  Send,
} from 'lucide-react'

// Calculate human elapsed relative time (e.g. "JUST NOW", "-2m 14s")
function formatElapsedTime(isoTimestamp) {
  if (!isoTimestamp) return 'JUST NOW'
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(isoTimestamp).getTime()) / 1000))
  if (diffSec < 20) return 'JUST NOW'
  if (diffSec < 60) return `-${diffSec}s`
  const minutes = Math.floor(diffSec / 60)
  const remSec = diffSec % 60
  if (minutes < 60) return `-${minutes}m ${remSec}s`
  const hours = Math.floor(minutes / 60)
  return `-${hours}h ${minutes % 60}m`
}

export default function AlertCard({
  alert,
  onOpenSnapshot,
  apiBaseUrl = 'http://localhost:8000',
}) {
  const [acknowledged, setAcknowledged] = useState(false)
  const [dispatched, setDispatched] = useState(false)

  const isFall = alert.alert_type === 'fall'
  const isAfterHours = alert.alert_type === 'after_hours'

  // Snapshot URL resolution
  let snapshotSrc = null
  if (alert.snapshot_url) {
    if (alert.snapshot_url.startsWith('http') || alert.snapshot_url.startsWith('data:')) {
      snapshotSrc = alert.snapshot_url
    } else {
      snapshotSrc = `${apiBaseUrl}${alert.snapshot_url}`
    }
  }

  // Formatting display time
  const elapsed = formatElapsedTime(alert.timestamp)

  if (isFall) {
    return (
      <div className="bg-[#141313] border border-[#ffb4ab]/80 relative pl-1 overflow-hidden group shadow-lg transition-all">
        {/* Left Solid Red Bar */}
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#ff3b30]" />

        <div className="p-3">
          {/* Card Top Row: Badge + ID + Elapsed time */}
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
              <div className="bg-[#ff3b30]/15 text-[#ffb4ab] px-1.5 py-0.5 border border-[#ff3b30]/40 flex items-center gap-1 rounded-xs">
                <AlertOctagon className="w-3 h-3 text-[#ff3b30]" />
                <span className="font-mono text-[9px] font-bold tracking-wider">CRITICAL</span>
              </div>
              <span className="font-mono text-[10px] text-[#c7c6ca]">
                ID: {String(alert.tracked_id || '09').padStart(2, '0')}
              </span>
            </div>

            <span className="font-mono text-[10px] text-[#ff3b30] font-bold animate-pulse">
              {elapsed}
            </span>
          </div>

          {/* Headline Narration */}
          <h3 className="font-sans font-semibold text-[13px] leading-snug text-[#e5e2e1] mb-2">
            {alert.narration || 'Fall detected near isolated pathway — subject immobilized.'}
          </h3>

          {/* Thumbnail + Details + Action Buttons */}
          <div className="flex gap-3 mt-2.5 items-start">
            {snapshotSrc && (
              <div
                onClick={() => onOpenSnapshot && onOpenSnapshot(snapshotSrc)}
                className="w-20 h-14 bg-[#353434] border border-[#46464a] shrink-0 relative overflow-hidden rounded-xs cursor-pointer group/thumb"
                title="Click to enlarge evidence frame"
              >
                <img
                  src={snapshotSrc}
                  alt="Evidence snapshot"
                  className="w-full h-full object-cover grayscale contrast-125 group-hover/thumb:scale-105 transition-transform"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity">
                  <Maximize2 className="w-3.5 h-3.5 text-white" />
                </div>
              </div>
            )}

            <div className="flex flex-col justify-between flex-1 min-h-[56px]">
              <span className="font-sans text-[11px] text-[#c7c6ca] leading-snug">
                {alert.zone_id
                  ? `Zone: ${alert.zone_id} | High-velocity downward vector.`
                  : 'Zone: North_Pathway_01 | Rapid vertical posture collapse.'}
              </span>

              {/* Action Buttons: DISPATCH & ACKNOWLEDGE */}
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setDispatched(true)}
                  disabled={dispatched}
                  className={`font-mono font-bold text-[10px] px-2.5 py-0.5 rounded-xs transition-colors uppercase tracking-wider flex items-center gap-1 cursor-pointer ${
                    dispatched
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[#ff3b30] text-white hover:bg-red-600'
                  }`}
                >
                  {dispatched ? (
                    <>
                      <Check className="w-2.5 h-2.5" /> DISPATCHED
                    </>
                  ) : (
                    <>
                      <Send className="w-2.5 h-2.5" /> DISPATCH
                    </>
                  )}
                </button>

                <button
                  onClick={() => setAcknowledged(true)}
                  disabled={acknowledged}
                  className={`border border-[#46464a] font-mono text-[10px] px-2.5 py-0.5 rounded-xs transition-colors uppercase tracking-wider cursor-pointer ${
                    acknowledged
                      ? 'text-emerald-400 border-emerald-500/50'
                      : 'text-[#c7c6ca] hover:text-white hover:border-[#919094]'
                  }`}
                >
                  {acknowledged ? 'ACKNOWLEDGED' : 'ACKNOWLEDGE'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Warning Cards (After-Hours / Loitering)
  const Icon = isAfterHours ? Clock : UserCheck

  return (
    <div className="bg-[#141313] border border-yellow-600/40 hover:border-yellow-500/70 relative pl-1 overflow-hidden group transition-all shadow-sm">
      {/* Left Amber Bar */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-600" />

      <div className="p-3">
        {/* Card Top: Badge + ID + Elapsed Time */}
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2">
            <div className="bg-yellow-600/15 text-yellow-500 px-1.5 py-0.5 border border-yellow-600/30 flex items-center gap-1 rounded-xs">
              <Icon className="w-3 h-3 text-yellow-500" />
              <span className="font-mono text-[9px] font-bold tracking-wider">WARNING</span>
            </div>
            <span className="font-mono text-[10px] text-[#c7c6ca]">
              ID: {String(alert.tracked_id || (isAfterHours ? '04' : '12')).padStart(2, '0')}
            </span>
          </div>

          <span className="font-mono text-[10px] text-[#c7c6ca]">{elapsed}</span>
        </div>

        {/* Headline Narration */}
        <h3 className="font-sans font-semibold text-[13px] leading-snug text-[#e5e2e1] mb-1.5">
          {alert.narration ||
            (isAfterHours
              ? 'Person detected inside hostel gate zone after hours'
              : 'Person loitering in restricted pathway beyond threshold')}
        </h3>

        {/* Thumbnail Preview & Subtitle */}
        <div className="flex gap-2.5 items-center">
          {snapshotSrc && (
            <div
              onClick={() => onOpenSnapshot && onOpenSnapshot(snapshotSrc)}
              className="w-14 h-10 bg-[#353434] border border-[#46464a] shrink-0 relative overflow-hidden rounded-xs cursor-pointer group/thumb"
            >
              <img
                src={snapshotSrc}
                alt="Evidence thumbnail"
                className="w-full h-full object-cover grayscale opacity-90 group-hover/thumb:scale-105 transition-transform"
              />
            </div>
          )}

          <span className="font-sans text-[11px] text-[#c7c6ca] leading-snug block flex-1">
            {alert.zone_id
              ? `Zone: ${alert.zone_id} | Security threshold exceeded.`
              : isAfterHours
              ? 'Unauthorized access attempt in Zone: South_Gate_B.'
              : 'Dwell time >5m in Zone: East_Corridor_02.'}
          </span>
        </div>
      </div>
    </div>
  )
}
