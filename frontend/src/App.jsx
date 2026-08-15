import React, { useState } from 'react'
import LiveFeed from './components/LiveFeed'
import { Shield, Sparkles } from 'lucide-react'

export default function App() {
  const [mockMode, setMockMode] = useState(true)

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e5e5e5] flex flex-col p-4">
      {/* Top Header */}
      <header className="flex items-center justify-between border-b border-[#2a2a2a] pb-3 mb-4">
        <div className="flex items-center gap-2.5">
          <Shield className="w-5 h-5 text-emerald-400" />
          <h1 className="text-base font-bold tracking-wide uppercase text-[#e5e5e5]">
            Campus Safety Intelligence
          </h1>
          <span className="text-xs px-2 py-0.5 rounded bg-[#1a1a1a] text-[#888888] font-mono border border-[#2a2a2a]">
            Phase 1
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setMockMode(!mockMode)}
            className={`text-xs px-3 py-1 rounded font-mono transition-colors border ${
              mockMode
                ? 'bg-amber-950/60 text-amber-300 border-amber-500/40 hover:bg-amber-900/60'
                : 'bg-[#141414] text-[#888888] border-[#2a2a2a] hover:text-[#e5e5e5]'
            }`}
          >
            {mockMode ? 'Mock Feed: ON' : 'Mock Feed: OFF (Live WS)'}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center max-w-4xl w-full mx-auto">
        <div className="w-full aspect-video">
          <LiveFeed isMockMode={mockMode} />
        </div>
      </main>
    </div>
  )
}
