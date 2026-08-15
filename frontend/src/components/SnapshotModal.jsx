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
        className="relative bg-[#141313] border border-[#46464a] rounded shadow-2xl max-w-3xl w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#201f1f] border-b border-[#46464a]">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span className="font-mono text-xs font-bold text-[#e5e2e1] uppercase tracking-wide">
              Evidence Snapshot Frame // High-Resolution Capture
            </span>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={snapshotSrc}
              download="sage_evidence_snapshot.jpg"
              className="p-1 text-[#c7c6ca] hover:text-white hover:bg-[#353434] rounded transition-colors"
              title="Download Snapshot"
            >
              <Download className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="p-1 text-[#c7c6ca] hover:text-white hover:bg-[#353434] rounded transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Image Body */}
        <div className="p-3 bg-black flex items-center justify-center">
          <img
            src={snapshotSrc}
            alt="Evidence Frame Detailed Inspection"
            className="max-h-[75vh] w-auto object-contain rounded border border-[#353434]"
          />
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-2 bg-[#1c1b1b] border-t border-[#353434] flex justify-between items-center text-[11px] font-mono text-[#919094]">
          <span>INTEGRITY VERIFIED // SHA-256 LOGGED</span>
          <span className="text-[#e5e2e1]">SAGE Surveillance Vision Suite</span>
        </div>
      </div>
    </div>
  )
}
