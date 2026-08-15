import React, { useState } from 'react'
import { BellRing, Trash2 } from 'lucide-react'
import AlertCard from './AlertCard'
import SnapshotModal from './SnapshotModal'

// Custom secure mark — corner-bracket frame (same vocabulary as the live tracking
// reticles) around a checkmark, instead of a default icon-library shield glyph
function SecureMark({ className = '' }) {
  return (
    <svg
      viewBox="0 0 40 40"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M2 10 V2 H10" />
      <path d="M30 2 H38 V10" />
      <path d="M38 30 V38 H30" />
      <path d="M10 38 H2 V30" />
      <path d="M13 21 L18 26 L27 15" strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  )
}

export default function AlertFeed({
  alerts = [],
  onClear = null,
  apiBaseUrl = 'http://localhost:8000',
}) {
  const [selectedSnapshot, setSelectedSnapshot] = useState(null)

  return (
    <aside className="w-full h-full bg-panel border-l border-hairline flex flex-col select-none rounded-r shadow-2xl">
      {/* Feed Header */}
      <div className="h-12 border-b border-hairline flex justify-between items-center px-4 shrink-0 bg-panel-high">
        <div className="flex items-center gap-2">
          <BellRing className="w-4 h-4 text-text-primary" />
          <h2 className="font-display text-xs font-bold tracking-wider text-text-primary uppercase">
            LIVE ALERTS
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Active Alert Counter Badge */}
          <span className="font-mono text-[10px] font-semibold text-text-secondary px-2 py-0.5 rounded-xs border border-hairline-bright">
            {alerts.length} ACTIVE
          </span>

          {/* Clear Feed Button */}
          {alerts.length > 0 && onClear && (
            <button
              onClick={onClear}
              className="p-1 hover:bg-panel-highest text-text-tertiary hover:text-red rounded-xs transition-colors cursor-pointer"
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
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-text-tertiary">
            <SecureMark className="w-10 h-10 mb-2 opacity-70 text-green" />
            <p className="text-xs font-display font-semibold uppercase tracking-wider text-text-primary">
              Area Secure // No Violations
            </p>
            <p className="text-[11px] text-text-secondary mt-1 max-w-xs font-sans">
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
