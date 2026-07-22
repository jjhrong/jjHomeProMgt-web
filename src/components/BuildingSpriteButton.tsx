import React, { useState } from 'react'
import { Building } from 'lucide-react'

export interface BuildingSpriteButtonProps {
  mapX: number
  mapY: number
  sheet_id?: string | number
  spriteCol?: number
  spriteRow?: number
  buildingName: string
  buildingData?: any
  tileWidth?: number
  tileHeight?: number
  spriteWidth?: number
  spriteHeight?: number
  onClick?: (e: React.MouseEvent) => void
}

export const BuildingSpriteButton: React.FC<BuildingSpriteButtonProps> = ({
  mapX,
  mapY,
  sheet_id = '01',
  spriteCol = 0,
  spriteRow = 0,
  buildingName,
  tileWidth = 96,
  tileHeight = 48,
  spriteWidth = 110,
  spriteHeight = 140,
  onClick,
}) => {
  const [isHovered, setIsHovered] = useState(false)
  const [imageError, setImageError] = useState(false)

  // Z-Index calculation for painter's algorithm depth occlusion
  const depthIndex = (mapX + mapY) * 10 + mapX + 5

  // CSS Sprite background position for 10-column sprite sheet:
  const bgPositionPercentX = (spriteCol / 9) * 100
  // Align Y to 100% so the bottom base of the sprite aligns to the bottom of the container!
  const spriteImageUrl = '/buildings_1.png?v=3'

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'absolute',
        left: '50%',
        bottom: '4px',
        transform: `translate(-50%, ${isHovered ? '-6px' : '0px'})`,
        transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), filter 0.2s ease',
        zIndex: depthIndex,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        filter: isHovered ? 'drop-shadow(0 12px 20px rgba(110, 191, 139, 0.45))' : 'none',
      }}
    >
      {/* 3D Pin Card Title Badge */}
      <div
        style={{
          background: isHovered
            ? 'linear-gradient(135deg, #6ebf8b 0%, #34784e 100%)'
            : 'linear-gradient(135deg, #1f3a2c 0%, #11221a 100%)',
          color: '#ffffff',
          padding: '4px 10px',
          borderRadius: '10px',
          fontSize: '0.72rem',
          fontWeight: 700,
          boxShadow: isHovered
            ? '0 6px 18px rgba(110, 191, 139, 0.5)'
            : '0 4px 12px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          whiteSpace: 'nowrap',
          border: '1px solid rgba(163, 198, 175, 0.3)',
          marginBottom: '4px',
          transition: 'all 0.2s ease',
        }}
      >
        <Building className="w-3 h-3 text-emerald-300" />
        {buildingName}
      </div>

      {/* Building CSS Sprite Crop Container (Fixed Width, Bottom Aligned Base) */}
      <div
        style={{
          width: `${spriteWidth}px`,
          height: `${spriteHeight}px`,
          backgroundImage: imageError ? 'none' : `url(${spriteImageUrl})`,
          backgroundSize: '1000% auto',
          backgroundPosition: `${bgPositionPercentX}% 100%`,
          backgroundRepeat: 'no-repeat',
          position: 'relative',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
        }}
      >
        {/* Fallback procedural 3D building vector graphic if PNG sprite image is not yet loaded */}
        {imageError && (
          <div
            style={{
              width: '46px',
              height: '56px',
              background: 'linear-gradient(135deg, #3e7d48 0%, #1c3e23 100%)',
              borderRadius: '8px',
              border: '2px solid #6ebf8b',
              boxShadow: '0 8px 16px rgba(0, 0, 0, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Building className="w-6 h-6 text-emerald-200" />
          </div>
        )}
        {/* Hidden img element to detect sprite loading failure */}
        <img
          src={spriteImageUrl}
          alt={buildingName}
          onError={() => setImageError(true)}
          style={{ display: 'none' }}
        />
      </div>

      {/* Isometric Building Base Anchor Indicator */}
      <div
        style={{
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          background: isHovered ? '#6ebf8b' : '#3e7d48',
          boxShadow: isHovered ? '0 0 14px #6ebf8b' : '0 0 6px rgba(0, 0, 0, 0.4)',
          marginTop: '-4px',
          transition: 'all 0.2s ease',
        }}
      />
    </div>
  )
}
