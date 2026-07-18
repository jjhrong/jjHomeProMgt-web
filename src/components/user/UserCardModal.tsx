import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { X, UserPlus, Loader2, AlertCircle } from 'lucide-react'

export interface AssetBalanceDTO {
  category_code: string
  category_name: string
  balance: number
}

export interface UserCardResponseDTO {
  id: string
  nickname: string
  real_name: string
  avatar_url: string
  description: string
  friend_status: number // 0待審核、1失效、8正式好友、-1陌生人
  balances: AssetBalanceDTO[]
  win_rate: number
  mainTitle?: string
  subTitle?: string
  combinedTitle?: string
}

interface UserCardModalProps {
  userId: string
  currentUserId: string
  token: string | null
  apiBaseUrl: string
  onClose: () => void
  onEdit: () => void
}

export const UserCardModal: React.FC<UserCardModalProps> = ({
  userId,
  currentUserId,
  token,
  apiBaseUrl,
  onClose,
  onEdit,
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isApplying, setIsApplying] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [cardDetails, setCardDetails] = useState<UserCardResponseDTO | null>(null)
  const [hasApplied, setHasApplied] = useState<boolean>(false)

  // Ensure baseURL joining doesn't end up with // double slash
  const cleanUrl = (base: string, path: string): string => {
    const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base
    const cleanPath = path.startsWith('/') ? path : '/' + path
    return `${cleanBase}${cleanPath}`
  }

  const fetchUserCard = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const headers: Record<string, string> = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      const res = await axios.get<UserCardResponseDTO>(
        cleanUrl(apiBaseUrl, `/api/v1/users/${userId}`),
        { headers }
      )
      setCardDetails(res.data)
    } catch (err: any) {
      console.error('Failed to fetch user card details:', err)
      setError(err.response?.data?.error || '無法取得該使用者詳細資料')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (userId) {
      fetchUserCard()
      setHasApplied(false)
    }
  }, [userId, apiBaseUrl, token])

  const handleApplyFriend = async () => {
    if (!token) return
    setIsApplying(true)
    setError(null)
    try {
      await axios.post(
        cleanUrl(apiBaseUrl, '/api/v1/friends'),
        { target_user_id: userId },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setHasApplied(true)
    } catch (err: any) {
      console.error('Failed to apply friend:', err)
      setError(err.response?.data?.error || '發送好友申請失敗，請稍後再試。')
    } finally {
      setIsApplying(false)
    }
  }

  const getBalance = (code: string): number => {
    if (!cardDetails || !cardDetails.balances) return 0
    const balanceItem = cardDetails.balances.find((b) => b.category_code === code)
    return balanceItem ? balanceItem.balance : 0
  }

  if (isLoading) {
    return (
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md"
        onClick={onClose}
      >
        <div 
          className="relative w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/90 text-slate-200 shadow-2xl backdrop-blur-xl p-8 flex flex-col items-center justify-center min-h-[300px]"
          onClick={(e) => e.stopPropagation()}
        >
          <Loader2 className="w-10 h-10 text-violet-500 animate-spin mb-4" />
          <p className="text-slate-400 text-sm">載入資料中...</p>
        </div>
      </div>
    )
  }

  if (error && !cardDetails) {
    return (
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md"
        onClick={onClose}
      >
        <div 
          className="relative w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/90 text-slate-200 shadow-2xl backdrop-blur-xl p-8 flex flex-col items-center justify-center min-h-[300px]"
          onClick={(e) => e.stopPropagation()}
        >
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors cursor-pointer p-1.5 rounded-full hover:bg-white/5"
          >
            <X className="w-5 h-5" />
          </button>
          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
          <p className="text-red-400 text-sm font-semibold mb-6 text-center">{error}</p>
          <button 
            onClick={fetchUserCard}
            className="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-full text-sm font-semibold shadow-md transition-colors cursor-pointer"
          >
            重試
          </button>
        </div>
      </div>
    )
  }

  if (!cardDetails) return null

  const isSelf = currentUserId === cardDetails.id
  const isFriend = (cardDetails.friend_status & 8) === 8
  const isPending = cardDetails.friend_status === 0
  const winRate = cardDetails.win_rate || 0

  // Balances
  const coinBalance = getBalance('COIN_J')
  const expBalance = getBalance('EXP_PERSONAL')
  const dayBalance = getBalance('EXP_DAY')
  const friendCount = getBalance('FRIEND_COUNT')

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={onClose}>
      <div 
        className="glass-panel modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ position: 'relative' }}
      >
        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors cursor-pointer p-1.5 rounded-full hover:bg-white/5"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Upper Section: Avatar, Nickname and Actions */}
        <div className="flex items-center gap-4 mt-2">
          {/* Avatar */}
          <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-violet-500/50 bg-slate-950/50 flex-shrink-0 flex items-center justify-center text-2xl font-bold text-violet-400 shadow-inner">
            {cardDetails.avatar_url ? (
              <img 
                src={cardDetails.avatar_url} 
                alt={cardDetails.nickname} 
                className="w-full h-full object-cover" 
              />
            ) : (
              cardDetails.nickname ? cardDetails.nickname.charAt(0).toUpperCase() : 'U'
            )}
          </div>

          {/* Nickname & Combined Title */}
          <div className="flex flex-col min-w-0">
            <h3 className="text-xl font-bold text-white truncate" title={cardDetails.nickname}>
              {cardDetails.nickname}
            </h3>
            {cardDetails.combinedTitle ? (
              <span className="text-xs font-semibold text-violet-400 mt-1 truncate" title={cardDetails.combinedTitle}>
                👑 {cardDetails.combinedTitle}
              </span>
            ) : (
              <span className="text-xs text-slate-400 mt-1">一般用戶</span>
            )}
          </div>

          {/* Action button */}
          <div className="ml-auto flex-shrink-0">
            {isSelf ? (
              <button 
                onClick={onEdit} 
                className="px-4 py-2 text-xs font-semibold rounded-full border border-violet-500/35 bg-violet-600/10 text-violet-300 hover:bg-violet-600/30 hover:border-violet-500/70 transition-all duration-300 cursor-pointer shadow-md"
              >
                編輯資訊
              </button>
            ) : isFriend ? (
              <span className="px-4 py-2 text-xs font-semibold rounded-full bg-slate-800 text-slate-400 border border-slate-700 shadow-sm">
                朋友
              </span>
            ) : (isPending || hasApplied) ? (
              <span className="px-4 py-2 text-xs font-semibold rounded-full bg-slate-800/50 text-slate-500 border border-slate-700/50 shadow-sm">
                已申請
              </span>
            ) : (
              <button 
                onClick={handleApplyFriend}
                disabled={isApplying}
                className="px-4 py-2 text-xs font-semibold rounded-full bg-blue-600 text-white hover:bg-blue-500 transition-all duration-300 cursor-pointer disabled:opacity-50 flex items-center gap-1 shadow-lg shadow-blue-600/20 active:scale-95"
              >
                {isApplying ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <UserPlus className="w-3.5 h-3.5" />
                )}
                朋友+
              </button>
            )}
          </div>
        </div>

        {/* Small inline error alert inside modal */}
        {error && (
          <div className="p-3 bg-red-500/15 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-400 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}



        {/* Middle Section: Assets Grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {/* COIN_J Card */}
          <div className="col-span-2 sm:col-span-1 p-4 rounded-2xl bg-white/5 border border-white/5 flex flex-col justify-between min-h-[80px] transition-all duration-300 hover:bg-white/8">
            <span className="text-xs text-slate-400 font-medium">J幣餘額</span>
            <span className="text-lg font-bold text-violet-300 mt-2 font-mono">
              {coinBalance.toLocaleString()}
            </span>
          </div>

          {/* EXP_PERSONAL Card */}
          <div className="col-span-2 sm:col-span-1 p-4 rounded-2xl bg-white/5 border border-white/5 flex flex-col justify-between min-h-[80px] transition-all duration-300 hover:bg-white/8">
            <span className="text-xs text-slate-400 font-medium">個人經驗值</span>
            <span className="text-lg font-bold text-teal-300 mt-2 font-mono">
              {expBalance.toLocaleString()}
            </span>
          </div>

          {/* EXP_DAY Card */}
          <div className="col-span-1 p-4 rounded-2xl bg-white/5 border border-white/5 flex flex-col justify-between min-h-[80px] transition-all duration-300 hover:bg-white/8">
            <span className="text-xs text-slate-400 font-medium">經驗日</span>
            <span className="text-lg font-bold text-amber-300 mt-2 font-mono">
              {dayBalance.toLocaleString()}
            </span>
          </div>

          {/* FRIEND_COUNT Card */}
          <div className="col-span-1 p-4 rounded-2xl bg-white/5 border border-white/5 flex flex-col justify-between min-h-[80px] transition-all duration-300 hover:bg-white/8">
            <span className="text-xs text-slate-400 font-medium">好友數</span>
            <span className="text-lg font-bold text-blue-300 mt-2 font-mono">
              {friendCount.toLocaleString()}
            </span>
          </div>

          {/* WIN_RATE Card */}
          <div className="col-span-2 p-3.5 rounded-2xl bg-gradient-to-r from-violet-600/15 to-blue-600/15 border border-white/5 flex items-center justify-between transition-all duration-300 hover:bg-gradient-to-r hover:from-violet-600/20 hover:to-blue-600/20">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-slate-400">遊戲勝率</span>
              <span className="text-[10px] text-slate-500">勝率越高代表遊戲技巧越熟練</span>
            </div>
            <span className="text-xl font-black bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent font-mono">
              {winRate.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Bottom Section: Description */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">個人簡介</span>
          <div className="p-4 rounded-2xl bg-slate-950/40 border border-white/5 text-slate-300 text-sm leading-relaxed min-h-[80px] break-words">
            {cardDetails.description || '這個人很懶，什麼都沒留下...'}
          </div>
        </div>
      </div>
    </div>
  )
}
