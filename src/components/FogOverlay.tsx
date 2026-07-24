import React from 'react'

export type FogState = 'hidden' | 'closing' | 'covered' | 'opening'

export interface FogOverlayProps {
  fogState: FogState
  cloudMaskUrl?: string
}

export const FogOverlay: React.FC<FogOverlayProps> = ({
  fogState,
  cloudMaskUrl = '/mask_cloud.webp',
}) => {
  const isHidden = fogState === 'hidden'
  const isClosedOrClosing = fogState === 'closing' || fogState === 'covered'

  // Left cloud translation: 0% when closing/covered, -100% when opening/hidden
  const leftTransform = isClosedOrClosing ? 'translateX(0%)' : 'translateX(-100%)'

  // Right cloud translation: flipped horizontally (scaleX(-1))
  const rightTransform = isClosedOrClosing
    ? 'scaleX(-1) translateX(0%)'
    : 'scaleX(-1) translateX(-100%)'

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        zIndex: 150,
        pointerEvents: fogState === 'covered' ? 'auto' : 'none',
        overflow: 'hidden',
        borderRadius: '24px',
        visibility: isHidden ? 'hidden' : 'visible',
        transition: 'visibility 0.8s ease-in-out',
      }}
    >
      {/* Left Cloud Block with Soft Transparent Mask Edge */}
      <div
        style={
          {
            position: 'absolute',
            top: 0,
            left: 0,
            width: '65%',
            height: '100%',
            background: 'linear-gradient(135deg, rgba(16, 30, 24, 0.98) 0%, rgba(8, 14, 11, 0.99) 100%)',
            WebkitMaskImage: `url(${cloudMaskUrl}), linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 75%, rgba(0,0,0,0) 100%)`,
            maskImage: `url(${cloudMaskUrl}), linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 75%, rgba(0,0,0,0) 100%)`,
            WebkitMaskMode: 'alpha',
            maskMode: 'alpha',
            WebkitMaskSize: 'cover',
            maskSize: 'cover',
            WebkitMaskPosition: 'right center',
            maskPosition: 'right center',
            WebkitMaskRepeat: 'no-repeat',
            maskRepeat: 'no-repeat',
            pointerEvents: 'none',
            transform: leftTransform,
            transition: 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
            filter: 'drop-shadow(10px 0 20px rgba(0, 0, 0, 0.6))',
          } as React.CSSProperties
        }
      />

      {/* Right Cloud Block (Flipped horizontally with Soft Transparent Mask Edge) */}
      <div
        style={
          {
            position: 'absolute',
            top: 0,
            right: 0,
            width: '65%',
            height: '100%',
            background: 'linear-gradient(135deg, rgba(16, 30, 24, 0.98) 0%, rgba(8, 14, 11, 0.99) 100%)',
            WebkitMaskImage: `url(${cloudMaskUrl}), linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 75%, rgba(0,0,0,0) 100%)`,
            maskImage: `url(${cloudMaskUrl}), linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 75%, rgba(0,0,0,0) 100%)`,
            WebkitMaskMode: 'alpha',
            maskMode: 'alpha',
            WebkitMaskSize: 'cover',
            maskSize: 'cover',
            WebkitMaskPosition: 'right center',
            maskPosition: 'right center',
            WebkitMaskRepeat: 'no-repeat',
            maskRepeat: 'no-repeat',
            pointerEvents: 'none',
            transform: rightTransform,
            transformOrigin: 'center center',
            transition: 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
            filter: 'drop-shadow(-10px 0 20px rgba(0, 0, 0, 0.6))',
          } as React.CSSProperties
        }
      />

      {/* Center Atmospheric Fog Filling & Loading Indicator during Full Coverage */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at center, rgba(16, 30, 24, 0.94) 0%, rgba(8, 14, 11, 0.98) 100%)',
          opacity: fogState === 'covered' ? 1 : 0,
          transition: 'opacity 0.4s ease-in-out',
          pointerEvents: 'none',
          borderRadius: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {fogState === 'covered' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                border: '3px solid rgba(110, 191, 139, 0.2)',
                borderTopColor: '#6ebf8b',
                animation: 'spin 1s linear infinite',
              }}
            />
            <div style={{ color: '#e2ece6', fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.05em' }}>
              地圖與建築物載入中...
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
