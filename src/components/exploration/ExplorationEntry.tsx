import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { Plus, Sparkles, User, Calendar, Key, ChevronRight, Loader2, Compass, AlertCircle } from 'lucide-react'
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
      setError(err.response?.data?.error || '無法取得小朋友探索檔案清單')
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
        // Refresh list
        fetchProfiles()
      }
    } catch (err: any) {
      console.error('Failed to create draft child profile:', err)
      setError(err.response?.data?.error || '建立探索檔案失敗，請檢查網路或系統權限')
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
    <div className="w-full max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      {/* Top Banner & Header */}
      <div className="relative overflow-hidden bg-slate-900/80 border border-emerald-500/30 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-md">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/15 border border-emerald-500/30 rounded-full text-emerald-400 text-xs font-semibold">
              <Compass className="w-3.5 h-3.5" />
              <span>親子教育 - 心芽萬花童</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-100 flex items-center gap-2">
              啟動探索設定
              <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
            </h1>
            <p className="text-xs md:text-sm text-slate-400 max-w-xl">
              為小朋友設定每日個性化探索任務，開啟 AI 親子對話、任務紀錄與專屬 LINE 機器人互動。
            </p>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-3 text-sm text-rose-300 shadow-md">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Cards List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* CARD 1: [ + 啟動新探索 ] Card (Highlight Style) */}
        <button
          type="button"
          onClick={handleStartNewExploration}
          disabled={creating}
          className="relative group p-6 rounded-2xl bg-gradient-to-br from-emerald-950/60 via-slate-900/80 to-teal-950/60 border-2 border-dashed border-emerald-500/50 hover:border-emerald-400 shadow-xl hover:shadow-2xl hover:shadow-emerald-950/50 transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between min-h-[220px] text-left cursor-pointer"
        >
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform">
              {creating ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <Plus className="w-6 h-6 stroke-[3]" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100 group-hover:text-emerald-300 transition-colors flex items-center gap-2">
                + 啟動新探索
                <Sparkles className="w-4 h-4 text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                建立新小朋友的專屬探索檔案，設定導引與 LINE 連動密碼
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs font-semibold text-emerald-400 pt-4 border-t border-emerald-500/20">
            <span>{creating ? '建立草稿中...' : '點擊開始設定'}</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        {/* Existing Profiles Loading State */}
        {loading && profiles.length === 0 && (
          <div className="col-span-full py-12 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            <span className="text-xs">正在讀取小朋友探索清單...</span>
          </div>
        )}

        {/* Existing Profile Cards */}
        {profiles.map((prof) => {
          const childName = prof.childName || prof.name || '未命名小朋友'
          const dateDisplay = formatDate(prof.createdAt)

          return (
            <div
              key={prof.id}
              onClick={() => handleOpenExistingProfile(prof)}
              className="relative group p-6 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/60 shadow-xl hover:shadow-2xl hover:shadow-slate-950 transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between min-h-[220px] cursor-pointer"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-slate-800/80 border border-slate-700/60 rounded-xl text-slate-200 group-hover:bg-emerald-500/15 group-hover:text-emerald-400 group-hover:border-emerald-500/40 transition-colors">
                    <User className="w-5 h-5" />
                  </div>
                  {prof.pairCode && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                      <Key className="w-3 h-3" />
                      {prof.pairCode}
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-base md:text-lg font-bold text-slate-100 group-hover:text-emerald-300 transition-colors">
                    {childName} 探索
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>建立日期：{dateDisplay}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs font-medium text-slate-400 group-hover:text-emerald-400 pt-4 border-t border-slate-800 transition-colors">
                <span>點擊維護設定參數</span>
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
