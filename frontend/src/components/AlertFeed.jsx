import React, { useState } from 'react'
import {
  Bell,
  Clock,
  UserCheck,
  AlertOctagon,
  ShieldAlert,
  Maximize2,
  X,
  Trash2,
  Sparkles,
} from 'lucide-react'

// Configuration for alert types per UI_DESIGN.md
const ALERT_CONFIG = {
  after_hours: {
    label: 'After-Hours Presence',
    icon: Clock,
    badgeBg: 'bg-amber-950/80',
    badgeText: 'text-amber-400',
    badgeBorder: 'border-amber-500/40',
    borderAccent: 'border-l-amber-500',
    cardBg: 'bg-[#141414]',
  },
  loitering: {
    label: 'Loitering Detected',
    icon: UserCheck,
    badgeBg: 'bg-amber-950/80',
    badgeText: 'text-amber-400',
    badgeBorder: 'border-amber-500/40',
    borderAccent: 'border-l-amber-500',
    cardBg: 'bg-[#141414]',
  },
  fall: {
    label: 'Sudden Fall / Distress',
    icon: AlertOctagon,
    badgeBg: 'bg-red-950/90',
    badgeText: 'text-red-400',
    badgeBorder: 'border-red-500/50',
    borderAccent: 'border-l-red-500',
    cardBg: 'bg-red-950/20',
    urgent: true,
  },
}

export default function AlertFeed({
  alerts = [],
  onClear = null,
  onSimulateTestAlert = null,
  apiBaseUrl = 'http://localhost:8000',
}) {
  const [selectedSnapshot, setSelectedSnapshot] = useState(null)

  return (
    <div className="bg-[#121212] border border-[#2a2a2a] rounded-lg p-4 flex flex-col h-full shadow-2xl text-[#e5e5e5]">
      {/* Feed Header */}
      <div className="flex items-center justify-between border-b border-[#2a2a2a] pb-3 mb-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-amber-400" />
          <h2 className="text-sm font-bold tracking-wide uppercase">Real-Time Incident Feed</h2>
          <span className="px-2 py-0.5 rounded-full text-xs font-mono font-semibold bg-[#1a1a1a] text-amber-300 border border-[#333]">
            {alerts.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onSimulateTestAlert && (
            <button
              onClick={onSimulateTestAlert}
              className="flex items-center gap-1 px-2.5 py-1 bg-[#1a1a1a] hover:bg-[#222222] border border-amber-500/30 text-amber-300 hover:text-amber-200 rounded text-xs font-mono transition-colors"
              title="Inject fake alert matching CONTRACT.md"
            >
              <Sparkles className="w-3 h-3" />
              + Test Alert
            </button>
          )}

          {alerts.length > 0 && onClear && (
            <button
              onClick={onClear}
              className="p-1 hover:bg-[#222] text-[#888888] hover:text-red-400 rounded transition-colors"
              title="Clear Feed"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Alert List Container */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1 min-h-[320px]">
        {alerts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#666666]">
            <Bell className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-xs font-mono uppercase tracking-wider">No Active Incidents</p>
            <p className="text-[11px] text-[#555555] mt-1 max-w-xs">
              System monitoring live camera stream. Alerts will animate in automatically upon rule confirmation.
            </p>
          </div>
        ) : (
          alerts.map((alert) => {
            const config = ALERT_CONFIG[alert.alert_type] || ALERT_CONFIG.after_hours
            const Icon = config.icon
            const isUrgent = config.urgent

            // Resolve snapshot URL (handle relative / base64)
            let snapshotSrc = null
            if (alert.snapshot_url) {
              if (alert.snapshot_url.startsWith('http') || alert.snapshot_url.startsWith('data:')) {
                snapshotSrc = alert.snapshot_url
              } else {
                snapshotSrc = `${apiBaseUrl}${alert.snapshot_url}`
              }
            }

            return (
              <div
                key={alert.id}
                className={`border border-[#2a2a2a] ${config.cardBg} border-l-4 ${
                  config.borderAccent
                } rounded-r-lg p-3.5 flex flex-col gap-2.5 transition-all duration-300 shadow-md ${
                  isUrgent ? 'ring-1 ring-red-500/40 animate-pulse' : ''
                }`}
              >
                {/* Card Top: Type Badge + Timestamp */}
                <div className="flex items-center justify-between">
                  <span
                    className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-semibold border ${config.badgeBg} ${config.badgeText} ${config.badgeBorder}`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {config.label}
                  </span>

                  <span className="text-[11px] font-mono text-[#888888]">
                    {alert.timestamp ? new Date(alert.timestamp).toLocaleTimeString() : '--:--'}
                  </span>
                </div>

                {/* Card Middle: Snapshot Thumbnail + Narration */}
                <div className="flex gap-3 items-start">
                  {snapshotSrc && (
                    <div
                      onClick={() => setSelectedSnapshot(snapshotSrc)}
                      className="relative group cursor-pointer w-20 h-16 rounded overflow-hidden border border-[#333333] bg-black shrink-0"
                    >
                      <img
                        src={snapshotSrc}
                        alt="Evidence frame"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Maximize2 className="w-3.5 h-3.5 text-white" />
                      </div>
                    </div>
                  )}

                  {/* AI Narration Sentence */}
                  <div className="flex-1">
                    <p className="text-xs text-[#e5e5e5] leading-relaxed font-sans">
                      {alert.narration || 'Suspicious incident detected and verified.'}
                    </p>
                  </div>
                </div>

                {/* Card Bottom: Metadata Row */}
                <div className="flex items-center justify-between pt-2 border-t border-[#222222] text-[11px] font-mono text-[#888888]">
                  <div className="flex items-center gap-2">
                    <span>
                      Tracked ID:{' '}
                      <span className="text-[#cccccc] font-semibold">
                        #{alert.tracked_id ?? 'N/A'}
                      </span>
                    </span>
                    {alert.zone_id && (
                      <>
                        <span>&bull;</span>
                        <span>
                          Zone:{' '}
                          <span className="text-amber-400/90 font-medium">{alert.zone_id}</span>
                        </span>
                      </>
                    )}
                  </div>

                  <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">
                    Confirmed
                  </span>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Snapshot Preview Modal */}
      {selectedSnapshot && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
          onClick={() => setSelectedSnapshot(null)}
        >
          <div
            className="relative bg-[#141414] border border-[#333] rounded-lg max-w-2xl w-full p-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-2 border-b border-[#2a2a2a] mb-2 text-xs font-mono text-[#888888]">
              <span>Evidence Snapshot Frame</span>
              <button
                onClick={() => setSelectedSnapshot(null)}
                className="p-1 hover:bg-[#2a2a2a] rounded text-[#e5e5e5]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img
              src={selectedSnapshot}
              alt="Snapshot enlarged"
              className="w-full h-auto max-h-[75vh] object-contain rounded"
            />
          </div>
        </div>
      )}
    </div>
  )
}
