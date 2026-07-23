import React, { useState } from 'react'
import { Building, ShieldAlert } from 'lucide-react'

export interface BuildingSpriteButtonProps {
  mapX: number
  mapY: number
  sheet_id?: string | number
  spriteCol?: number
  spriteRow?: number
  buildingName: string
  buildingData?: any
  hasPermission?: boolean
  tileWidth?: number
  tileHeight?: number
  spriteWidth?: number
  spriteHeight?: number
  onClick?: (e: React.MouseEvent) => void
}

export const BuildingSpriteButton: React.FC<BuildingSpriteButtonProps> = ({
  mapX,
  mapY,
  sheet_id = '1',
  spriteCol = 0,
  spriteRow = 0,
  buildingName,
  hasPermission = true,
  tileWidth: _tileWidth = 96,
  tileHeight: _tileHeight = 48,
  spriteWidth: _spriteWidth = 110,
  spriteHeight: _spriteHeight = 200,
  onClick,
}) => {
  const [isHovered, setIsHovered] = useState(false)
  const [imageError, setImageError] = useState(false)

  // Z-Index calculation for painter's algorithm depth occlusion
  const depthIndex = (mapX + mapY) * 10 + mapX + 5

  // CSS Sprite 10-column mapping definition (Row 0):
  // Col 0 (第 1 張): 泥土 (Dirt)
  // Col 1 (第 2 張): 草地 (Grass)
  // Col 2 (第 3 張): 樹木1 (Tree 1)
  // Col 3 (第 4 張): 樹木2 (Tree 2)
  // Col 4 (第 5 張): 樹木3 (Tree 3)
  // Col 5 (第 6 張): 森林 (Forest)
  // Col 6 (第 7 張): 矮房 (Small House)
  // Col 7 (第 8 張): 別墅 (Villa)
  // Col 8 (第 9 張): 大樓 (Office Building)
  // Col 9 (第 10 張): 摩天大樓 (Skyscraper)

  // 假設單格寬度設定為 100px ( backgroundSize: '1000px auto' )
  // 針對每一列 (Row) 設定 Y 軸往上推的 px 值 (負數) *0.825
  const ROW_Y_OFFSETS: Record<number, number> = {
    9: 0,       // 第 0 列 (自由女神等)
    8: -128,    // 第 1 列 (巴黎聖母院等) 128
    7: -257,    // 第 2 列 129
    6: -380,    // 第 3 列 (藍色高樓) 123
    5: -508,    // 第 4 列 128
    4: -637,    // 第 5 列 129
    3: -797,    // 第 6 列 (杜拜塔、上海明珠塔等超高建築) 160
    2: -940,    // 第 7 列 (台北 101 等) 123
    1: -1068,   // 第 8 列 (巨蛋、工廠) 128
    0: -1224,   // 第 9 列 (矮房 AAA、測試啦啦、樹木) -> 可微調此數字對齊草地 
  };
  // Dynamic sprite image path reading sheet_id from remark (e.g. /buildings_1.webp or /sprites/buildings_1.webp)
  const cleanSheetId = String(sheet_id || '1').replace(/^0+/, '') || '1'
  const spriteImageUrl = `/buildings_${cleanSheetId}.webp`

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'absolute',
        left: '50%',
        bottom: '-16px',
        transform: `translate(-50%, ${isHovered ? '-6px' : '0px'})`,
        transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), filter 0.2s ease',
        zIndex: depthIndex,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        filter: isHovered
          ? hasPermission === false
            ? 'drop-shadow(0 12px 20px rgba(239, 68, 68, 0.45))'
            : 'drop-shadow(0 12px 20px rgba(110, 191, 139, 0.45))'
          : 'none',
      }}
    >
      {/* 3D Pin Card Title Badge */}
      <div
        style={{
          background: isHovered
            ? hasPermission === false
              ? 'linear-gradient(135deg, #e57373 0%, #b71c1c 100%)'
              : 'linear-gradient(135deg, #6ebf8b 0%, #34784e 100%)'
            : hasPermission === false
              ? 'linear-gradient(135deg, #3a1f1f 0%, #221111 100%)'
              : 'linear-gradient(135deg, #1f3a2c 0%, #11221a 100%)',
          color: '#ffffff',
          padding: '4px 10px',
          borderRadius: '10px',
          fontSize: '0.72rem',
          fontWeight: 700,
          boxShadow: isHovered
            ? hasPermission === false
              ? '0 6px 18px rgba(229, 115, 115, 0.5)'
              : '0 6px 18px rgba(110, 191, 139, 0.5)'
            : '0 4px 12px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          whiteSpace: 'nowrap',
          border: hasPermission === false
            ? '1px solid rgba(239, 68, 68, 0.4)'
            : '1px solid rgba(163, 198, 175, 0.3)',
          marginBottom: '4px',
          transition: 'all 0.2s ease',
        }}
      >
        {hasPermission === false ? (
          <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
        ) : (
          <Building className="w-3.5 h-3.5 text-emerald-300" />
        )}
        {buildingName}
      </div>

      {/* Building CSS Sprite Crop Container (Fixed Width, Bottom Aligned Base) */}
      <div
        style={{
          width: '100px',      // 1. 強制鎖定單格寬度 (對應 1000px 的 1/10)
          height: `${(ROW_Y_OFFSETS[spriteRow + 1] - ROW_Y_OFFSETS[spriteRow])}px`,
          backgroundColor: 'transparent',

          bottom: '20px',
          transform: 'scaleY(0.9)',
          transformOrigin: 'bottom center', // 🔥 絕對不能漏掉這行！

          backgroundImage: imageError ? 'none' : `url(${spriteImageUrl})`,
          // 4. 強制給定整張雪碧圖的尺寸 (維持 10 欄寬)
          backgroundSize: '1000px auto',

          // 5. 放棄 bgPositionPercent，直接使用查表字典的絕對像素 px 定位
          backgroundPosition: `-${spriteCol * 100}px ${(ROW_Y_OFFSETS[spriteRow]) || 0}px`,

          backgroundRepeat: 'no-repeat',
          position: 'relative',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          // 移除原本造成錯位的 bottom: '-10px'
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
