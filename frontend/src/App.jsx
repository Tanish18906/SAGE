import React, { useState, useCallback } from 'react'
import TopNavBar from './components/TopNavBar'
import LiveFeed from './components/LiveFeed'
import AlertFeed from './components/AlertFeed'
import ZoneEditor from './components/ZoneEditor'
import IncidentHistory from './components/IncidentHistory'
import BottomNavBar from './components/BottomNavBar'

// Generate sample snapshot for mock alerts
function generateMockSnapshotBase64(alertType) {
  const canvas = document.createElement('canvas')
  canvas.width = 320
  canvas.height = 180
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.fillStyle = '#141313'
    ctx.fillRect(0, 0, 320, 180)

    // Security camera background grid
    ctx.strokeStyle = '#222222'
    ctx.lineWidth = 1
    for (let x = 0; x < 320; x += 20) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, 180)
      ctx.stroke()
    }

    // Target bbox
    ctx.strokeStyle = alertType === 'fall' ? '#ff3b30' : '#f59e0b'
    ctx.lineWidth = 2
    ctx.strokeRect(90, 40, 140, 100)

    // Evidence HUD
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 10px "JetBrains Mono", monospace'
    ctx.fillText(`EVIDENCE SNAPSHOT [${alertType.toUpperCase()}]`, 12, 20)

    ctx.fillStyle = '#919094'
    ctx.font = '9px "JetBrains Mono", monospace'
    ctx.fillText(new Date().toISOString(), 12, 168)
  }
  return canvas.toDataURL('image/jpeg')
}

// Initial alerts matching the Stitch design reference
const INITIAL_STITCH_ALERTS = [
  {
    id: 'alert_fall_09',
    alert_type: 'fall',
    zone_id: 'North_Pathway_01',
    tracked_id: 9,
    timestamp: new Date().toISOString(),
    snapshot_url: generateMockSnapshotBase64('fall'),
    narration: 'Fall detected near isolated pathway — subject immobilized for >15s.',
    confirmed: true,
  },
  {
    id: 'alert_afterhours_04',
    alert_type: 'after_hours',
    zone_id: 'South_Gate_B',
    tracked_id: 4,
    timestamp: new Date(Date.now() - 134000).toISOString(),
    snapshot_url: generateMockSnapshotBase64('after_hours'),
    narration: 'Person detected inside hostel gate zone after hours.',
    confirmed: true,
  },
  {
    id: 'alert_loitering_12',
    alert_type: 'loitering',
    zone_id: 'East_Corridor_02',
    tracked_id: 12,
    timestamp: new Date(Date.now() - 903000).toISOString(),
    snapshot_url: generateMockSnapshotBase64('loitering'),
    narration: 'Person loitering in restricted pathway beyond safety dwell threshold.',
    confirmed: true,
  },
]

export default function App() {
  const [mockMode, setMockMode] = useState(true)
  const [activeTab, setActiveTab] = useState('live') // 'live' | 'zones' | 'history'
  const [lastFrameBase64, setLastFrameBase64] = useState(null)
  const [alerts, setAlerts] = useState(INITIAL_STITCH_ALERTS)

  const handleFrameUpdate = useCallback((frameData) => {
    if (frameData && frameData.image_base64) {
      setLastFrameBase64(frameData.image_base64)
    }
  }, [])

  const handleAlertReceived = useCallback((alertMsg) => {
    setAlerts((prev) => [alertMsg, ...prev])
  }, [])

  const handleSimulateTestAlert = () => {
    const alertTypes = ['fall', 'after_hours', 'loitering']
    const chosenType = alertTypes[alerts.length % alertTypes.length]
    const sampleId = `alert_${Math.random().toString(36).substring(2, 8)}`

    const mockAlert = {
      type: 'alert',
      id: sampleId,
      alert_type: chosenType,
      zone_id:
        chosenType === 'fall'
          ? 'North_Pathway_01'
          : chosenType === 'after_hours'
          ? 'South_Gate_B'
          : 'East_Corridor_02',
      tracked_id: Math.floor(Math.random() * 15) + 1,
      timestamp: new Date().toISOString(),
      snapshot_url: generateMockSnapshotBase64(chosenType),
      narration:
        chosenType === 'fall'
          ? 'Sudden posture collapse detected in isolated sector — potential medical emergency.'
          : chosenType === 'after_hours'
          ? 'Person detected near the hostel perimeter after 9:00 PM curfew.'
          : 'Person remaining stationary in restricted transit corridor exceeding threshold.',
      confirmed: true,
    }

    setAlerts((prev) => [mockAlert, ...prev])
  }

  const handleClearAlerts = () => {
    setAlerts([])
  }

  return (
    <div className="h-screen w-screen bg-[#141313] text-[#e5e2e1] flex flex-col font-sans overflow-hidden select-none">
      {/* Fixed Top Navigation Bar */}
      <TopNavBar
        connectionStatus="connected"
        isMockMode={mockMode}
        onToggleMockMode={() => setMockMode(!mockMode)}
        activeCamera="CAMERA 01"
      />

      {/* Main Viewport Content Area */}
      <main className="flex-1 flex mt-14 mb-12 h-[calc(100vh-3.5rem-3rem)] overflow-hidden">
        {activeTab === 'live' && (
          <div className="flex-1 flex w-full h-full overflow-hidden">
            {/* Left 70%: Video Viewport Section */}
            <section className="w-[70%] h-full relative bg-black flex flex-col p-3.5 overflow-hidden">
              <LiveFeed
                isMockMode={mockMode}
                onFrameUpdate={handleFrameUpdate}
                onAlertReceived={handleAlertReceived}
                activeZone="NORTH_PATHWAY_01"
                alerts={alerts}
              />
            </section>

            {/* Right 30%: Alert Feed Panel */}
            <section className="w-[30%] h-full overflow-hidden flex flex-col">
              <AlertFeed
                alerts={alerts}
                onClear={handleClearAlerts}
                onSimulateTestAlert={handleSimulateTestAlert}
                apiBaseUrl="http://localhost:8000"
              />
            </section>
          </div>
        )}

        {activeTab === 'zones' && (
          <div className="flex-1 p-4 overflow-y-auto max-w-[1600px] w-full mx-auto">
            <ZoneEditor
              currentFrameBase64={lastFrameBase64}
              apiBaseUrl="http://localhost:8000"
            />
          </div>
        )}

        {activeTab === 'history' && (
          <div className="flex-1 p-4 overflow-y-auto max-w-[1600px] w-full mx-auto">
            <IncidentHistory
              apiBaseUrl="http://localhost:8000"
              localAlerts={alerts}
            />
          </div>
        )}
      </main>

      {/* Fixed Bottom Navigation Console Bar */}
      <BottomNavBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        alertsCount={alerts.length}
      />
    </div>
  )
}
