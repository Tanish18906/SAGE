import React from 'react'
import { Video, Grid, History } from 'lucide-react'

export default function BottomNavBar({ activeTab, onSelectTab }) {
  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-center items-center h-12 bg-[#353434] border-t border-[#46464a] gap-4 sm:gap-8 px-4 select-none shadow-2xl backdrop-blur">
      {/* Live Monitor Tab */}
      <button
        onClick={() => onSelectTab('live')}
        className={`flex items-center justify-center rounded-lg px-4 py-1.5 cursor-pointer transition-all active:scale-95 ${
          activeTab === 'live'
            ? 'bg-[#c8c6c7] text-[#313031] font-bold shadow-md'
            : 'text-[#c7c6ca] hover:text-[#e5e2e1] hover:bg-[#2b2a2a]'
        }`}
      >
        <Video className="w-4 h-4 mr-2" />
        <span className="font-mono text-xs uppercase tracking-wider">Live Monitor</span>
      </button>

      {/* Zone Calibration Tab */}
      <button
        onClick={() => onSelectTab('zones')}
        className={`flex items-center justify-center rounded-lg px-4 py-1.5 cursor-pointer transition-all active:scale-95 ${
          activeTab === 'zones'
            ? 'bg-[#c8c6c7] text-[#313031] font-bold shadow-md'
            : 'text-[#c7c6ca] hover:text-[#e5e2e1] hover:bg-[#2b2a2a]'
        }`}
      >
        <Grid className="w-4 h-4 mr-2" />
        <span className="font-mono text-xs uppercase tracking-wider">Zone Calibration</span>
      </button>

      {/* Incident History Tab */}
      <button
        onClick={() => onSelectTab('history')}
        className={`flex items-center justify-center rounded-lg px-4 py-1.5 cursor-pointer transition-all active:scale-95 ${
          activeTab === 'history'
            ? 'bg-[#c8c6c7] text-[#313031] font-bold shadow-md'
            : 'text-[#c7c6ca] hover:text-[#e5e2e1] hover:bg-[#2b2a2a]'
        }`}
      >
        <History className="w-4 h-4 mr-2" />
        <span className="font-mono text-xs uppercase tracking-wider">Incident History</span>
      </button>
    </nav>
  )
}
