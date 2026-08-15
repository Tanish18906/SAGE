import React, { useState, useEffect } from 'react'
import { History, RefreshCw, Filter, Clock, UserCheck, AlertOctagon, Maximize2, X } from 'lucide-react'

export default function IncidentHistory({
  apiBaseUrl = 'http://localhost:8000',
  localAlerts = [],
}) {
  const [historyAlerts, setHistoryAlerts] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedFilter, setSelectedFilter] = useState('all') // 'all' | 'after_hours' | 'loitering' | 'fall'
  const [selectedSnapshot, setSelectedSnapshot] = useState(null)

  const fetchHistory = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${apiBaseUrl}/api/alerts`)
      if (res.ok) {
        const data = await res.json()
        setHistoryAlerts(Array.isArray(data) ? data : [])
      } else {
        // Use local alerts as fallback if backend history not yet populated
        setHistoryAlerts(localAlerts)
      }
    } catch (e) {
      setHistoryAlerts(localAlerts)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [apiBaseUrl, localAlerts])

  const filteredList = historyAlerts.filter((a) => {
    if (selectedFilter === 'all') return true
    return a.alert_type === selectedFilter
  })

  return (
    <div className="bg-[#121212] border border-[#2a2a2a] rounded-lg p-5 flex flex-col gap-4 text-[#e5e5e5] shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#2a2a2a] pb-3">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-cyan-400" />
          <h2 className="text-sm font-bold tracking-wide uppercase">Incident History Log (SQLite)</h2>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#1a1a1a] text-[#888888] border border-[#333]">
            {filteredList.length} records
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Filter dropdown */}
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <Filter className="w-3.5 h-3.5 text-[#888888]" />
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
              className="bg-[#1a1a1a] border border-[#333] text-[#e5e5e5] rounded px-2 py-1 text-xs outline-none"
            >
              <option value="all">All Alerts</option>
              <option value="after_hours">After-Hours</option>
              <option value="loitering">Loitering</option>
              <option value="fall">Fall / Distress</option>
            </select>
          </div>

          <button
            onClick={fetchHistory}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1 bg-[#1a1a1a] hover:bg-[#222222] border border-[#333] rounded text-xs font-mono transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* History Table / Cards */}
      <div className="overflow-x-auto">
        {filteredList.length === 0 ? (
          <div className="text-center py-12 text-[#666666] font-mono text-xs">
            No incident records stored in database yet.
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse font-sans">
            <thead>
              <tr className="border-b border-[#2a2a2a] text-[#888888] font-mono text-[11px] uppercase">
                <th className="py-2.5 px-3">Snapshot</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Narration</th>
                <th className="py-2.5 px-3">Zone / Target</th>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e1e1e]">
              {filteredList.map((item) => {
                const isFall = item.alert_type === 'fall'
                const isAfterHours = item.alert_type === 'after_hours'
                let snapshotSrc = null
                if (item.snapshot_url) {
                  snapshotSrc = item.snapshot_url.startsWith('http') || item.snapshot_url.startsWith('data:')
                    ? item.snapshot_url
                    : `${apiBaseUrl}${item.snapshot_url}`
                }

                return (
                  <tr key={item.id} className="hover:bg-[#181818] transition-colors">
                    <td className="py-2.5 px-3">
                      {snapshotSrc ? (
                        <div
                          onClick={() => setSelectedSnapshot(snapshotSrc)}
                          className="relative group cursor-pointer w-14 h-10 rounded overflow-hidden border border-[#333] bg-black"
                        >
                          <img src={snapshotSrc} alt="Evidence" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center">
                            <Maximize2 className="w-3 h-3 text-white" />
                          </div>
                        </div>
                      ) : (
                        <div className="w-14 h-10 rounded bg-[#1e1e1e] border border-[#333] flex items-center justify-center text-[9px] text-[#666]">
                          N/A
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-semibold ${
                          isFall
                            ? 'bg-red-950/80 text-red-400 border border-red-500/40'
                            : isAfterHours
                            ? 'bg-amber-950/80 text-amber-400 border border-amber-500/40'
                            : 'bg-orange-950/80 text-orange-400 border border-orange-500/40'
                        }`}
                      >
                        {isFall ? (
                          <AlertOctagon className="w-3 h-3" />
                        ) : isAfterHours ? (
                          <Clock className="w-3 h-3" />
                        ) : (
                          <UserCheck className="w-3 h-3" />
                        )}
                        {item.alert_type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 max-w-md text-[#d5d5d5] leading-snug">
                      {item.narration}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-[#aaaaaa]">
                      <div>{item.zone_id ? `Zone: ${item.zone_id}` : 'Global Zone'}</div>
                      <div className="text-[#666666]">ID: #{item.tracked_id ?? 'N/A'}</div>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-[#888888] whitespace-nowrap">
                      {item.timestamp ? new Date(item.timestamp).toLocaleString() : '--'}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 rounded uppercase font-semibold">
                        Logged
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Snapshot Modal */}
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
