import React from 'react'
import { Video, Grid, History } from 'lucide-react'

export default function BottomNavBar({ activeTab, onSelectTab }) {
  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-center items-center h-12 bg-panel border-t border-hairline gap-4 sm:gap-8 px-4 select-none shadow-2xl backdrop-blur">
      {/* Live Monitor Tab */}
      <button
        onClick={() => onSelectTab('live')}
        className={`flex items-center justify-center rounded-lg px-4 py-1.5 cursor-pointer transition-all active:scale-95 ${
          activeTab === 'live'
            ? 'bg-text-primary text-base font-bold shadow-md'
            : 'text-text-secondary hover:text-text-primary hover:bg-panel-highest'
        }`}
      >
        <Video className="w-4 h-4 mr-2" />
        <span className="font-display text-xs font-semibold uppercase tracking-wider">Live Monitor</span>
      </button>

      {/* Zone Calibration Tab */}
      <button
        onClick={() => onSelectTab('zones')}
        className={`flex items-center justify-center rounded-lg px-4 py-1.5 cursor-pointer transition-all active:scale-95 ${
          activeTab === 'zones'
            ? 'bg-text-primary text-base font-bold shadow-md'
            : 'text-text-secondary hover:text-text-primary hover:bg-panel-highest'
        }`}
      >
        <Grid className="w-4 h-4 mr-2" />
        <span className="font-display text-xs font-semibold uppercase tracking-wider">Zone Calibration</span>
      </button>

      {/* Incident History Tab */}
      <button
        onClick={() => onSelectTab('history')}
        className={`flex items-center justify-center rounded-lg px-4 py-1.5 cursor-pointer transition-all active:scale-95 ${
          activeTab === 'history'
            ? 'bg-text-primary text-base font-bold shadow-md'
            : 'text-text-secondary hover:text-text-primary hover:bg-panel-highest'
        }`}
      >
        <History className="w-4 h-4 mr-2" />
        <span className="font-display text-xs font-semibold uppercase tracking-wider">Incident History</span>
      </button>
    </nav>
  )
}
