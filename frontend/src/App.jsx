import React, { useState, useEffect, useCallback } from 'react'
import TopNavBar from './components/TopNavBar'
import LiveFeed from './components/LiveFeed'
import AlertFeed from './components/AlertFeed'
import ZoneEditor from './components/ZoneEditor'
import IncidentHistory from './components/IncidentHistory'
import BottomNavBar from './components/BottomNavBar'

export default function App() {
  const [activeTab, setActiveTab] = useState('live') // 'live' | 'zones' | 'history'
  const [lastFrameBase64, setLastFrameBase64] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [connectionState, setConnectionState] = useState('connected')

  // Fetch past alerts from SQLite database on initial application load
  useEffect(() => {
    let isMounted = true
    async function loadPastAlerts() {
      try {
        const res = await fetch('http://localhost:8000/api/alerts?limit=50')
        if (res.ok && isMounted) {
          const data = await res.json()
          if (Array.isArray(data)) {
            setAlerts(data)
          }
        }
      } catch (err) {
        console.warn('Could not load historical alerts:', err)
      }
    }
    loadPastAlerts()
    return () => {
      isMounted = false
    }
  }, [])

  const handleFrameUpdate = useCallback((frameData) => {
    if (frameData && frameData.image_base64) {
      setLastFrameBase64(frameData.image_base64)
    }
  }, [])

  const handleAlertReceived = useCallback((alertMsg) => {
    setAlerts((prev) => {
      // Prevent duplicate alert entries if already present
      if (prev.some((a) => a.id === alertMsg.id)) {
        return prev
      }
      return [alertMsg, ...prev]
    })
  }, [])

  const handleClearAlerts = () => {
    setAlerts([])
  }

  return (
    <div className="h-screen w-screen bg-[#141313] text-[#e5e2e1] flex flex-col font-sans overflow-hidden select-none">
      {/* Fixed Top Navigation Bar */}
      <TopNavBar
        connectionStatus={connectionState}
        activeCamera="CAMERA 01 (DROIDCAM)"
      />

      {/* Main Viewport Content Area */}
      <main className="flex-1 flex mt-14 mb-12 h-[calc(100vh-3.5rem-3rem)] overflow-hidden">
        {activeTab === 'live' && (
          <div className="flex-1 flex w-full h-full overflow-hidden">
            {/* Left 70%: Video Viewport Section */}
            <section className="w-[70%] h-full relative bg-black flex flex-col p-3.5 overflow-hidden">
              <LiveFeed
                onFrameUpdate={handleFrameUpdate}
                onAlertReceived={handleAlertReceived}
                onConnectionChange={setConnectionState}
                alerts={alerts}
              />
            </section>

            {/* Right 30%: Alert Feed Panel */}
            <section className="w-[30%] h-full overflow-hidden flex flex-col">
              <AlertFeed
                alerts={alerts}
                onClear={handleClearAlerts}
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
