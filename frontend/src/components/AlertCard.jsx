import React, { useState } from 'react'
import {
  AlertOctagon,
  Clock,
  UserCheck,
  Timer,
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
  const isLoitering = alert.alert_type === 'loitering'
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

  const elapsed = formatElapsedTime(alert.timestamp)

  // ─── FALL — Critical red card ──────────────────────────────────────────────
  if (isFall) {
    return (
      <div className="bg-panel border border-red/50 relative pl-1 overflow-hidden group shadow-lg transition-all">
        {/* Left Solid Red Bar */}
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-red" />

        <div className="p-3">
          {/* Card Top Row: Badge + ID + Elapsed time */}
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
              <div className="bg-red/15 text-red px-1.5 py-0.5 border border-red/40 flex items-center gap-1 rounded-xs">
                <AlertOctagon className="w-3 h-3 text-red" />
                <span className="font-sans text-[9px] font-bold tracking-wider">CRITICAL</span>
              </div>
              <span className="font-mono text-telemetry text-text-secondary">
                ID: {String(alert.tracked_id || '09').padStart(2, '0')}
              </span>
            </div>

            <span className="font-mono text-telemetry text-red font-bold animate-pulse">
              {elapsed}
            </span>
          </div>

          {/* Headline Narration */}
          <h3 className="font-sans font-semibold text-[13px] leading-snug text-text-primary mb-2">
            {alert.narration || 'Fall detected near isolated pathway — subject immobilized.'}
          </h3>

          {/* Thumbnail + Details + Action Buttons */}
          <div className="flex gap-3 mt-2.5 items-start">
            {snapshotSrc && (
              <div
                onClick={() => onOpenSnapshot && onOpenSnapshot(snapshotSrc)}
                className="w-20 h-14 bg-recessed border border-hairline shrink-0 relative overflow-hidden rounded-xs cursor-pointer group/thumb"
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
              <span className="font-sans text-[11px] text-text-secondary leading-snug">
                {alert.zone_id
                  ? `Zone: ${alert.zone_id} | High-velocity downward vector.`
                  : 'Zone: North_Pathway_01 | Rapid vertical posture collapse.'}
              </span>

              {/* Action Buttons: DISPATCH & ACKNOWLEDGE */}
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setDispatched(true)}
                  disabled={dispatched}
                  className={`font-sans font-bold text-[10px] px-2.5 py-0.5 rounded-xs transition-colors uppercase tracking-wider flex items-center gap-1 cursor-pointer ${
                    dispatched
                      ? 'bg-green text-black'
                      : 'bg-red text-white hover:bg-red/80'
                  }`}
                >
                  {dispatched ? (
                    <><Check className="w-2.5 h-2.5" /> DISPATCHED</>
                  ) : (
                    <><Send className="w-2.5 h-2.5" /> DISPATCH</>
                  )}
                </button>

                <button
                  onClick={() => setAcknowledged(true)}
                  disabled={acknowledged}
                  className={`border border-hairline-bright font-sans font-bold text-[10px] px-2.5 py-0.5 rounded-xs transition-colors uppercase tracking-wider cursor-pointer ${
                    acknowledged
                      ? 'text-green border-green/50'
                      : 'text-text-secondary hover:text-text-primary hover:border-text-tertiary'
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

  // ─── LOITERING — Cyan / teal sustained-presence card ──────────────────────
  if (isLoitering) {
    return (
      <div className="bg-panel border border-cyan/40 hover:border-cyan/70 relative pl-1 overflow-hidden group transition-all shadow-sm">
        {/* Left Cyan Bar */}
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan" />

        <div className="p-3">
          {/* Card Top: Badge + ID + Elapsed Time */}
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
              <div className="bg-cyan/10 text-cyan px-1.5 py-0.5 border border-cyan/30 flex items-center gap-1 rounded-xs">
                <Timer className="w-3 h-3 text-cyan" />
                <span className="font-sans text-[9px] font-bold tracking-wider">LOITERING</span>
              </div>
              <span className="font-mono text-telemetry text-text-secondary">
                ID: {String(alert.tracked_id || '12').padStart(2, '0')}
              </span>
            </div>

            <span className="font-mono text-telemetry text-cyan">{elapsed}</span>
          </div>

          {/* Headline Narration */}
          <h3 className="font-sans font-semibold text-[13px] leading-snug text-text-primary mb-1.5">
            {alert.narration || 'Person loitering in restricted pathway beyond dwell threshold.'}
          </h3>

          {/* Thumbnail Preview & Subtitle */}
          <div className="flex gap-2.5 items-center">
            {snapshotSrc && (
              <div
                onClick={() => onOpenSnapshot && onOpenSnapshot(snapshotSrc)}
                className="w-14 h-10 bg-recessed border border-hairline shrink-0 relative overflow-hidden rounded-xs cursor-pointer group/thumb"
              >
                <img
                  src={snapshotSrc}
                  alt="Evidence thumbnail"
                  className="w-full h-full object-cover grayscale opacity-90 group-hover/thumb:scale-105 transition-transform"
                />
              </div>
            )}

            <span className="font-sans text-[11px] text-text-secondary leading-snug block flex-1">
              {alert.zone_id
                ? `Zone: ${alert.zone_id} | Dwell threshold exceeded.`
                : 'Dwell time > threshold in monitored zone.'}
            </span>
          </div>
        </div>
      </div>
    )
  }

  // ─── AFTER-HOURS — Amber access-violation card ─────────────────────────────
  return (
    <div className="bg-panel border border-amber/40 hover:border-amber/70 relative pl-1 overflow-hidden group transition-all shadow-sm">
      {/* Left Amber Bar */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber" />

      <div className="p-3">
        {/* Card Top: Badge + ID + Elapsed Time */}
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2">
            <div className="bg-amber/15 text-amber px-1.5 py-0.5 border border-amber/30 flex items-center gap-1 rounded-xs">
              <Clock className="w-3 h-3 text-amber" />
              <span className="font-sans text-[9px] font-bold tracking-wider">AFTER-HOURS</span>
            </div>
            <span className="font-mono text-telemetry text-text-secondary">
              ID: {String(alert.tracked_id || '04').padStart(2, '0')}
            </span>
          </div>

          <span className="font-mono text-telemetry text-text-secondary">{elapsed}</span>
        </div>

        {/* Headline Narration */}
        <h3 className="font-sans font-semibold text-[13px] leading-snug text-text-primary mb-1.5">
          {alert.narration || 'Person detected inside hostel gate zone after hours.'}
        </h3>

        {/* Thumbnail Preview & Subtitle */}
        <div className="flex gap-2.5 items-center">
          {snapshotSrc && (
            <div
              onClick={() => onOpenSnapshot && onOpenSnapshot(snapshotSrc)}
              className="w-14 h-10 bg-recessed border border-hairline shrink-0 relative overflow-hidden rounded-xs cursor-pointer group/thumb"
            >
              <img
                src={snapshotSrc}
                alt="Evidence thumbnail"
                className="w-full h-full object-cover grayscale opacity-90 group-hover/thumb:scale-105 transition-transform"
              />
            </div>
          )}

          <span className="font-sans text-[11px] text-text-secondary leading-snug block flex-1">
            {alert.zone_id
              ? `Zone: ${alert.zone_id} | Unauthorized after-hours access.`
              : 'Unauthorized access attempt in restricted zone.'}
          </span>
        </div>
      </div>
    </div>
  )
}

