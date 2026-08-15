import React from 'react'
import { X, ShieldAlert, Download } from 'lucide-react'

export default function SnapshotModal({ snapshotSrc, onClose }) {
  if (!snapshotSrc) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 select-none animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative bg-panel border border-hairline rounded shadow-2xl max-w-3xl w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-panel-high border-b border-hairline">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-text-secondary" />
            <span className="font-display text-xs font-bold text-text-primary uppercase tracking-wide">
              Evidence Snapshot Frame // High-Resolution Capture
            </span>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={snapshotSrc}
              download="sage_evidence_snapshot.jpg"
              className="p-1 text-text-secondary hover:text-text-primary hover:bg-panel-highest rounded transition-colors"
              title="Download Snapshot"
            >
              <Download className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="p-1 text-text-secondary hover:text-text-primary hover:bg-panel-highest rounded transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Image Body */}
        <div className="p-3 bg-recessed flex items-center justify-center">
          <img
            src={snapshotSrc}
            alt="Evidence Frame Detailed Inspection"
            className="max-h-[75vh] w-auto object-contain rounded border border-hairline"
          />
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-2 bg-panel border-t border-hairline flex justify-between items-center text-[11px] text-text-secondary">
          <span className="font-mono">INTEGRITY VERIFIED // SHA-256 LOGGED</span>
          <span className="font-sans text-text-primary">SAGE Surveillance Vision Suite</span>
        </div>
      </div>
    </div>
  )
}
