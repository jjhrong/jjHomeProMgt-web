import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { Plus, Sparkles, User, Calendar, Key, ChevronRight, Loader2, Compass, AlertCircle, RefreshCw } from 'lucide-react'
import { ExplorationWizardModal, type ChildrenProfile } from './ExplorationWizardModal'
import { LineBindModal } from './LineBindModal'

interface ExplorationEntryProps {
  token: string | null
  apiBaseUrl: string
}

export const ExplorationEntry: React.FC<ExplorationEntryProps> = ({ token, apiBaseUrl }) => {
  const [profiles, setProfiles] = useState<ChildrenProfile[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState<boolean>(false)

  // Sub-modal states
  const [selectedProfile, setSelectedProfile] = useState<ChildrenProfile | null>(null)
  const [isWizardOpen, setIsWizardOpen] = useState<boolean>(false)
  const [isLineBindOpen, setIsLineBindOpen] = useState<boolean>(false)
  const [activePairCode, setActivePairCode] = useState<string>('')
  const [activeProfileId, setActiveProfileId] = useState<string>('')

  // Fetch children profiles from GET /api/v1/children-profiles
  const fetchProfiles = async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const res = await axios.get(`${apiBaseUrl}/api/v1/children-profiles`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (Array.isArray(res.data)) {
        setProfiles(res.data)
      } else {
        setProfiles([])
      }
    } catch (err: any) {
      console.error('Failed to fetch children profiles:', err)
      setError(err.response?.data?.error || '資料庫中尚未建立 children_profiles 表格，或伺服器正在更新中。')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfiles()
  }, [token, apiBaseUrl])

  // Click "+ 啟動新探索" -> POST /api/v1/children-profiles to create a blank draft
  const handleStartNewExploration = async () => {
    if (!token) return
    setCreating(true)
    setError(null)
    try {
      const res = await axios.post(
        `${apiBaseUrl}/api/v1/children-profiles`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      const newProfile: ChildrenProfile = res.data?.profile || res.data
      if (newProfile) {
        setSelectedProfile(newProfile)
        setIsWizardOpen(true)
        fetchProfiles()
      }
    } catch (err: any) {
      console.error('Failed to create draft child profile:', err)
      setError(err.response?.data?.error || '建立探索檔案失敗，請檢查資料庫狀態或連線')
    } finally {
      setCreating(false)
    }
  }

  // Click existing profile card -> Open Wizard
  const handleOpenExistingProfile = (profile: ChildrenProfile) => {
    setSelectedProfile(profile)
    setIsWizardOpen(true)
  }

  // Handle Wizard complete -> Open LineBindModal
  const handleWizardComplete = (pairCode: string, profileId: string) => {
    setIsWizardOpen(false)
    setActivePairCode(pairCode)
    setActiveProfileId(profileId)
    setIsLineBindOpen(true)
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '近期建立'
    try {
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) return dateStr
      return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(
        date.getDate()
      ).padStart(2, '0')}`
    } catch {
      return dateStr
    }
  }

  return (
    <div className="w-full space-y-4 text-slate-100">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-900/60 border border-slate-800 rounded-xl backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/15 border border-emerald-500/30 rounded-lg text-emerald-400">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              心芽萬花童 - 親子探索管理
              <Sparkles className="w-4 h-4 text-amber-400" />
            </h2>
            <p className="text-xs text-slate-400">
              設定小朋友每日 AI 探索任務、生活紀錄與 LINE 機器人對話綁定
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchProfiles}
          disabled={loading}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors border border-slate-700"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>重新整理</span>
        </button>
      </div>

      {/* Error Alert Box */}
      {error && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center justify-between gap-3 text-xs text-rose-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchProfiles}
            className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 rounded-md font-medium shrink-0 transition-colors"
          >
            重試
          </button>
        </div>
      )}

      {/* Responsive Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* CARD 1: [ + 啟動新探索 ] Special Accent Card */}
        <button
          type="button"
          onClick={handleStartNewExploration}
          disabled={creating}
          className="group relative p-5 rounded-xl bg-gradient-to-br from-emerald-950/70 via-slate-900 to-teal-950/60 border border-emerald-500/40 hover:border-emerald-400 shadow-lg hover:shadow-emerald-950/50 transition-all duration-200 hover:-translate-y-0.5 flex flex-col justify-between min-h-[170px] text-left cursor-pointer overflow-hidden"
        >
          {/* Ambient Glow */}
          <div className="absolute -top-12 -right-12 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl pointer-events-none group-hover:bg-emerald-500/20 transition-all" />

          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 group-hover:scale-105 transition-transform">
                {creating ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Plus className="w-5 h-5 stroke-[2.5]" />
                )}
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                新探索
              </span>
            </div>

            <h3 className="text-base font-bold text-slate-100 group-hover:text-emerald-300 transition-colors flex items-center gap-1.5">
              + 啟動新探索
              <Sparkles className="w-3.5 h-3.5 text-amber-400 opacity-80" />
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed line-clamp-2">
              建立新小朋友的專屬探索檔案、3步驟引導設定與 LINE 連動密碼
            </p>
          </div>

          <div className="flex items-center justify-between text-xs font-semibold text-emerald-400 pt-3 border-t border-emerald-500/20">
            <span>{creating ? '建立草稿中...' : '點擊開始設定'}</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        {/* Loading Skeleton */}
        {loading && profiles.length === 0 && (
          <div className="col-span-full py-10 flex flex-col items-center justify-center text-slate-400 gap-2">
            <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
            <span className="text-xs">讀取小朋友探索檔案中...</span>
          </div>
        )}

        {/* Existing Child Profile Cards */}
        {profiles.map((prof) => {
          const childName = prof.childName || prof.name || '未命名小朋友'
          const dateDisplay = formatDate(prof.createdAt)

          return (
            <div
              key={prof.id}
              onClick={() => handleOpenExistingProfile(prof)}
              className="group relative p-5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/50 shadow-md hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5 flex flex-col justify-between min-h-[170px] cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 group-hover:text-emerald-400 group-hover:border-emerald-500/40 transition-colors">
                    <User className="w-4 h-4" />
                  </div>
                  {prof.pairCode && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                      <Key className="w-3 h-3" />
                      {prof.pairCode}
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold text-slate-100 group-hover:text-emerald-300 transition-colors">
                  {childName} 探索
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>建立日期：{dateDisplay}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs font-medium text-slate-400 group-hover:text-emerald-400 pt-3 border-t border-slate-800/80 transition-colors">
                <span>維護設定參數</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          )
        })}
      </div>

      {/* Exploration Wizard Modal */}
      <ExplorationWizardModal
        isOpen={isWizardOpen}
        profile={selectedProfile}
        token={token}
        apiBaseUrl={apiBaseUrl}
        onClose={() => setIsWizardOpen(false)}
        onComplete={handleWizardComplete}
        onProfileUpdated={(updated) => {
          setSelectedProfile(updated)
          fetchProfiles()
        }}
      />

      {/* LINE Binding Modal */}
      <LineBindModal
        isOpen={isLineBindOpen}
        pairCode={activePairCode}
        profileId={activeProfileId}
        token={token}
        apiBaseUrl={apiBaseUrl}
        onClose={() => setIsLineBindOpen(false)}
      />
    </div>
  )
}
