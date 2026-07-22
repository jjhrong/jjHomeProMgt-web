import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { Bell, Megaphone, CreditCard, Gamepad2, CheckCheck, Loader2 } from 'lucide-react'

export interface Notification {
  id: string
  userId: string
  category: 'SYSTEM' | 'TRANSACTION' | 'GAME'
  title: string
  content: string
  linkUrl: string
  isRead: boolean
  lmUser: string
  lmDate: string
}

interface NotificationBellProps {
  token: string | null
  apiBaseUrl: string
  onNavigate: (path: string) => void
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  token,
  apiBaseUrl,
  onNavigate,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState<number>(0)
  const [isOpen, setIsOpen] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)
  
  const dropdownRef = useRef<HTMLDivElement>(null)
  const socketRef = useRef<WebSocket | null>(null)

  // 1. Fetch historical notifications
  const fetchNotifications = async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await axios.get(`${apiBaseUrl}/api/v1/notifications?limit=50`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.data) {
        setNotifications(res.data.notifications || [])
        setUnreadCount(res.data.unreadCount || 0)
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
  }, [token, apiBaseUrl])

  // 2. Establish WebSocket connection
  useEffect(() => {
    if (!token) {
      if (socketRef.current) {
        socketRef.current.close()
      }
      return
    }

    // Determine WS connection URL
    let wsUrl = 'ws://localhost:8080/api/v1/notifications/ws'
    if (apiBaseUrl) {
      try {
        const url = new URL(apiBaseUrl)
        const wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
        wsUrl = `${wsProtocol}//${url.host}/api/v1/notifications/ws`
      } catch (e) {
        console.error('Failed to parse apiBaseUrl for WebSocket, using fallback.', e)
      }
    }

    // Set token in Query String AND as a Subprotocol (Sec-WebSocket-Protocol) to be absolutely safe
    const wsUrlWithToken = `${wsUrl}?token=${encodeURIComponent(token)}`
    
    let socket: WebSocket
    try {
      socket = new WebSocket(wsUrlWithToken, [token])
      socketRef.current = socket
    } catch (err) {
      console.error('Failed to create WebSocket instance:', err)
      return
    }

    socket.onopen = () => {
      console.log('WebSocket connected to notifications hub.')
    }

    socket.onmessage = (event) => {
      try {
        const newNote: Notification = JSON.parse(event.data)
        if (newNote && newNote.id) {
          // Prepend new notification to state list
          setNotifications((prev) => {
            // Avoid duplicate notifications in case of re-send or double message
            if (prev.some(n => n.id === newNote.id)) {
              return prev
            }
            return [newNote, ...prev]
          })
          // Increment unread count
          setUnreadCount((prev) => prev + 1)
        }
      } catch (err) {
        console.error('Failed to parse WebSocket notification message:', err)
      }
    }

    socket.onclose = (event) => {
      console.log('WebSocket connection closed.', event.reason)
    }

    socket.onerror = (err) => {
      console.error('WebSocket error encountered:', err)
    }

    // Clean up connection on component unmount or token change
    return () => {
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close()
      }
    }
  }, [token, apiBaseUrl])

  // 3. Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // 4. Click notification logic
  const handleNotificationClick = async (note: Notification) => {
    setIsOpen(false)
    if (!token) return

    // Standard redirect first or concurrently
    onNavigate(note.linkUrl)

    if (!note.isRead) {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === note.id ? { ...n, isRead: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))

      try {
        await axios.put(`${apiBaseUrl}/api/v1/notifications/${note.id}/read`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        })
      } catch (err) {
        console.error(`Failed to mark notification ${note.id} as read:`, err)
        // Rollback state on error
        setNotifications((prev) =>
          prev.map((n) => (n.id === note.id ? { ...n, isRead: false } : n))
        )
        setUnreadCount((prev) => prev + 1)
      }
    }
  }

  // 5. Mark all as read logic
  const handleMarkAllAsRead = async () => {
    if (!token || unreadCount === 0) return
    
    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    const previousUnread = unreadCount
    setUnreadCount(0)

    try {
      await axios.put(`${apiBaseUrl}/api/v1/notifications/read-all`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err)
      // Rollback on error
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: !prev.some(x => x.id === n.id && !x.isRead) })))
      setUnreadCount(previousUnread)
    }
  }

  // 6. Category to Icon renderer
  const renderCategoryIcon = (category: string) => {
    switch (category) {
      case 'SYSTEM':
        return (
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-950/40 text-purple-400 border border-purple-500/10">
            <Megaphone className="h-4 w-4" />
          </div>
        )
      case 'TRANSACTION':
        return (
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-950/40 text-emerald-400 border border-emerald-500/10">
            <CreditCard className="h-4 w-4" />
          </div>
        )
      case 'GAME':
        return (
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-950/40 text-rose-400 border border-rose-500/10">
            <Gamepad2 className="h-4 w-4" />
          </div>
        )
      default:
        return (
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-slate-400">
            <Bell className="h-4 w-4" />
          </div>
        )
    }
  }

  // Helper to format date
  const formatRelativeTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMins / 60)
      const diffDays = Math.floor(diffHours / 24)

      if (diffMins < 1) return '剛剛'
      if (diffMins < 60) return `${diffMins} 分鐘前`
      if (diffHours < 24) return `${diffHours} 小時前`
      if (diffDays < 7) return `${diffDays} 天前`
      return date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    } catch (e) {
      return '未知時間'
    }
  }

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center text-slate-400 hover:text-white bg-slate-900/50 hover:bg-slate-800/60 border-2 border-slate-800/80 rounded-full transition duration-200 cursor-pointer shadow-sm focus:outline-none w-[48px] h-[48px] flex-shrink-0"
        aria-label="Notifications"
      >
        <Bell className={`h-5.5 w-5.5 ${isOpen ? 'text-white' : ''}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-slate-950 animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div 
          className="absolute right-0 mt-3 sm:w-96 origin-top-right rounded-2xl border border-emerald-900/60 bg-[#12201a]/95 backdrop-blur-md shadow-2xl z-50 transform opacity-100 scale-100 transition-all duration-200"
          style={{
            width: '360px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-emerald-900/50 bg-transparent">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-200">通知訊息</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md">
                  {unreadCount} 則未讀
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 hover:text-emerald-300 transition duration-150 cursor-pointer focus:outline-none"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                全部標記為已讀
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-[360px] overflow-y-auto flex flex-col gap-2 pr-1">
            {loading && notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-500">
                <Loader2 className="h-6 w-6 animate-spin text-purple-500 mb-2" />
                <span className="text-xs">載入通知中...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-800/30 text-slate-600 mb-3">
                  <Bell className="h-5 w-5" />
                </div>
                <p className="text-sm font-medium text-slate-400">沒有任何通知</p>
                <p className="text-xs text-slate-600 mt-1">當有新的系統消息或帳務異動時，會在這裡顯示。</p>
              </div>
            ) : (
              notifications.map((note) => (
                <div
                  key={note.id}
                  onClick={() => handleNotificationClick(note)}
                  className={`flex items-start gap-4 px-4 py-3.5 transition duration-200 cursor-pointer rounded-xl ${
                    note.isRead
                      ? 'bg-slate-900/20 hover:bg-slate-800/30 text-slate-400'
                      : 'bg-purple-950/10 hover:bg-purple-950/15 text-slate-200 border-l-2 border-purple-500 shadow-sm'
                  }`}
                >
                  {/* Category icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    {renderCategoryIcon(note.category)}
                  </div>

                  {/* Title & Description */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-xs font-semibold truncate ${note.isRead ? 'text-slate-300' : 'text-white'}`}>
                        {note.title}
                      </p>
                      <span className="text-[10px] text-slate-500 whitespace-nowrap">
                        {formatRelativeTime(note.lmDate)}
                      </span>
                    </div>
                    <p className={`text-[11px] leading-relaxed mt-1 line-clamp-2 ${note.isRead ? 'text-slate-500' : 'text-slate-300'}`}>
                      {note.content}
                    </p>
                  </div>

                  {/* Unread indicator dot */}
                  {!note.isRead && (
                    <div className="flex-shrink-0 self-center w-1.5 h-1.5 bg-purple-500 rounded-full shadow-[0_0_6px_#8b5cf6]" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
