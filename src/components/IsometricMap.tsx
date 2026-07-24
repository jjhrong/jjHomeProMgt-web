import React, { useState, useEffect, useRef, useMemo } from 'react'
import axios from 'axios'
import {
  Compass,
  ArrowLeft,
  ArrowRight,
  ShieldAlert,
  ZoomIn,
  ZoomOut,
  Building,
  Building2,
  ChevronDown,
  Plus,
  X,
  Hammer,
  Star,
} from 'lucide-react'
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
  hasPermission?: boolean
}

interface FavoriteFunction {
  id: string
  name: string
  description: string
  type: string
  p_id?: string
  pId?: string
  hasPermission?: boolean
}

interface AdminOption {
  key: string
  title: string
  allowed: boolean
}

interface NeighborMap {
  id: string
  name: string
  title?: string
  direction: string
  hasPermission?: boolean
}

interface HomeFunction {
  id: string
  name: string
  description: string
  type: string
  width?: number
  height?: number
  subFunctions: SubFunction[]
  favorites?: FavoriteFunction[]
  localBuildings?: SubFunction[]
  neighborMaps?: NeighborMap[]
  adminOptions?: AdminOption[]
}

interface IsometricMapProps {
  homeFunction: HomeFunction
  token: string | null
  apiBaseUrl: string
  onNavigate: (path: string) => void
  userRole?: string
  onRefreshMap?: () => void
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

const BUILDING_SPRITE_OPTIONS = [
  { label: '矮房', spriteCol: 6, spriteRow: 0 },
  { label: '別墅', spriteCol: 7, spriteRow: 0 },
  { label: '大樓', spriteCol: 8, spriteRow: 0 },
  { label: '摩天大樓', spriteCol: 9, spriteRow: 0 },
]

const SignpostItem: React.FC<{
  adj: { dir: string; name: string; title: string; hasPermission?: boolean }
  index: number
  tbarIsoX: number
  tbarIsoY: number
  onBoundaryClick: (e: React.MouseEvent, dir: string, name: string) => void
}> = ({ adj, index, tbarIsoX, tbarIsoY, onBoundaryClick }) => {
  const signboardRef = useRef<HTMLDivElement>(null)
  const [panelWidth, setPanelWidth] = useState<number>(200)

  useEffect(() => {
    if (signboardRef.current) {
      setPanelWidth(signboardRef.current.offsetWidth)
    }
  }, [adj.title])

  const isSkewPositive = adj.dir === 'E' || adj.dir === 'W'

  // Calculate exact vertical offset at leg position (24px padding from panel outer edge)
  const halfW = Math.max(10, panelWidth / 2 - 24)
  const deltaY = halfW * Math.tan((30 * Math.PI) / 180) // tan(30°) ≈ 0.57735

  // Left leg and right leg top margins (with 15px hidden behind panel)
  const leftMarginTop = `${(isSkewPositive ? -deltaY : deltaY) - 15}px`
  const rightMarginTop = `${(isSkewPositive ? deltaY : -deltaY) - 15}px`

  const poleHeight = '65px'

  return (
    <div
      key={`${adj.dir}-${adj.name}-${index}`}
      onClick={(e) => onBoundaryClick(e, adj.dir, adj.name)}
      className="opacity-50 hover:opacity-100 transition-opacity duration-300 group"
      style={{
        position: 'absolute',
        left: `${tbarIsoX}px`,
        top: `${tbarIsoY}px`,
        transform: 'translate(-50%, -100%)',
        zIndex: 9999,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        pointerEvents: 'auto',
      }}
    >
      {/* Notice Board Signboard Box (z-index: 10 確保遮蓋腳架頂端) */}
      <div
        ref={signboardRef}
        style={{
          position: 'relative',
          zIndex: 10,
          background: 'linear-gradient(135deg, #065f46 0%, #047857 60%, #022c22 100%)',
          border: '2px solid #34d399',
          filter:
            adj.dir === 'N' || adj.dir === 'S'
              ? 'drop-shadow(-1px -1px 0px #0e382b) drop-shadow(-2px -2px 0px #0e382b) drop-shadow(-3px -3px 0px #0e382b) drop-shadow(-4px -4px 0px #0e382b)'
              : 'drop-shadow(1px -1px 0px #0e382b) drop-shadow(2px -2px 0px #0e382b) drop-shadow(3px -3px 0px #0e382b) drop-shadow(4px -4px 0px #0e382b)',
          borderRadius: '16px',
          padding: '14px 24px',
          display: 'flex',
          flexDirection: adj.dir === 'N' || adj.dir === 'E' ? 'row-reverse' : 'row',
          alignItems: 'center',
          gap: '12px',
          color: '#ffffff',
          whiteSpace: 'nowrap',
          transform: isSkewPositive ? 'skewY(30deg)' : 'skewY(-30deg)',
          transformOrigin: 'bottom center',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.2)',
            border: '1.5px solid rgba(255, 255, 255, 0.4)',
          }}
        >
          {adj.dir === 'N' || adj.dir === 'E' ? (
            <ArrowRight className="w-5 h-5 text-emerald-200" />
          ) : (
            <ArrowLeft className="w-5 h-5 text-emerald-200" />
          )}
        </div>
        <div style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '0.04em' }}>
          {adj.title}
        </div>
      </div>

      {/* Dual Pillar Legs (z-index: 1 置於告示板下方，根據面板寬度與 tan(30deg) 斜率動態計算頂端貼合，露出長度完全相同) */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          padding: '0 24px',
          pointerEvents: 'none',
        }}
      >
        {/* Left Support Leg */}
        <div
          style={{
            marginTop: leftMarginTop,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            filter:
              'drop-shadow(1px 1px 0px #1e293b) drop-shadow(2px 2px 0px #1e293b) drop-shadow(3px 3px 0px #0f172a)',
          }}
        >
          <div
            style={{
              width: '8px',
              height: poleHeight,
              background: '#475569',
            }}
          />
          <div
            style={{
              width: '22px',
              height: '8px',
              background: '#334155',
              borderRadius: '3px',
              border: '1px solid #64748b',
            }}
          />
        </div>

        {/* Right Support Leg */}
        <div
          style={{
            marginTop: rightMarginTop,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            filter:
              'drop-shadow(1px 1px 0px #1e293b) drop-shadow(2px 2px 0px #1e293b) drop-shadow(3px 3px 0px #0f172a)',
          }}
        >
          <div
            style={{
              width: '8px',
              height: poleHeight,
              background: '#475569',
            }}
          />
          <div
            style={{
              width: '22px',
              height: '8px',
              background: '#334155',
              borderRadius: '3px',
              border: '1px solid #64748b',
            }}
          />
        </div>
      </div>
    </div>
  )
}

