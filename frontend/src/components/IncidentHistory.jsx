import React, { useState, useEffect, useCallback } from 'react'
import {
  History,
  RefreshCw,
  Filter,
  Clock,
  UserCheck,
  AlertOctagon,
  FileText,
  CheckCircle2,
} from 'lucide-react'
import SnapshotModal from './SnapshotModal'

export default function IncidentHistory({
  apiBaseUrl = 'http://localhost:8000',
  localAlerts = [],
}) {
  const [historyAlerts, setHistoryAlerts] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [selectedSnapshot, setSelectedSnapshot] = useState(null)

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`${apiBaseUrl}/api/alerts`)
      if (res.ok) {
        const data = await res.json()
        setHistoryAlerts(Array.isArray(data) ? data : [])
      } else {
        setHistoryAlerts(localAlerts)
      }
    } catch {
      setHistoryAlerts(localAlerts)
    } finally {
      setLoading(false)
    }
  }, [apiBaseUrl, localAlerts])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  const filteredList = historyAlerts.filter((a) => {
    if (selectedFilter === 'all') return true
    return a.alert_type === selectedFilter
  })

  return (
    <div className="bg-[#1c1b1b] border border-[#46464a] rounded p-5 flex flex-col gap-4 text-[#e5e2e1] shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#46464a] pb-3">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-[#c8c6c7]" />
          <h2 className="text-sm font-mono font-bold tracking-wide uppercase">
            Incident History Audit Log // SQLite Storage
          </h2>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#353434] text-[#c7c6ca] border border-[#46464a]">
            {filteredList.length} Records
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Filter dropdown */}
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <Filter className="w-3.5 h-3.5 text-[#919094]" />
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
              className="bg-[#141313] border border-[#46464a] text-[#e5e2e1] rounded px-2 py-1 text-xs outline-none cursor-pointer"
            >
              <option value="all">All Incident Types</option>
              <option value="after_hours">After-Hours Curfew</option>
              <option value="loitering">Loitering Threshold</option>
              <option value="fall">Fall / Distress (Critical)</option>
            </select>
          </div>

          <button
            onClick={fetchHistory}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1 bg-[#2b2a2a] hover:bg-[#353434] border border-[#46464a] rounded text-xs font-mono transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* History Table */}
      <div className="overflow-x-auto border border-[#353434] rounded">
        {filteredList.length === 0 ? (
          <div className="text-center py-14 text-[#919094] font-mono text-xs">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
            No incidents recorded in database. System active.
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#201f1f] border-b border-[#46464a] text-[#c7c6ca] font-mono text-[11px] uppercase">
                <th className="py-2.5 px-3">Evidence</th>
                <th className="py-2.5 px-3">Severity & Type</th>
                <th className="py-2.5 px-3">AI Narration</th>
                <th className="py-2.5 px-3">Zone / Target</th>
                <th className="py-2.5 px-3">Timestamp (UTC)</th>
                <th className="py-2.5 px-3 text-right">Confirmation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2b2a2a] bg-[#141313]">
              {filteredList.map((item) => {
                const isFall = item.alert_type === 'fall'
                const isAfterHours = item.alert_type === 'after_hours'

                let snapshotSrc = null
                if (item.snapshot_url) {
                  if (item.snapshot_url.startsWith('http') || item.snapshot_url.startsWith('data:')) {
                    snapshotSrc = item.snapshot_url
                  } else {
                    snapshotSrc = `${apiBaseUrl}${item.snapshot_url}`
                  }
                }

                return (
                  <tr key={item.id} className="hover:bg-[#1c1b1b] transition-colors">
                    {/* Snapshot Thumbnail */}
                    <td className="py-2 px-3">
                      {snapshotSrc ? (
                        <div
                          onClick={() => setSelectedSnapshot(snapshotSrc)}
                          className="w-12 h-9 bg-black border border-[#46464a] rounded-xs overflow-hidden cursor-pointer group"
                        >
                          <img
                            src={snapshotSrc}
                            alt="Incident thumb"
                            className="w-full h-full object-cover grayscale group-hover:scale-110 transition-transform"
                          />
                        </div>
                      ) : (
                        <span className="text-[#919094] font-mono text-[10px]">NO_IMG</span>
                      )}
                    </td>

                    {/* Alert Type */}
                    <td className="py-2 px-3">
                      {isFall ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs text-[10px] font-mono font-bold bg-[#ff3b30]/15 text-[#ffb4ab] border border-[#ff3b30]/40">
                          <AlertOctagon className="w-3 h-3 text-[#ff3b30]" />
                          CRITICAL // FALL
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs text-[10px] font-mono font-semibold bg-yellow-600/15 text-yellow-500 border border-yellow-600/30">
                          {isAfterHours ? (
                            <Clock className="w-3 h-3 text-yellow-500" />
                          ) : (
                            <UserCheck className="w-3 h-3 text-yellow-500" />
                          )}
                          WARNING // {isAfterHours ? 'AFTER_HOURS' : 'LOITERING'}
                        </span>
                      )}
                    </td>

                    {/* AI Narration */}
                    <td className="py-2 px-3 font-sans text-xs text-[#e5e2e1] max-w-sm">
                      {item.narration || 'Verified incident logged.'}
                    </td>

                    {/* Zone & Target ID */}
                    <td className="py-2 px-3 font-mono text-[11px] text-[#c7c6ca]">
                      <div>
                        Zone:{' '}
                        <span className="text-amber-400 font-semibold">
                          {item.zone_id || 'Global (Fall)'}
                        </span>
                      </div>
                      <div className="text-[10px] text-[#919094]">
                        Tracked ID: #{item.tracked_id ?? 'N/A'}
                      </div>
                    </td>

                    {/* Timestamp */}
                    <td className="py-2 px-3 font-mono text-[11px] text-[#c7c6ca]">
                      {item.timestamp ? new Date(item.timestamp).toLocaleString() : '--'}
                    </td>

                    {/* Confirmation Status */}
                    <td className="py-2 px-3 text-right">
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" /> CONFIRMED
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Snapshot Preview Modal */}
      {selectedSnapshot && (
        <SnapshotModal
          snapshotSrc={selectedSnapshot}
          onClose={() => setSelectedSnapshot(null)}
        />
      )}
    </div>
  )
}
