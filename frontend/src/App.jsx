import React, { useState } from 'react'
import LiveFeed from './components/LiveFeed'
import ZoneEditor from './components/ZoneEditor'
import { Shield, Video, MapPin } from 'lucide-react'

export default function App() {
  const [mockMode, setMockMode] = useState(true)
  const [activeTab, setActiveTab] = useState('feed') // 'feed' | 'zones'
  const [lastFrameBase64, setLastFrameBase64] = useState(null)

  const handleFrameUpdate = (frameData) => {
    if (frameData && frameData.image_base64) {
      setLastFrameBase64(frameData.image_base64)
    }
  }

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

        {/* Tab switcher + Mock feed toggle */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-[#141414] border border-[#2a2a2a] rounded p-0.5 text-xs">
            <button
              onClick={() => setActiveTab('feed')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors ${
                activeTab === 'feed'
                  ? 'bg-[#222222] text-[#e5e5e5] font-semibold'
                  : 'text-[#888888] hover:text-[#e5e5e5]'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              Live Console
            </button>
            <button
              onClick={() => setActiveTab('zones')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors ${
                activeTab === 'zones'
                  ? 'bg-amber-500 text-black font-semibold'
                  : 'text-[#888888] hover:text-[#e5e5e5]'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              Zone Editor
            </button>
          </div>

          <button
            onClick={() => setMockMode(!mockMode)}
            className={`text-xs px-3 py-1 rounded font-mono transition-colors border ${
              mockMode
                ? 'bg-amber-950/60 text-amber-300 border-amber-500/40 hover:bg-amber-900/60'
                : 'bg-[#141414] text-[#888888] border-[#2a2a2a] hover:text-[#e5e5e5]'
            }`}
          >
            {mockMode ? 'Mock: ON' : 'Mock: OFF (Live WS)'}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-start max-w-5xl w-full mx-auto gap-4">
        {activeTab === 'feed' ? (
          <div className="w-full aspect-video max-w-4xl">
            <LiveFeed
              isMockMode={mockMode}
              onFrameUpdate={handleFrameUpdate}
            />
          </div>
        ) : (
          <div className="w-full">
            <ZoneEditor
              currentFrameBase64={lastFrameBase64}
              apiBaseUrl="http://localhost:8000"
            />
          </div>
        )}
      </main>
    </div>
  )
}
