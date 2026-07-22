import React, { useState, useEffect, useRef, useMemo } from 'react'
import axios from 'axios'
import { Compass, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, ShieldAlert, ZoomIn, ZoomOut } from 'lucide-react'
import { BuildingSpriteButton } from './BuildingSpriteButton'
import { FogOverlay } from './FogOverlay'
import type { FogState } from './FogOverlay'

interface SubFunction {
  id: string
  pId?: string
  name: string
  orderSn: number
  type: string
  description: string
  status: any
}

interface HomeFunction {
  id: string
  name: string
  description: string
  type: string
  width?: number
  height?: number
  subFunctions: SubFunction[]
}

interface IsometricMapProps {
  homeFunction: HomeFunction
  token: string | null
  apiBaseUrl: string
  onNavigate: (path: string) => void
}

interface TileCoord {
  gridX: number
  gridY: number
  isoX: number
  isoY: number
  isBoundary: boolean
  boundaryDir?: 'N' | 'S' | 'E' | 'W'
  building?: SubFunction
  isDirt?: boolean
}

// Converts orderSN into relative offset (dx, dy) from center (0,0) via square spiral
function orderSNToRelativeCoord(orderSN: number): { dx: number; dy: number } {
  if (orderSN <= 0) return { dx: 0, dy: 0 }

  let layer = 1
  while ((2 * layer + 1) * (2 * layer + 1) - 1 < orderSN) {
    layer++
  }

  const prevMax = (2 * (layer - 1) + 1) * (2 * (layer - 1) + 1) - 1
  const idxInLayer = orderSN - (prevMax + 1)
  const sideLength = 2 * layer

  const side = Math.floor(idxInLayer / sideLength)
  const offset = idxInLayer % sideLength

  let dx = 0
  let dy = 0

  if (side === 0) {
    dx = layer
    dy = -layer + 1 + offset
  } else if (side === 1) {
    dx = layer - 1 - offset
    dy = layer
  } else if (side === 2) {
    dx = -layer
    dy = layer - 1 - offset
  } else {
    dx = -layer + 1 + offset
    dy = -layer
  }

  return { dx, dy }
}

// Module-level cache to remember map pan positions across component remounts and feature transitions
const panCache = new Map<string, { x: number; y: number }>()

// Sprite column selection for first row (Row 0):
// Col 0: 泥土 | Col 1: 草地1 | Col 2: 草地2 | Col 3: 樹木1 | Col 4: 樹木2 | Col 5: 森林 | Col 6: 矮房 | Col 7: 別墅 | Col 8: 大樓 | Col 9: 摩天大樓
const getBuildingSpriteCol = (orderSn: number, name: string = ''): number => {
  const lower = name.toLowerCase()
  if (lower.includes('tree') || lower.includes('樹')) return 3
  if (lower.includes('forest') || lower.includes('森')) return 5
  if (lower.includes('house') || lower.includes('矮房') || lower.includes('小房')) return 6
  if (lower.includes('villa') || lower.includes('別墅')) return 7
  if (lower.includes('office') || lower.includes('大樓')) return 8
  if (lower.includes('tower') || lower.includes('摩天')) return 9
  return 6 + (orderSn % 4)
}

