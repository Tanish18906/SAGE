import React, { useState } from 'react'
import LiveFeed from './components/LiveFeed'
import ZoneEditor from './components/ZoneEditor'
import AlertFeed from './components/AlertFeed'
import { Shield, Video, MapPin, Bell } from 'lucide-react'

// Generate sample snapshot on a canvas
function generateMockSnapshotBase64(alertType) {
  const canvas = document.createElement('canvas')
  canvas.width = 320
  canvas.height = 180
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.fillStyle = '#1e1e1e'
    ctx.fillRect(0, 0, 320, 180)
    ctx.strokeStyle = alertType === 'fall' ? '#ef4444' : '#f59e0b'
    ctx.lineWidth = 2
    ctx.strokeRect(90, 40, 140, 100)
    ctx.fillStyle = '#ffffff'
    ctx.font = '12px monospace'
    ctx.fillText(`SNAPSHOT: ${alertType.toUpperCase()}`, 10, 20)
    ctx.fillStyle = '#888888'
    ctx.font = '10px monospace'
    ctx.fillText(new Date().toISOString(), 10, 165)
  }
  return canvas.toDataURL('image/jpeg')
}

export default function App() {
  const [mockMode, setMockMode] = useState(true)
  const [activeTab, setActiveTab] = useState('feed') // 'feed' | 'zones'
  const [lastFrameBase64, setLastFrameBase64] = useState(null)
  const [alerts, setAlerts] = useState([])

  const handleFrameUpdate = (frameData) => {
    if (frameData && frameData.image_base64) {
      setLastFrameBase64(frameData.image_base64)
    }
  }

  const handleAlertReceived = (alertMsg) => {
    setAlerts((prev) => [alertMsg, ...prev])
  }

  const handleSimulateTestAlert = () => {
    const alertTypes = ['after_hours', 'loitering', 'fall']
    const chosenType = alertTypes[alerts.length % alertTypes.length]
    const sampleId = `alert_${Math.random().toString(36).substring(2, 8)}`

    const mockAlert = {
      type: 'alert',
      id: sampleId,
      alert_type: chosenType,
      zone_id: chosenType === 'fall' ? null : 'hostel_gate',
      tracked_id: Math.floor(Math.random() * 20) + 1,
      timestamp: new Date().toISOString(),
      snapshot_url: generateMockSnapshotBase64(chosenType),
      narration:
        chosenType === 'after_hours'
          ? 'Person detected near the hostel gate for 45s after 9:00 PM — possible unauthorized presence.'
          : chosenType === 'loitering'
          ? 'Person remaining stationary inside sensitive walkway zone for 62s exceeding safety threshold.'
          : 'Sudden high-velocity downward motion followed by sustained low height detected — potential fall injury.',
      confirmed: true,
    }

    setAlerts((prev) => [mockAlert, ...prev])
  }

  const handleClearAlerts = () => {
    setAlerts([])
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e5e5e5] flex flex-col p-4">
      {/* Top Navigation Bar */}
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
      <main className="flex-1 flex flex-col w-full max-w-7xl mx-auto gap-4">
        {activeTab === 'feed' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1">
            {/* Live Feed Panel */}
            <div className="lg:col-span-2 aspect-video lg:aspect-auto h-full min-h-[420px]">
              <LiveFeed
                isMockMode={mockMode}
                onFrameUpdate={handleFrameUpdate}
                onAlertReceived={handleAlertReceived}
              />
            </div>

            {/* Alert Feed Panel */}
            <div className="lg:col-span-1 h-full min-h-[420px]">
              <AlertFeed
                alerts={alerts}
                onClear={handleClearAlerts}
                onSimulateTestAlert={handleSimulateTestAlert}
              />
            </div>
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