export const IsometricMap: React.FC<IsometricMapProps> = ({
  homeFunction,
  token,
  apiBaseUrl,
  onNavigate,
  userRole,
  onRefreshMap,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null)

  // Quick Navigation Dropdown state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Phase 1 Modal State (New Building Parameters)
  const [isPhase1ModalOpen, setIsPhase1ModalOpen] = useState(false)
  const [newBuildingParams, setNewBuildingParams] = useState({
    name: '',
    description: '',
    type: 'PAGE',
    spriteCol: 6,
    spriteRow: 0,
  })
  const [phase1Error, setPhase1Error] = useState('')

  // Phase 2 Placement Mode State
  const [isPlacementMode, setIsPlacementMode] = useState(false)
  const [placementData, setPlacementData] = useState<{
    name: string
    description: string
    type: string
    spriteCol: number
    spriteRow: number
  } | null>(null)
  const [hoverGrid, setHoverGrid] = useState<{ gridX: number; gridY: number } | null>(null)
  const [lockedGrid, setLockedGrid] = useState<{ gridX: number; gridY: number } | null>(null)
  const [isBuildingSubmitting, setIsBuildingSubmitting] = useState(false)


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
  // Zoom scale state (default 1.0 = 100%, clamped between 0.5 = 50% and 2.5 = 250%)
  const [zoom, setZoom] = useState<number>(1.0)
  const [selectedTile, setSelectedTile] = useState<{ gridX: number; gridY: number } | null>(null)
  const outerContainerRef = useRef<HTMLDivElement>(null)

  // Cloud fog overlay transition state for map initial enter and area map switching
  const [fogState, setFogState] = useState<FogState>('covered')

  const handleZoomChange = (newZoom: number) => {
    const clamped = Math.min(Math.max(newZoom, 0.5), 2.5)
    setZoom(parseFloat(clamped.toFixed(2)))
  }

  // Non-passive wheel and touch event listeners to prevent browser page scrolling and HTML pinch zooming
  useEffect(() => {
    const container = outerContainerRef.current
    if (!container) return

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY < 0 ? 0.08 : -0.08
      setZoom((prev) => {
        const next = Math.min(Math.max(prev + delta, 0.5), 2.5)
        return parseFloat(next.toFixed(2))
      })
    }

    const onTouchMovePrevent = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault()
      }
    }

    container.addEventListener('wheel', onWheel, { passive: false })
    container.addEventListener('touchmove', onTouchMovePrevent, { passive: false })
    return () => {
      container.removeEventListener('wheel', onWheel)
      container.removeEventListener('touchmove', onTouchMovePrevent)
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

  // Adjacent maps state for Highway T-Bar Signposts (高速公路 T 霸提示招牌)
  interface AdjacentMapInfo {
    dir: 'N' | 'S' | 'E' | 'W'
    name: string
    title: string
    hasPermission: boolean
  }

  // Derive adjacent map infos directly from homeFunction.neighborMaps returned by backend
  const adjacentMapInfos: AdjacentMapInfo[] = useMemo(() => {
    if (homeFunction.neighborMaps && homeFunction.neighborMaps.length > 0) {
      return homeFunction.neighborMaps.map((nm) => {
        const rawDir = (nm.direction || 'E').toUpperCase()
        const dir = (['N', 'S', 'E', 'W'].includes(rawDir) ? rawDir : 'E') as 'N' | 'S' | 'E' | 'W'
        return {
          dir,
          name: nm.name,
          title: nm.title || nm.name,
          hasPermission: nm.hasPermission !== undefined ? nm.hasPermission : true,
        }
      })
    }
    // Guaranteed fallback demo T-Bar signposts (HOME_N, HOME_E, HOME_S, HOME_W) if no neighbor maps exist in DB
    return [
      {
        dir: 'N',
        name: 'HOME_N',
        title: 'HOME_N (北區)',
        hasPermission: true,
      },
      {
        dir: 'E',
        name: 'HOME_E',
        title: 'HOME_E (東區)',
        hasPermission: true,
      },
      {
        dir: 'S',
        name: 'HOME_S',
        title: 'HOME_S (南區)',
        hasPermission: true,
      },
      {
        dir: 'W',
        name: 'HOME_W',
        title: 'HOME_W (西區)',
        hasPermission: true,
      },
    ]
  }, [homeFunction.neighborMaps])

  // Set default center only if mapKey is not yet cached
  useEffect(() => {
    if (!panCache.has(mapKey)) {
      const centerIsoY = (centerX + centerY) * (TILE_HEIGHT / 2)
      const initial = { x: 0, y: -centerIsoY }
      setPan(initial)
      panCache.set(mapKey, initial)
    }
  }, [mapKey, centerX, centerY])

  // Fog Overlay open effect when map is loaded
  useEffect(() => {
    if (!homeFunction || (!homeFunction.id && (!homeFunction.subFunctions || homeFunction.subFunctions.length === 0))) {
      setFogState('covered')
      return
    }

    setFogState('opening')
    const timer = setTimeout(() => {
      setFogState('hidden')
    }, 800)
    return () => clearTimeout(timer)
  }, [homeFunction.id, homeFunction.name, homeFunction.subFunctions?.length])

  // Dragging & Pinch state for mouse/touch panning and zooming
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isMoved, setIsMoved] = useState(false)
  const [pinchStartDist, setPinchStartDist] = useState<number | null>(null)
  const [pinchStartZoom, setPinchStartZoom] = useState<number>(1.0)

  const getTouchDistance = (t1: React.Touch | Touch, t2: React.Touch | Touch) => {
    const dx = t1.clientX - t2.clientX
    const dy = t1.clientY - t2.clientY
    return Math.hypot(dx, dy)
  }

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
      setPinchStartDist(null)
    } else if (e.touches.length === 2) {
      setIsDragging(false)
      const dist = getTouchDistance(e.touches[0], e.touches[1])
      setPinchStartDist(dist)
      setPinchStartZoom(zoom)
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
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
    } else if (e.touches.length === 2 && pinchStartDist && pinchStartDist > 0) {
      const currentDist = getTouchDistance(e.touches[0], e.touches[1])
      const scaleFactor = currentDist / pinchStartDist
      const newZoom = pinchStartZoom * scaleFactor
      const clampedZoom = Math.min(Math.max(newZoom, 0.5), 2.5)
      setZoom(parseFloat(clampedZoom.toFixed(2)))
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      setPinchStartDist(null)
    }
    if (e.touches.length === 0) {
      setIsDragging(false)
    }
  }

  const handleOpenPhase1 = () => {
    setIsDropdownOpen(false)
    setNewBuildingParams({ name: '', description: '', type: 'PAGE', spriteCol: 6, spriteRow: 0 })
    setPhase1Error('')
    setIsPhase1ModalOpen(true)
  }

  const handlePhase1Next = () => {
    const name = newBuildingParams.name.trim()
    const description = newBuildingParams.description.trim()
    const funcType = newBuildingParams.type.toUpperCase()
    const spriteCol = typeof newBuildingParams.spriteCol === 'number' ? newBuildingParams.spriteCol : 6
    const spriteRow = typeof newBuildingParams.spriteRow === 'number' ? newBuildingParams.spriteRow : 0

    if (!name) {
      setPhase1Error('請輸入功能英文名稱 (Name)。')
      return
    }
    if (!/^[A-Za-z0-9_-]+$/.test(name)) {
      setPhase1Error('功能名稱必須為英文、數字、底線或連字號。')
      return
    }
    if (!description) {
      setPhase1Error('請輸入中文描述 (Description)。')
      return
    }
    if (funcType === 'HOME') {
      setPhase1Error('嚴禁使用 HOME 類型作為建築子功能。')
      return
    }

    setIsPhase1ModalOpen(false)
    setPlacementData({ name, description, type: funcType, spriteCol, spriteRow })
    setIsPlacementMode(true)
    setLockedGrid(null)
    setHoverGrid(null)
  }

  const handleConfirmPlacement = async () => {
    if (!lockedGrid || !placementData) return
    setIsBuildingSubmitting(true)
    try {
      await axios.post(
        `${apiBaseUrl}/api/v1/functions/building`,
        {
          name: placementData.name,
          description: placementData.description,
          type: placementData.type,
          p_id: homeFunction.id,
          mapX: lockedGrid.gridX,
          mapY: lockedGrid.gridY,
          spriteCol: placementData.spriteCol ?? 6,
          spriteRow: placementData.spriteRow ?? 0,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      setIsBuildingSubmitting(false)
      setIsPlacementMode(false)
      setLockedGrid(null)
      setPlacementData(null)

      // Trigger fog transition refresh
      setFogState('closing')
      setTimeout(() => {
        if (onRefreshMap) {
          onRefreshMap()
        }
        setFogState('opening')
      }, 700)
    } catch (err: any) {
      console.error('Failed to create building:', err)
      setIsBuildingSubmitting(false)
      const msg =
        err.response?.data?.error || '新增建築失敗，請檢查輸入參數或系統權限。'
      alert(msg)
    }
  }

  // Click tile -> Select tile without panning map or lock placement coordinate
  const handleTileClick = (tile: TileCoord) => {
    if (isMoved) return
    setSelectedTile({ gridX: tile.gridX, gridY: tile.gridY })

    if (isPlacementMode) {
      if (tile.building) {
        alert('該座標已有建築物，請選擇其他空地網格！')
        return
      }
      setLockedGrid({ gridX: tile.gridX, gridY: tile.gridY })
    }
  }

  // Tile hover in Placement Mode
  const handleTileMouseEnter = (tile: TileCoord) => {
    if (isPlacementMode && !lockedGrid) {
      setHoverGrid({ gridX: tile.gridX, gridY: tile.gridY })
    }
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
      const targetMap = (homeFunction.neighborMaps || []).find((nm: any) => nm.name === targetName)
      if (targetMap && targetMap.hasPermission === false) {
        setTransitionModal({
          open: true,
          loading: false,
          error: `存取權限不足：您目前沒有存取【${targetMap.title || targetMap.name}】區域地圖的權限。`,
        })
        return
      }
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
      {/* Header HUD Overlay & Quick Navigation Dropdown */}
      <div
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        {/* Title Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 18px',
            borderRadius: '16px',
            background: 'rgba(12, 20, 17, 0.85)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(163, 198, 175, 0.25)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
          }}
        >
          <Compass className="w-5 h-5 text-emerald-400 animate-spin-slow" />
          <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f0f5f2' }}>
            {homeFunction.description || homeFunction.name}
          </span>
        </div>

        {/* Quick Navigation Dropdown (DirectGoMenu) */}
        {(() => {
          // 1. Favorites: filter items where hasPermission !== false
          const favorites = (homeFunction.favorites || []).filter(
            (fav) => fav.hasPermission !== false
          )

          // 2. Local Buildings: filter sub-functions where hasPermission !== false
          const rawLocalBuildings =
            homeFunction.localBuildings && homeFunction.localBuildings.length > 0
              ? homeFunction.localBuildings
              : homeFunction.subFunctions || []
          const localBuildings = rawLocalBuildings.filter(
            (sub) => sub.hasPermission !== false
          )

          // 3. Neighbor Maps: filter neighbor maps where hasPermission !== false
          const neighborMaps = (homeFunction.neighborMaps || []).filter(
            (nm) => nm.hasPermission !== false
          )

          // 4. Add Building Option: check admin role or CREATE_BUILDING option permission
          const isSystemAdminOrManager = userRole === 'ADMIN' || userRole === 'MANAGER'
          const hasCreateOption = (homeFunction.adminOptions || []).some(
            (a) => a.key === 'CREATE_BUILDING' && a.allowed !== false
          )
          const hasAdminOptions = isSystemAdminOrManager || hasCreateOption

          const hasFavorites = favorites.length > 0
          const hasLocalBuildings = localBuildings.length > 0
          const hasNeighborMaps = neighborMaps.length > 0

          const showDirectGoButton = hasFavorites || hasLocalBuildings || hasNeighborMaps || hasAdminOptions

          if (!showDirectGoButton) return null

          return (
            <div
              ref={dropdownRef}
              style={{ position: 'relative' }}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, rgba(31, 58, 44, 0.9) 0%, rgba(17, 34, 26, 0.9) 100%)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(110, 191, 139, 0.4)',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 8px 20px rgba(0, 0, 0, 0.35)',
                  transition: 'all 0.2s ease',
                }}
              >
                <Building2 className="w-4 h-4 text-emerald-300" />
                <span>直接前往...</span>
                <ChevronDown className="w-4 h-4 text-emerald-400 opacity-80" />
              </button>

              {/* Dropdown Menu Popup */}
              {isDropdownOpen && (
                <div
                  onPointerDown={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onWheel={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    left: 0,
                    minWidth: '240px',
                    maxHeight: '60vh',
                    overflowY: 'auto',
                    borderRadius: '16px',
                    background: 'rgba(15, 25, 20, 0.95)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(163, 198, 175, 0.3)',
                    boxShadow: '0 16px 36px rgba(0, 0, 0, 0.65)',
                    padding: '8px',
                    zIndex: 200,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                  className="custom-scrollbar"
                >
                  {/* Group 1: 我的最愛 */}
                  {hasFavorites && (
                    <>
                      {favorites.map((fav) => (
                        <button
                          key={fav.id}
                          type="button"
                          onClick={() => {
                            setIsDropdownOpen(false)
                            const targetPid = fav.p_id || fav.pId
                            if (targetPid && targetPid !== homeFunction.id) {
                              setFogState('closing')
                              setTimeout(() => {
                                setFogState('covered')
                                onNavigate(`/${fav.name}`)
                              }, 800)
                            } else {
                              onNavigate(`/${fav.name}`)
                            }
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: '10px',
                            border: 'none',
                            background: 'transparent',
                            color: '#e2e8f0',
                            fontSize: '0.85rem',
                            fontWeight: 500,
                            textAlign: 'left',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                          className="hover:bg-amber-950/40 hover:text-amber-300"
                        >
                          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400/40" />
                          <span>{fav.description || fav.name}</span>
                        </button>
                      ))}
                    </>
                  )}

                  {/* Group 2: 本地建築 */}
                  {hasLocalBuildings && (
                    <>
                      {hasFavorites && <div style={{ height: '1px', background: 'rgba(163, 198, 175, 0.15)', margin: '4px 0' }} />}
                      {localBuildings.map((sub) => (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => {
                            setIsDropdownOpen(false)
                            onNavigate(`/${sub.name}`)
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: '10px',
                            border: 'none',
                            background: 'transparent',
                            color: '#e2e8f0',
                            fontSize: '0.85rem',
                            fontWeight: 500,
                            textAlign: 'left',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                          className="hover:bg-emerald-950/60 hover:text-emerald-300"
                        >
                          <Building className="w-4 h-4 text-emerald-400" />
                          <span>{sub.description || sub.name}</span>
                        </button>
                      ))}
                    </>
                  )}

                  {/* Group 3: 相鄰大地圖 */}
                  {hasNeighborMaps && (
                    <>
                      {(hasFavorites || hasLocalBuildings) && <div style={{ height: '1px', background: 'rgba(163, 198, 175, 0.15)', margin: '4px 0' }} />}
                      {neighborMaps.map((nm) => {
                        const dirName =
                          nm.direction === 'N'
                            ? '北方'
                            : nm.direction === 'E'
                            ? '東方'
                            : nm.direction === 'S'
                            ? '南方'
                            : nm.direction === 'W'
                            ? '西方'
                            : '相鄰區域'

                        return (
                          <button
                            key={nm.id || nm.name}
                            type="button"
                            onClick={() => {
                              setIsDropdownOpen(false)
                              setFogState('closing')
                              setTimeout(() => {
                                setFogState('covered')
                                onNavigate(`/${nm.name}`)
                              }, 800)
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              width: '100%',
                              padding: '8px 12px',
                              borderRadius: '10px',
                              border: 'none',
                              background: 'transparent',
                              color: '#e2e8f0',
                              fontSize: '0.85rem',
                              fontWeight: 500,
                              textAlign: 'left',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                            className="hover:bg-emerald-950/60 hover:text-emerald-300"
                          >
                            <Compass className="w-4 h-4 text-emerald-400" />
                            <span>
                              前往{dirName}：{nm.title || nm.name}
                            </span>
                          </button>
                        )
                      })}
                    </>
                  )}

                  {/* Group 4: 新增建築 */}
                  {hasAdminOptions && (
                    <>
                      {(hasFavorites || hasLocalBuildings || hasNeighborMaps) && <div style={{ height: '1px', background: 'rgba(163, 198, 175, 0.2)', margin: '4px 0' }} />}
                      <div style={{ padding: '2px 0' }}>
                        <button
                          type="button"
                          onClick={handleOpenPhase1}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            width: '100%',
                            padding: '9px 12px',
                            borderRadius: '10px',
                            border: '1px dashed rgba(110, 191, 139, 0.5)',
                            background: 'rgba(52, 120, 78, 0.25)',
                            color: '#6ebf8b',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                          className="hover:bg-emerald-900/40 hover:text-emerald-200"
                        >
                          <Plus className="w-4 h-4 text-emerald-400" />
                          <span>新增建築</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })()}
      </div>

      {/* Phase 2 Placement Mode HUD Notification Banner */}
      {isPlacementMode && (
        <div
          style={{
            position: 'absolute',
            top: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 300,
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            padding: '12px 24px',
            borderRadius: '20px',
            background: lockedGrid
              ? 'rgba(30, 20, 10, 0.92)'
              : 'rgba(12, 30, 20, 0.92)',
            backdropFilter: 'blur(16px)',
            border: lockedGrid
              ? '1px solid rgba(250, 204, 21, 0.6)'
              : '1px solid rgba(110, 191, 139, 0.6)',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.6)',
            color: '#ffffff',
            fontSize: '0.88rem',
            fontWeight: 600,
          }}
        >
          <Hammer className="w-5 h-5 text-amber-400 animate-bounce" />
          <div>
            {lockedGrid ? (
              <span>
                已選定座標 <strong style={{ color: '#facc15' }}>({lockedGrid.gridX}, {lockedGrid.gridY})</strong>，確認建造「{placementData?.description}」？
              </span>
            ) : (
              <span>
                【建築擺放模式】請在等角網格空地上點擊，選擇「<strong>{placementData?.description}</strong>」的建造位置
              </span>
            )}
          </div>

          {lockedGrid ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setLockedGrid(null)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#e2e8f0',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                }}
              >
                取消重新選擇
              </button>
              <button
                type="button"
                onClick={handleConfirmPlacement}
                disabled={isBuildingSubmitting}
                style={{
                  padding: '6px 16px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)',
                }}
              >
                {isBuildingSubmitting ? '建造中...' : '確定建造'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setIsPlacementMode(false)
                setPlacementData(null)
                setLockedGrid(null)
              }}
              style={{
                padding: '6px 12px',
                borderRadius: '10px',
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#fca5a5',
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              退出擺放
            </button>
          )}
        </div>
      )}

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


          // Ground tile sprite column index from Row 0:
          // Col 0: 第 1 張貼圖 - 泥土 (Dirt) (建築物下方及周圍)
          // Col 1: 第 2 張貼圖 - 草地 (Grass) (一般開闊地表)
          const groundSpriteCol = (tile.building || tile.isDirt) ? 0 : 1

          return (
            <div
              key={`${tile.gridX}-${tile.gridY}`}
              onClick={() => handleTileClick(tile)}
              onMouseEnter={() => handleTileMouseEnter(tile)}
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
              {/* Ground Tile 3D Block Sprite (第 1 張貼圖: 泥土, 第 2 張貼圖: 草地) */}
              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  bottom: '-50px',
                  transform: 'translate(-50%, 0) scaleY(0.9)',
                  width: `${TILE_WIDTH + 14}px`,
                  height: '115px',
                  backgroundImage: 'url(/buildings_1.webp)',
                  backgroundSize: '1000% auto',
                  backgroundPosition: `${3 + (groundSpriteCol == 0 ? -0.005 : groundSpriteCol / 10) * 100}% 100%`,
                  backgroundRepeat: 'no-repeat',
                  pointerEvents: 'none',
                  opacity: isSelected ? 0.75 : 1.0,
                }}
              />

              {/* Phase 2 Placement Mode Building Sprite Preview (使用精準 PX 裁切繪製) */}
              {isPlacementMode &&
                ((lockedGrid?.gridX === tile.gridX && lockedGrid?.gridY === tile.gridY) ||
                  (!lockedGrid && hoverGrid?.gridX === tile.gridX && hoverGrid?.gridY === tile.gridY)) && (
                  <div
                    style={{
                      position: 'absolute',
                      left: '50%',
                      bottom: '0px',
                      transform: 'translate(-50%, 0)',
                      pointerEvents: 'none',
                      zIndex: depthIndex + 20,
                      opacity: lockedGrid ? 1.0 : 0.75,
                      filter: lockedGrid
                        ? 'drop-shadow(0 0 16px rgba(250, 204, 21, 0.9))'
                        : 'drop-shadow(0 0 12px rgba(110, 191, 139, 0.8))',
                    }}
                  >
                    <BuildingSpriteButton
                      mapX={tile.gridX}
                      mapY={tile.gridY}
                      sheet_id={(placementData as any)?.sheet_id ?? '1'}
                      spriteCol={placementData?.spriteCol ?? 6}
                      spriteRow={placementData?.spriteRow ?? 0}
                      buildingName={lockedGrid ? '預定建造點' : '預覽建造位置'}
                      hasPermission={true}
                    />
                  </div>
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

              {/* Building Texture / Sprite Button (預設為第 7 個貼圖: 矮房, spriteCol = 6) */}
              {tile.building && (() => {
                const b = tile.building as any
                const sheetId = String(b.sheet_id || '1')
                const spriteCol = typeof b.spriteCol === 'number' ? Number(b.spriteCol) : 6
                const spriteRow = typeof b.spriteRow === 'number' ? Number(b.spriteRow) : 0

                return (
                  <BuildingSpriteButton
                    mapX={tile.gridX}
                    mapY={tile.gridY}
                    sheet_id={sheetId}
                    spriteCol={spriteCol}
                    spriteRow={spriteRow}
                    buildingName={tile.building.description || tile.building.name}
                    hasPermission={(tile.building as any).hasPermission}
                    tileWidth={TILE_WIDTH}
                    tileHeight={TILE_HEIGHT}
                    spriteWidth={100}
                    spriteHeight={100}
                    onClick={(e) => handleBuildingClick(e, tile.building!, tile)}
                  />
                )
              })()}
            </div>
          )
        })}

        {/* Highway T-Bar Signposts (四個邊中點緊貼 - 高速公路 T 霸提示招牌) */}
        {(() => {
          const dirCounts: Record<string, number> = {}
          const dirIndices: Record<string, number> = {}
          adjacentMapInfos.forEach((a) => {
            dirCounts[a.dir] = (dirCounts[a.dir] || 0) + 1
          })

          const midX = Math.floor((width - 1) / 2)
          const midY = Math.floor((height - 1) / 2)

          return adjacentMapInfos.map((adj, index) => {
            const count = dirCounts[adj.dir] || 1
            const idx = dirIndices[adj.dir] || 0
            dirIndices[adj.dir] = idx + 1

            // Offset factor for multiple signs along the same border edge
            const offset = (idx - (count - 1) / 2) * 1.2

            let tbarIsoX = 0
            let tbarIsoY = 0

            if (adj.dir === 'N') {
              // North border (Top-right edge ↗) - shift outwards by 2 tiles and down by 1 tile
              const dist = 2
              const gx = Math.min(width - 1, Math.max(0, Math.round(midX + offset)))
              tbarIsoX = (gx + dist) * (TILE_WIDTH / 2) + 45
              tbarIsoY = (gx - dist) * (TILE_HEIGHT / 2) - 10 + TILE_HEIGHT
            } else if (adj.dir === 'E') {
              // East border (Bottom-right edge ↘) - shift outwards by 6 tiles and down by 0.5 tile
              const dist = 6
              const gy = Math.min(height - 1, Math.max(0, Math.round(midY + 1 + offset)))
              tbarIsoX = (width - 1 - gy + dist) * (TILE_WIDTH / 2) + 45
              tbarIsoY = (width - 1 + gy + dist) * (TILE_HEIGHT / 2) + 30 + TILE_HEIGHT / 2
            } else if (adj.dir === 'S') {
              // South border (Bottom-left edge ↙) - shift outwards by 6 tiles and down by 1 tile
              const dist = 6
              const gx = Math.min(width - 1, Math.max(0, Math.round(midX + offset)))
              tbarIsoX = (gx - (height - 1) - dist) * (TILE_WIDTH / 2)
              tbarIsoY = (gx + (height - 1) + dist) * (TILE_HEIGHT / 2) + 30 + TILE_HEIGHT
            } else if (adj.dir === 'W') {
              // West border (Top-left edge ↖) - shift outwards by 2 tiles and down by 0.5 tile
              const dist = 2
              const gy = Math.min(height - 1, Math.max(0, Math.round(midY + offset)))
              tbarIsoX = (-gy - dist) * (TILE_WIDTH / 2) - 45
              tbarIsoY = (gy - dist) * (TILE_HEIGHT / 2) + TILE_HEIGHT / 2
            }

            return (
              <SignpostItem
                key={`${adj.dir}-${adj.name}-${index}`}
                adj={adj}
                index={index}
                tbarIsoX={tbarIsoX}
                tbarIsoY={tbarIsoY}
                onBoundaryClick={handleBoundaryClick}
              />
            )
          })
        })()}
      </div>

      {/* Floating Bottom-Right Zoom Controller (滾輪 / 拉條縮放控制器 50% ~ 250%) */}
      <div
        onTouchStart={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
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
          max="2.5"
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
          title="放大 (250%)"
          disabled={zoom >= 2.5}
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
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
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

      {/* Phase 1 Modal: Function Parameters Form */}
      {isPhase1ModalOpen && (
        <div
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <div
            style={{
              width: '90%',
              maxWidth: '440px',
              background: 'rgba(17, 27, 22, 0.95)',
              border: '1px solid rgba(110, 191, 139, 0.4)',
              borderRadius: '20px',
              padding: '24px',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.8)',
              color: '#f0f5f2',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: '#6ebf8b' }}>
                <Hammer className="w-5 h-5 text-emerald-400" />
                建造新建築 (新增子功能)
              </div>
              <button
                type="button"
                onClick={() => setIsPhase1ModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {phase1Error && (
              <div style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#fca5a5', fontSize: '0.82rem', marginBottom: '14px' }}>
                {phase1Error}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                  功能英文名稱 (Name)
                </label>
                <input
                  type="text"
                  placeholder="例如: Park, Library, Shop"
                  value={newBuildingParams.name}
                  onChange={(e) => setNewBuildingParams((prev) => ({ ...prev, name: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(163, 198, 175, 0.3)',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                  中文描述名稱 (Description)
                </label>
                <input
                  type="text"
                  placeholder="例如: 生態公園, 市立圖書館"
                  value={newBuildingParams.description}
                  onChange={(e) => setNewBuildingParams((prev) => ({ ...prev, description: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(163, 198, 175, 0.3)',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                  功能類型 (Type)
                </label>
                <select
                  value={newBuildingParams.type}
                  onChange={(e) => setNewBuildingParams((prev) => ({ ...prev, type: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: 'rgba(17, 27, 22, 0.95)',
                    border: '1px solid rgba(163, 198, 175, 0.3)',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                >
                  <option value="PAGE">PAGE (一般功能頁面)</option>
                  <option value="POST">POST (動態貼文牆)</option>
                  <option value="SETT">SETT (系統設定頁面)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '8px' }}>
                  選擇建築外觀 (Building Appearance)
                </label>
                <div
                  style={{
                    display: 'flex',
                    gap: '10px',
                    overflowX: 'auto',
                    padding: '6px 4px 12px 4px',
                  }}
                  className="custom-scrollbar"
                >
                  {BUILDING_SPRITE_OPTIONS.map((opt) => {
                    const isSelected =
                      newBuildingParams.spriteCol === opt.spriteCol && newBuildingParams.spriteRow === opt.spriteRow
                    return (
                      <button
                        key={`${opt.spriteCol}-${opt.spriteRow}`}
                        type="button"
                        onClick={() =>
                          setNewBuildingParams((prev) => ({ ...prev, spriteCol: opt.spriteCol, spriteRow: opt.spriteRow }))
                        }
                        style={{
                          flexShrink: 0,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 12px',
                          borderRadius: '12px',
                          background: isSelected ? 'rgba(110, 191, 139, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                          border: isSelected ? '2px solid #6ebf8b' : '1px solid rgba(255, 255, 255, 0.1)',
                          boxShadow: isSelected ? '0 0 12px rgba(110, 191, 139, 0.4)' : 'none',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div
                          style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            display: 'flex',
                            alignItems: 'flex-end',
                            justifyContent: 'center',
                            background: 'rgba(0, 0, 0, 0.25)',
                          }}
                        >
                          <div
                            style={{
                              width: '100px',
                              height: '144px',
                              flexShrink: 0,
                              backgroundImage: 'url(/buildings_1.webp)',
                              backgroundSize: '1000px auto',
                              backgroundPosition: `-${20 + opt.spriteCol * 96}px -1224px`,
                              backgroundRepeat: 'no-repeat',
                              transform: 'scale(0.46)',
                              transformOrigin: 'bottom center',
                            }}
                          />
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: isSelected ? '#6ebf8b' : '#94a3b8' }}>
                          {opt.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '22px' }}>
              <button
                type="button"
                onClick={() => setIsPhase1ModalOpen(false)}
                style={{
                  padding: '9px 18px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#cbd5e1',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                取消
              </button>
              <button
                type="button"
                onClick={handlePhase1Next}
                style={{
                  padding: '9px 20px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #6ebf8b 0%, #34784e 100%)',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(110, 191, 139, 0.4)',
                }}
              >
                下一步 (前往選擇座標)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
