import React, { useState } from 'react'
import { BellRing, Trash2, Sparkles, ShieldCheck } from 'lucide-react'
import AlertCard from './AlertCard'
import SnapshotModal from './SnapshotModal'

export default function AlertFeed({
  alerts = [],
  onClear = null,
  onSimulateTestAlert = null,
  apiBaseUrl = 'http://localhost:8000',
}) {
  const [selectedSnapshot, setSelectedSnapshot] = useState(null)

  return (
    <aside className="w-full h-full bg-[#1c1b1b] border-l border-[#46464a]/80 flex flex-col select-none rounded-r shadow-2xl">
      {/* Feed Header */}
      <div className="h-12 border-b border-[#46464a]/80 flex justify-between items-center px-4 shrink-0 bg-[#201f1f]">
        <div className="flex items-center gap-2">
          <BellRing className="w-4 h-4 text-[#e5e2e1]" />
          <h2 className="font-mono text-xs font-bold tracking-wider text-[#e5e2e1] uppercase">
            LIVE ALERTS
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Active Alert Counter Badge */}
          <span className="font-mono text-[10px] font-semibold bg-[#353434] text-[#c7c6ca] px-2 py-0.5 rounded-xs border border-[#46464a]/50">
            {alerts.length} ACTIVE
          </span>

          {/* Clear Feed Button */}
          {alerts.length > 0 && onClear && (
            <button
              onClick={onClear}
              className="p-1 hover:bg-[#353434] text-[#919094] hover:text-red-400 rounded-xs transition-colors cursor-pointer"
              title="Clear active incident stream"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Alert Feed Body */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {alerts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#919094]">
            <ShieldCheck className="w-10 h-10 mb-2 opacity-40 text-emerald-400" />
            <p className="text-xs font-mono uppercase tracking-wider text-[#e5e2e1]">
              Area Secure // No Violations
            </p>
            <p className="text-[11px] text-[#919094] mt-1 max-w-xs font-mono">
              Live AI vision pipeline is actively processing tracking vectors and zone boundaries.
            </p>
          </div>
        ) : (
          alerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onOpenSnapshot={(src) => setSelectedSnapshot(src)}
              apiBaseUrl={apiBaseUrl}
            />
          ))
        )}
      </div>

      {/* Evidence Snapshot Preview Modal */}
      {selectedSnapshot && (
        <SnapshotModal
          snapshotSrc={selectedSnapshot}
          onClose={() => setSelectedSnapshot(null)}
        />
      )}
    </aside>
  )
}
