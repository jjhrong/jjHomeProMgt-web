import React, { useState } from 'react'
import { FogOverlay } from './FogOverlay'
import { useMapTransition } from '../hooks/useMapTransition'

interface MapLayoutProps {
  currentMapName?: string
  children?: React.ReactNode
}

export const MapLayout: React.FC<MapLayoutProps> = ({
  currentMapName = '首頁',
  children,
}) => {
  const { fogState, switchMap } = useMapTransition()
  const [activeMap, setActiveMap] = useState<string>(currentMapName)

  // Demo handler to switch maps with cloud fog animation
  const handleSwitchMap = (targetMapName: string) => {
    switchMap(async () => {
      // Simulate data fetching under fog cover (0.3s delay)
      await new Promise((resolve) => setTimeout(resolve, 300))
      setActiveMap(targetMapName)
    })
  }

  return (
    <div style={{ position: 'relative', width: '100%', minHeight: '620px' }}>
      {/* Fullscreen Cloud Fog Transition Overlay */}
      <FogOverlay fogState={fogState} cloudMaskUrl="/mask_cloud.webp" />

      {/* Map Control Bar Example */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '16px',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: '0.9rem', color: '#a1b5aa', fontWeight: 600 }}>
          當前地圖: {activeMap}
        </span>
        <button
          className="btn btn-primary"
          onClick={() => handleSwitchMap('東區生態公園')}
          style={{ padding: '6px 14px', fontSize: '0.82rem' }}
        >
          轉場切換至：東區生態公園
        </button>
        <button
          className="btn btn-outline"
          onClick={() => handleSwitchMap('首頁')}
          style={{ padding: '6px 14px', fontSize: '0.82rem' }}
        >
          返回首頁
        </button>
      </div>

      {/* Map Content Container */}
      <div style={{ position: 'relative' }}>{children}</div>
    </div>
  )
}
