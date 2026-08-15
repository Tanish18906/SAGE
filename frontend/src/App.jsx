import React, { useState } from 'react'
import LiveFeed from './components/LiveFeed'
import AlertFeed from './components/AlertFeed'
import ZoneEditor from './components/ZoneEditor'
import IncidentHistory from './components/IncidentHistory'
import {
  Shield,
  Video,
  MapPin,
  History,
  Activity,
  Sparkles,
} from 'lucide-react'

// Generate sample snapshot for mock alerts
function generateMockSnapshotBase64(alertType) {
  const canvas = document.createElement('canvas')
  canvas.width = 320
  canvas.height = 180
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.fillStyle = '#141414'
    ctx.fillRect(0, 0, 320, 180)
    ctx.strokeStyle = alertType === 'fall' ? '#ef4444' : '#f59e0b'
    ctx.lineWidth = 2
    ctx.strokeRect(90, 40, 140, 100)
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 11px monospace'
    ctx.fillText(`EVIDENCE SNAPSHOT [${alertType.toUpperCase()}]`, 12, 22)
    ctx.fillStyle = '#888888'
    ctx.font = '10px monospace'
    ctx.fillText(new Date().toISOString(), 12, 165)
  }
  return canvas.toDataURL('image/jpeg')
}

export default function App() {
  const [mockMode, setMockMode] = useState(true)
  const [activeTab, setActiveTab] = useState('live') // 'live' | 'zones' | 'history'
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
      tracked_id: Math.floor(Math.random() * 15) + 1,
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
    <div className="min-h-screen bg-[#0a0a0a] text-[#e5e5e5] flex flex-col font-sans">
      {/* Top Header Bar */}
      <header className="h-14 bg-[#111111] border-b border-[#242424] px-5 flex items-center justify-between shrink-0 shadow-lg select-none">
        {/* Brand / Title */}
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-emerald-950/80 border border-emerald-500/40 rounded text-emerald-400">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xs font-extrabold tracking-wider uppercase text-[#f0f0f0]">
                Campus Safety Intelligence
              </h1>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#1e1e1e] text-[#888888] font-mono border border-[#333]">
                v1.0
              </span>
            </div>
            <p className="text-[10px] text-[#777777] font-mono -mt-0.5">
              AI Early-Warning Video Surveillance Layer
            </p>
          </div>
        </div>

        {/* Center / Right Toolbar */}
        <div className="flex items-center gap-3">
          {/* Active Navigation Tabs */}
          <div className="flex items-center bg-[#181818] border border-[#2c2c2c] rounded-md p-0.5 text-xs font-medium">
            <button
              onClick={() => setActiveTab('live')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded transition-all ${
                activeTab === 'live'
                  ? 'bg-[#282828] text-white shadow-sm font-semibold'
                  : 'text-[#888888] hover:text-[#cccccc]'
              }`}
            >
              <Video className="w-3.5 h-3.5 text-emerald-400" />
              Live Console
            </button>
            <button
              onClick={() => setActiveTab('zones')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded transition-all ${
                activeTab === 'zones'
                  ? 'bg-amber-500 text-black shadow-sm font-semibold'
                  : 'text-[#888888] hover:text-[#cccccc]'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              Zone Calibration
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded transition-all ${
                activeTab === 'history'
                  ? 'bg-cyan-500 text-black shadow-sm font-semibold'
                  : 'text-[#888888] hover:text-[#cccccc]'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              Incident History
            </button>
          </div>

          {/* Mock Mode Switcher */}
          <button
            onClick={() => setMockMode(!mockMode)}
            className={`text-xs px-2.5 py-1 rounded font-mono transition-colors border ${
              mockMode
                ? 'bg-amber-950/60 text-amber-300 border-amber-500/40 hover:bg-amber-900/60'
                : 'bg-[#181818] text-[#888888] border-[#2c2c2c] hover:text-[#cccccc]'
            }`}
            title="Toggle between browser mock feed and live WebSocket connection"
          >
            {mockMode ? 'Mock Feed: ON' : 'Mock: OFF (Live WS)'}
          </button>
        </div>
      </header>

      {/* Main Screen Content Body */}
      <main className="flex-1 p-4 max-w-[1600px] w-full mx-auto flex flex-col">
        {activeTab === 'live' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 items-stretch">
            {/* Primary Video Feed: 68% Width (8 cols) */}
            <div className="lg:col-span-8 flex flex-col min-h-[500px]">
              <LiveFeed
                isMockMode={mockMode}
                onFrameUpdate={handleFrameUpdate}
                onAlertReceived={handleAlertReceived}
              />
            </div>

            {/* Real-time Alert Feed: 32% Width (4 cols) */}
            <div className="lg:col-span-4 flex flex-col min-h-[500px]">
              <AlertFeed
                alerts={alerts}
                onClear={handleClearAlerts}
                onSimulateTestAlert={handleSimulateTestAlert}
              />
            </div>
          </div>
        )}

        {activeTab === 'zones' && (
          <div className="flex-1">
            <ZoneEditor
              currentFrameBase64={lastFrameBase64}
              apiBaseUrl="http://localhost:8000"
            />
          </div>
        )}

        {activeTab === 'history' && (
          <div className="flex-1">
            <IncidentHistory
              apiBaseUrl="http://localhost:8000"
              localAlerts={alerts}
            />
          </div>
        )}
      </main>

      {/* Bottom Status Ribbon */}
      <footer className="h-8 bg-[#0d0d0d] border-t border-[#1e1e1e] px-5 flex items-center justify-between text-[11px] font-mono text-[#777777] shrink-0">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Backend Protocol: <span className="text-[#aaaaaa]">CONTRACT.md v1.0</span>
          </span>
          <span>&bull;</span>
          <span>
            Active Alerts: <span className="text-amber-400 font-semibold">{alerts.length}</span>
          </span>
        </div>

        <div className="flex items-center gap-3 text-[#666666]">
          <span>FastAPI + OpenCV + YOLOv8 + DeepSORT + GPT-4o</span>
        </div>
      </footer>
    </div>
  )
}
