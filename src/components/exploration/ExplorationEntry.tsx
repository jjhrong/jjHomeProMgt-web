import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { Plus, Sparkles, User, Calendar, Key, ChevronRight, Loader2, AlertCircle, RefreshCw } from 'lucide-react'
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

  // Check if a profile is a blank unedited draft (no name or default placeholder "新小朋友")
  const isBlankDraft = (p: ChildrenProfile) => {
    const name = (p.childName || p.name || '').trim()
    return !name || name === '新小朋友'
  }

  // Fetch children profiles from GET /api/v1/children-profiles & auto-clean blank drafts
  const fetchProfiles = async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const res = await axios.get(`${apiBaseUrl}/api/v1/children-profiles`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      const rawProfiles: ChildrenProfile[] = Array.isArray(res.data) ? res.data : []

      // 需求 3：進入功能時把自己下面沒有輸入小朋友姓名的資料直接刪除
      const blankDrafts = rawProfiles.filter((p) => isBlankDraft(p))
      const validProfiles = rawProfiles.filter((p) => !isBlankDraft(p))

      // Auto-delete blank profiles in background
      if (blankDrafts.length > 0) {
        blankDrafts.forEach((draft) => {
          axios
            .delete(`${apiBaseUrl}/api/v1/children-profiles/${draft.id}`, {
              headers: { Authorization: `Bearer ${token}` },
            })
            .catch((err) => {
              console.warn('Auto-clean blank profile error:', err)
            })
        })
      }

      setProfiles(validProfiles)
    } catch (err: any) {
      console.error('Failed to fetch children profiles:', err)
      setError(err.response?.data?.error || '無法取得小朋友探索檔案清單')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfiles()
  }, [token, apiBaseUrl])

  // Click "+ 啟動新探索" -> 若有尚未完成連動的草稿，繼續編輯該草稿；若無則 POST 建立新草稿
  const handleStartNewExploration = async () => {
    if (!token) return
    setCreating(true)
    setError(null)
    try {
      // 檢查是否已有輸入姓名但尚未完成 LINE 綁定的草稿
      const uncompletedDraft = profiles.find((p) => !p.lineUserId)

      if (uncompletedDraft) {
        // 直接當成草稿開啟繼續新增編輯
        setSelectedProfile(uncompletedDraft)
        setIsWizardOpen(true)
        setCreating(false)
        return
      }

      // 否則建立全新草稿
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
      {/* Page Description Only */}
      <div className="flex items-center justify-between gap-3 text-sm text-slate-300 py-1">
        <p className="font-medium">設定小朋友每日 AI 探索任務、生活紀錄與 LINE 機器人對話綁定</p>
        <button
          type="button"
          onClick={fetchProfiles}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-colors border border-slate-700 shrink-0"
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
        {/* CARD 1: [ + 啟動新探索 ] Special Accent Card */}
        <button
          type="button"
          onClick={handleStartNewExploration}
          disabled={creating}
          className="group relative p-5 rounded-xl bg-gradient-to-br from-emerald-950/70 via-slate-900 to-teal-950/60 border border-emerald-500/40 hover:border-emerald-400 shadow-lg hover:shadow-emerald-950/50 transition-all duration-200 hover:-translate-y-0.5 flex flex-col justify-between min-h-[160px] text-left cursor-pointer overflow-hidden"
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
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              建立新小朋友的專屬探索檔案、3步驟引導設定與 LINE 連動密碼
            </p>
          </div>

          <div className="flex items-center justify-between text-xs font-semibold text-emerald-400 pt-3 border-t border-emerald-500/20">
            <span>{creating ? '處理中...' : '點擊開始設定'}</span>
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
          const isBound = !!prof.lineUserId

          return (
            <div
              key={prof.id}
              onClick={() => handleOpenExistingProfile(prof)}
              className="group relative p-5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/50 shadow-md hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5 flex flex-col justify-between min-h-[160px] cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 group-hover:text-emerald-400 group-hover:border-emerald-500/40 transition-colors">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="flex items-center gap-2">
                    {!isBound && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-400">
                        未連動草稿
                      </span>
                    )}
                    {prof.pairCode && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                        <Key className="w-3 h-3" />
                        {prof.pairCode}
                      </span>
                    )}
                  </div>
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
                <span>{isBound ? '維護設定參數' : '繼續編輯草稿'}</span>
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