export const IsometricMap: React.FC<IsometricMapProps> = ({
  homeFunction,
  token,
  apiBaseUrl,
  onNavigate,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  
  // Dynamic Map Dimensions (clamped 10~30)
  const width = Math.min(Math.max(homeFunction.width || 10, 10), 30)
  const height = Math.min(Math.max(homeFunction.height || 10, 10), 30)

  const TILE_WIDTH = 96
  const TILE_HEIGHT = 48

  const centerX = Math.floor(width / 2)
  const centerY = Math.floor(height / 2)
  const mapKey = homeFunction?.id || homeFunction?.name || 'default'

  // Pan states initialized from cache or default center
  const [pan, setPan] = useState<{ x: number; y: number }>(() => {
    const cached = panCache.get(mapKey)
    if (cached) return cached
    const centerIsoY = (centerX + centerY) * (TILE_HEIGHT / 2)
    return { x: 0, y: -centerIsoY }
  })
  // Zoom scale state (default 1.0 = 100%, clamped between 0.5 = 50% and 2.0 = 200%)
  const [zoom, setZoom] = useState<number>(1.0)
  const [selectedTile, setSelectedTile] = useState<{ gridX: number; gridY: number } | null>(null)
  const outerContainerRef = useRef<HTMLDivElement>(null)

  // Cloud fog overlay transition state for map initial enter and area map switching
  const [fogState, setFogState] = useState<FogState>('covered')

  const handleZoomChange = (newZoom: number) => {
    const clamped = Math.min(Math.max(newZoom, 0.5), 2.0)
    setZoom(parseFloat(clamped.toFixed(2)))
  }

  // Non-passive wheel event listener to prevent browser page scrolling when zooming map
  useEffect(() => {
    const container = outerContainerRef.current
    if (!container) return

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY < 0 ? 0.08 : -0.08
      setZoom((prev) => {
        const next = Math.min(Math.max(prev + delta, 0.5), 2.0)
        return parseFloat(next.toFixed(2))
      })
    }

    container.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      container.removeEventListener('wheel', onWheel)
    }
  }, [])
  
  // Transition / Authorization modal state
  const [transitionModal, setTransitionModal] = useState<{
    open: boolean
    loading: boolean
    dir?: string
    targetFunction?: any
    error?: string
  }>({ open: false, loading: false })

  const updatePan = (newPan: { x: number; y: number }) => {
    const centerIsoY = (centerX + centerY) * (TILE_HEIGHT / 2)
    // Clamp pan bounds so the map can NEVER be dragged completely off-screen
    const maxPanX = Math.max(300, (width * TILE_WIDTH) / 4 + 100)
    const maxPanY = Math.max(220, (height * TILE_HEIGHT) / 2 + 100)

    const clampedX = Math.max(-maxPanX, Math.min(maxPanX, newPan.x))
    const clampedY = Math.max(-centerIsoY - maxPanY, Math.min(-centerIsoY + maxPanY, newPan.y))

    const clamped = { x: clampedX, y: clampedY }
    setPan(clamped)
    panCache.set(mapKey, clamped)
  }

  // Map sub-functions to grid coordinates based on orderSN
  const buildingMap = useMemo(() => {
    const map = new Map<string, SubFunction>()
    if (homeFunction.subFunctions) {
      homeFunction.subFunctions.forEach((sub) => {
        const { dx, dy } = orderSNToRelativeCoord(sub.orderSn)
        const gx = centerX + dx
        const gy = centerY + dy
        if (gx >= 0 && gx < width && gy >= 0 && gy < height) {
          map.set(`${gx},${gy}`, sub)
        }
      })
    }
    return map
  }, [homeFunction.subFunctions, centerX, centerY, width, height])

  // Build grid tiles list sorted strictly by (gridX + gridY) ascending for painter's algorithm Z-Index
  const tiles: TileCoord[] = useMemo(() => {
    // Pre-calculate all building grid coordinates as [bx, by] array
    const buildingCoords: [number, number][] = []
    buildingMap.forEach((_, key) => {
      const [bx, by] = key.split(',').map(Number)
      buildingCoords.push([bx, by])
    })

    const list: TileCoord[] = []
    for (let gy = 0; gy < height; gy++) {
      for (let gx = 0; gx < width; gx++) {
        const isoX = (gx - gy) * (TILE_WIDTH / 2)
        const isoY = (gx + gy) * (TILE_HEIGHT / 2)

        let isBoundary = false
        let boundaryDir: 'N' | 'S' | 'E' | 'W' | undefined

        if (gy === 0) {
          isBoundary = true
          boundaryDir = 'N'
        } else if (gy === height - 1) {
          isBoundary = true
          boundaryDir = 'S'
        } else if (gx === 0) {
          isBoundary = true
          boundaryDir = 'W'
        } else if (gx === width - 1) {
          isBoundary = true
          boundaryDir = 'E'
        }

        const bldg = buildingMap.get(`${gx},${gy}`)

        // Tile is dirt if it is a building tile or a 1-ring neighbor tile of any building
        const isDirt = buildingCoords.some(([bx, by]) => Math.abs(gx - bx) <= 1 && Math.abs(gy - by) <= 1)

        list.push({
          gridX: gx,
          gridY: gy,
          isoX,
          isoY,
          isBoundary,
          boundaryDir,
          building: bldg,
          isDirt,
        })
      }
    }

    // Sort strictly by (X + Y) ascending
    list.sort((a, b) => {
      const depthA = a.gridX + a.gridY
      const depthB = b.gridX + b.gridY
      if (depthA !== depthB) {
        return depthA - depthB
      }
      return a.gridX - b.gridX
    })

    return list
  }, [width, height, buildingMap])

  // Adjacent maps state for Highway T-Bar Signposts (高速公路 T 霸提示招牌)
  interface AdjacentMapInfo {
    dir: 'N' | 'S' | 'E' | 'W'
    name: string
    title: string
    hasPermission: boolean
  }

  const [adjacentMapInfos, setAdjacentMapInfos] = useState<AdjacentMapInfo[]>([])

  // Set default center only if mapKey is not yet cached
  useEffect(() => {
    if (!panCache.has(mapKey)) {
      const centerIsoY = (centerX + centerY) * (TILE_HEIGHT / 2)
      const initial = { x: 0, y: -centerIsoY }
      setPan(initial)
      panCache.set(mapKey, initial)
    }
  }, [mapKey, centerX, centerY])

  // Fetch adjacent maps and permissions for T-Bar signposts
  useEffect(() => {
    let isMounted = true
    const fetchAdjacentMaps = async () => {
      // Keep fog covered while homeFunction subFunctions/ID are still loading from backend
      if (!homeFunction || (!homeFunction.id && (!homeFunction.subFunctions || homeFunction.subFunctions.length === 0))) {
        setFogState('covered')
        return
      }

      try {
        let response = await axios.get(
          `${apiBaseUrl}/api/v1/maps?kind=AREA_TRANSITION&map_a_id=${homeFunction.id || ''}`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        let transitions = response.data || []

        if ((!transitions || transitions.length === 0) && homeFunction.name) {
          try {
            const respName = await axios.get(
              `${apiBaseUrl}/api/v1/maps?kind=AREA_TRANSITION&map_a_id=${homeFunction.name}`,
              { headers: { Authorization: `Bearer ${token}` } }
            )
            if (respName.data && respName.data.length > 0) {
              transitions = respName.data
            }
          } catch (err) {
            // Ignore
          }
        }

        const activeTransitions = transitions.filter((m: any) => {
          const statusVal = typeof m.status === 'number' ? m.status : 2
          return (statusVal & 2) === 2
        })

        const defaultDirs: ('N' | 'E' | 'S' | 'W')[] = ['N', 'E', 'S', 'W']
        const list: AdjacentMapInfo[] = []

        for (let i = 0; i < activeTransitions.length; i++) {
          const trans = activeTransitions[i]
          const targetFuncID = trans.map_b_id || trans.mapBID || trans.MapBID
          const rawDir = trans.remark || trans.Remark || trans.description || defaultDirs[i % 4]
          const dir = rawDir.trim().toUpperCase() as 'N' | 'S' | 'E' | 'W'
          try {
            let funcData: any = null
            try {
              const funcRes = await axios.get(`${apiBaseUrl}/api/v1/functions?name=${targetFuncID}`, {
                headers: { Authorization: `Bearer ${token}` },
              })
              funcData = funcRes.data
            } catch (err) {
              // Fallback: query all_functions if targetFuncID is UUID and backend endpoint didn't match
              const allRes = await axios.get(`${apiBaseUrl}/api/v1/all_functions`, {
                headers: { Authorization: `Bearer ${token}` },
              })
              const allList = allRes.data || []
              funcData = allList.find((f: any) => f.id === targetFuncID || f.name === targetFuncID)
            }

            if (funcData && funcData.name) {
              list.push({
                dir,
                name: funcData.name,
                title: funcData.description || funcData.name,
                hasPermission: true,
              })
            }
          } catch (err) {
            // Permission failed or function inactive
          }
        }

        // Guaranteed fallback demo T-Bar signposts (東區生態公園) if no AREA_TRANSITION maps exist in DB
        if (list.length === 0) {
          list.push({
            dir: 'E',
            name: 'Park',
            title: '東區生態公園',
            hasPermission: true,
          })
        }

        console.log('[T-Bar Debug] Fetched T-Bar adjacentMapInfos:', list)

        if (isMounted) {
          setAdjacentMapInfos(list)
        }
      } catch (err) {
        console.error('Failed to fetch adjacent maps for T-Bar signposts:', err)
      } finally {
        if (isMounted) {
          // Double rAF + 180ms delay ensures React paints all building sprite buttons and T-Bars into the DOM under fog cover before opening
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              if (isMounted) {
                setTimeout(() => {
                  if (isMounted) {
                    setFogState('opening')
                    setTimeout(() => {
                      if (isMounted) setFogState('hidden')
                    }, 800)
                  }
                }, 180)
              }
            })
          })
        }
      }
    }

    fetchAdjacentMaps()
    return () => {
      isMounted = false
    }
  }, [homeFunction.id, homeFunction.name, homeFunction.subFunctions?.length, token, apiBaseUrl])

  // Dragging state for mouse/touch panning
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isMoved, setIsMoved] = useState(false)

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    setIsDragging(true)
    setIsMoved(false)
    setDragStart({ x: e.clientX, y: e.clientY })
    setPanStart({ x: pan.x, y: pan.y })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    e.preventDefault()
    const dx = e.clientX - dragStart.x
    const dy = e.clientY - dragStart.y

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      setIsMoved(true)
    }

    updatePan({
      x: panStart.x + dx,
      y: panStart.y + dy,
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0]
      setIsDragging(true)
      setIsMoved(false)
      setDragStart({ x: touch.clientX, y: touch.clientY })
      setPanStart({ x: pan.x, y: pan.y })
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return
    e.preventDefault()
    const touch = e.touches[0]
    const dx = touch.clientX - dragStart.x
    const dy = touch.clientY - dragStart.y

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      setIsMoved(true)
    }

    updatePan({
      x: panStart.x + dx,
      y: panStart.y + dy,
    })
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
  }

  // Click tile -> Select tile without panning map
  const handleTileClick = (tile: TileCoord) => {
    if (isMoved) return
    setSelectedTile({ gridX: tile.gridX, gridY: tile.gridY })
  }

  // Click building tile -> Directly navigate to feature page if permitted, else show no-permission warning
  const handleBuildingClick = async (e: React.MouseEvent, building: SubFunction, tile: TileCoord) => {
    e.stopPropagation()
    if (isMoved) return
    handleTileClick(tile)
    try {
      const response = await axios.get(`${apiBaseUrl}/api/v1/functions?name=${building.name}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.data) {
        onNavigate(`/${building.name}`)
      }
    } catch (err: any) {
      console.error('Building permission validation error:', err)
      const errorMsg =
        err.response?.status === 403
          ? '存取權限不足：您尚未獲得進入該功能頁面的權限。'
          : err.response?.data?.error || '無法進入該功能頁面，請確認權限設定。'

      setTransitionModal({
        open: true,
        loading: false,
        error: errorMsg,
      })
    }
  }

  // Click boundary / T-Bar signpost -> Area transition check
  const handleBoundaryClick = async (e: React.MouseEvent, dir: string, targetName?: string) => {
    e.stopPropagation()
    if (isMoved) return
    if (targetName) {
      setFogState('closing')
      setTimeout(() => {
        setFogState('covered')
        onNavigate(`/${targetName}`)
      }, 800)
      return
    }
    setTransitionModal({ open: true, loading: true, dir })

    try {
      // 1. Query maps table for AREA_TRANSITION mappings for current home function
      const response = await axios.get(
        `${apiBaseUrl}/api/v1/maps?kind=AREA_TRANSITION&map_a_id=${homeFunction.id || ''}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      const transitions = response.data || []
      // 2. Filter active status (bitwise mask check: (status & 2) == 2)
      const activeTransitions = transitions.filter((m: any) => {
        const statusVal = typeof m.status === 'number' ? m.status : 2
        return (statusVal & 2) === 2
      })

      if (!activeTransitions || activeTransitions.length === 0) {
        setTransitionModal({
          open: true,
          loading: false,
          dir,
          error: `邊界 [${dir} 方位] 尚無連接的區域轉場地圖 (AREA_TRANSITION)。`,
        })
        return
      }

      // Pick the transition destination function ID (mapBID)
      const targetMapBID = activeTransitions[0].mapBID

      // 3. Verify AuthorizationMiddleware permission for target function
      const funcRes = await axios.get(`${apiBaseUrl}/api/v1/functions?name=${targetMapBID}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      const targetFunc = funcRes.data
      setTransitionModal({ open: false, loading: false })
      if (targetFunc && targetFunc.name) {
        onNavigate(`/${targetFunc.name}`)
      }
    } catch (err: any) {
      console.error('Area transition validation error:', err)
      const errorMsg =
        err.response?.status === 403
          ? '存取權限不足：您尚未獲得進入該目標區域的權限。'
          : err.response?.data?.error || '無法連通目標區域，請確認權限設定。'

      setTransitionModal({
        open: true,
        loading: false,
        dir,
        error: errorMsg,
      })
    }
  }

  return (
    <div
      ref={outerContainerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        position: 'relative',
        width: '100%',
        height: '620px',
        background: 'radial-gradient(circle at center, #15241d 0%, #0a120e 100%)',
        borderRadius: '24px',
        border: '1px solid rgba(163, 198, 175, 0.18)',
        overflow: 'hidden',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), inset 0 0 40px rgba(123, 168, 138, 0.12)',
        userSelect: 'none',
        touchAction: 'none',
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
    >
      {/* Header HUD Overlay */}
      <div
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '10px 20px',
          borderRadius: '16px',
          background: 'rgba(12, 20, 17, 0.82)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(163, 198, 175, 0.18)',
        }}
      >
        <Compass className="w-5 h-5 text-emerald-400 animate-spin-slow" />
        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f0f5f2' }}>
          {homeFunction.description || homeFunction.name}
        </div>
      </div>

      {/* Main Isometric Grid Canvas */}
      <div
        ref={mapContainerRef}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${zoom})`,
          transformOrigin: 'center center',
          transition: isDragging ? 'none' : 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
          width: '0px',
          height: '0px',
        }}
      >
        {tiles.map((tile) => {
          const isSelected =
            selectedTile?.gridX === tile.gridX && selectedTile?.gridY === tile.gridY
          const depthIndex = (tile.gridX + tile.gridY) * 10 + tile.gridX

          // Terrain coloring & texture mapping for Row 0 sprites
          // Dirt (泥土地): Building feature tiles and 1-ring neighbor tiles
          // Grass 1 (草地1) & Grass 2 (草地2): Varied natural meadow grass
          let sideLeftFill = '#2d5e35'
          let sideRightFill = '#1c3e23'
          let topFaceFill = '#3e7d48'
          let strokeColor = 'rgba(30, 65, 35, 0.4)'

          // Ground tile sprite column index from Row 0:
          // Col 0: 第1張 泥土 (Dirt)
          // Col 1: 第2張 草地1 (Grass 1)
          const groundSpriteCol = tile.isDirt ? 0 : 1

          const clipId = `tile-clip-${tile.gridX}-${tile.gridY}`

          return (
            <div
              key={`${tile.gridX}-${tile.gridY}`}
              onClick={() => handleTileClick(tile)}
              style={{
                position: 'absolute',
                left: `${tile.isoX - TILE_WIDTH / 2}px`,
                top: `${tile.isoY}px`,
                width: `${TILE_WIDTH}px`,
                height: `${TILE_HEIGHT}px`,
                zIndex: depthIndex,
                cursor: 'pointer',
              }}
            >
              {/* Ground Tile 3D Block Sprite (有建築物就不渲染泥土，無建築物才渲染地表) */}
              {!tile.building && (
                <div
                  style={{
                    position: 'absolute',
                    left: '50%',
                    bottom: '-24px',
                    transform: 'translate(-50%, 0)',
                    width: `${TILE_WIDTH + 14}px`,
                    height: '115px',
                    backgroundImage: 'url(/buildings_1.webp)',
                    backgroundSize: '1000% auto',
                    backgroundPosition: `${(groundSpriteCol / 9) * 100}% 0%`,
                    backgroundRepeat: 'no-repeat',
                    pointerEvents: 'none',
                    opacity: isSelected ? 0.75 : 1.0,
                  }}
                />
              )}

              {/* Isometric Tile Polygon Selection & Stroke Border */}
              <svg
                width={TILE_WIDTH}
                height={TILE_HEIGHT + 16}
                viewBox={`0 0 ${TILE_WIDTH} ${TILE_HEIGHT + 16}`}
                style={{ overflow: 'visible', pointerEvents: 'none' }}
              >
                {isSelected && (
                  <polygon
                    points={`${TILE_WIDTH / 2},0 ${TILE_WIDTH},${TILE_HEIGHT / 2} ${TILE_WIDTH / 2},${TILE_HEIGHT} 0,${TILE_HEIGHT / 2}`}
                    fill="rgba(250, 204, 21, 0.4)"
                    stroke="#facc15"
                    strokeWidth={2}
                  />
                )}
              </svg>

              {/* Building Texture / Sprite Button (第一排貼圖: 樹木1/樹木2/森林/矮房/別墅/大樓/摩天大樓) */}
              {tile.building && (
                <BuildingSpriteButton
                  mapX={tile.gridX}
                  mapY={tile.gridY}
                  sheet_id={(tile.building as any).sheet_id || '1'}
                  spriteCol={
                    (tile.building as any).spriteCol ??
                    getBuildingSpriteCol(
                      tile.building.orderSn,
                      tile.building.description || tile.building.name
                    )
                  }
                  spriteRow={0}
                  buildingName={tile.building.description || tile.building.name}
                  hasPermission={(tile.building as any).hasPermission}
                  tileWidth={TILE_WIDTH}
                  tileHeight={TILE_HEIGHT}
                  spriteWidth={100}
                  spriteHeight={100}
                  onClick={(e) => handleBuildingClick(e, tile.building!, tile)}
                />
              )}
            </div>
          )
        })}

        {/* Highway T-Bar Signposts (四個邊中點往外延伸 - 高速公路 T 霸提示招牌) */}
        {adjacentMapInfos.map((adj) => {
          let tbarIsoX = 0
          let tbarIsoY = 0

          if (adj.dir === 'N') {
            // Screen North (Top vertex of isometric map)
            tbarIsoX = 0
            tbarIsoY = 20
          } else if (adj.dir === 'S') {
            // Screen South (Bottom vertex of isometric map)
            tbarIsoX = 0
            tbarIsoY = (width - 1 + height - 1) * (TILE_HEIGHT / 2) - 20
          } else if (adj.dir === 'W') {
            // Screen West (Left vertex of isometric map)
            tbarIsoX = -(height - 1) * (TILE_WIDTH / 2) + 40
            tbarIsoY = (height - 1) * (TILE_HEIGHT / 2)
          } else if (adj.dir === 'E') {
            // Screen East (Right vertex of isometric map)
            tbarIsoX = (width - 1) * (TILE_WIDTH / 2) - 40
            tbarIsoY = (width - 1) * (TILE_HEIGHT / 2)
          }

          return (
            <div
              key={adj.dir}
              onClick={(e) => handleBoundaryClick(e, adj.dir, adj.name)}
              style={{
                position: 'absolute',
                left: `${tbarIsoX}px`,
                top: `${tbarIsoY}px`,
                transform: 'translate(-50%, -100%)',
                zIndex: 999,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                pointerEvents: 'auto',
              }}
            >
              {/* Highway Signboard Box */}
              <div
                className="hover:scale-105 transition-all duration-300 group"
                style={{
                  background: 'linear-gradient(135deg, #065f46 0%, #047857 60%, #022c22 100%)',
                  border: '2px solid #34d399',
                  boxShadow: '0 12px 30px rgba(4, 120, 87, 0.6), 0 0 15px rgba(52, 211, 153, 0.4)',
                  borderRadius: '14px',
                  padding: '10px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: '#ffffff',
                  whiteSpace: 'nowrap',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: '1px solid rgba(255, 255, 255, 0.4)',
                  }}
                >
                  {adj.dir === 'N' && <ArrowUp className="w-4 h-4 text-emerald-200" />}
                  {adj.dir === 'S' && <ArrowDown className="w-4 h-4 text-emerald-200" />}
                  {adj.dir === 'W' && <ArrowLeft className="w-4 h-4 text-emerald-200" />}
                  {adj.dir === 'E' && <ArrowRight className="w-4 h-4 text-emerald-200" />}
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, letterSpacing: '0.04em' }}>
                  {adj.title}
                </div>
              </div>

              {/* T-Bar High-rise Metallic Support Pole */}
              <div
                style={{
                  width: '10px',
                  height: '75px',
                  background: 'linear-gradient(to right, #334155, #94a3b8, #1e293b)',
                  boxShadow: '2px 0 8px rgba(0,0,0,0.6)',
                }}
              />
              {/* T-Bar Concrete Base Anchor */}
              <div
                style={{
                  width: '24px',
                  height: '8px',
                  background: '#334155',
                  borderRadius: '3px',
                  border: '1px solid #64748b',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.7)',
                }}
              />
            </div>
          )
        })}
      </div>

      {/* Floating Bottom-Right Zoom Controller (滾輪 / 拉條縮放控制器 50% ~ 200%) */}
      <div
        style={{
          position: 'absolute',
          bottom: '20px',
          right: '20px',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '8px 16px',
          borderRadius: '16px',
          background: 'rgba(12, 20, 17, 0.85)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(163, 198, 175, 0.25)',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
        }}
      >
        <button
          onClick={() => handleZoomChange(zoom - 0.1)}
          title="縮小 (50%)"
          disabled={zoom <= 0.5}
          className="p-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-700 disabled:opacity-40 disabled:hover:bg-emerald-950/60 text-emerald-300 hover:text-white transition-all border border-emerald-500/30 cursor-pointer"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <input
          type="range"
          min="0.5"
          max="2.0"
          step="0.05"
          value={zoom}
          onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
          style={{
            width: '100px',
            accentColor: '#6ebf8b',
            cursor: 'pointer',
          }}
        />

        <button
          onClick={() => handleZoomChange(zoom + 0.1)}
          title="放大 (200%)"
          disabled={zoom >= 2.0}
          className="p-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-700 disabled:opacity-40 disabled:hover:bg-emerald-950/60 text-emerald-300 hover:text-white transition-all border border-emerald-500/30 cursor-pointer"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <div
          onClick={() => handleZoomChange(1.0)}
          title="點擊重置為 100%"
          style={{
            fontSize: '0.8rem',
            fontWeight: 700,
            color: '#a3c6af',
            minWidth: '44px',
            textAlign: 'center',
            cursor: 'pointer',
            padding: '3px 6px',
            borderRadius: '6px',
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(163, 198, 175, 0.2)',
          }}
        >
          {Math.round(zoom * 100)}%
        </div>
      </div>

      {/* Map Container Fog Transition Overlay */}
      <FogOverlay fogState={fogState} cloudMaskUrl="/mask_cloud.webp" />

      {/* Area Transition & Permission Alert Modal */}
      {transitionModal.open && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 200,
            background: 'rgba(8, 14, 11, 0.82)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '440px',
              background: 'linear-gradient(145deg, #182a22 0%, #0d1612 100%)',
              border: '1px solid rgba(163, 198, 175, 0.2)',
              borderRadius: '24px',
              padding: '28px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
              color: '#f0f5f2',
            }}
          >
            {transitionModal.loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '20px 0' }}>
                <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <p style={{ fontSize: '0.95rem', color: '#a1b5aa' }}>正在驗證連通性與使用者權限...</p>
              </div>
            ) : transitionModal.error ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', color: '#d97764' }}>
                  <ShieldAlert className="w-7 h-7" />
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>權限不足 / 轉場阻擋提示</h3>
                </div>
                <p style={{ fontSize: '0.9rem', color: '#a1b5aa', lineHeight: '1.6', marginBottom: '24px' }}>
                  {transitionModal.error}
                </p>
                <button
                  onClick={() => setTransitionModal({ open: false, loading: false })}
                  className="w-full py-3 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 text-white font-semibold transition-colors cursor-pointer border border-emerald-500/30"
                >
                  確認返回
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
