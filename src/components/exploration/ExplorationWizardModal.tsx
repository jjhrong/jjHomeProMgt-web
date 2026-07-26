import React, { useState, useEffect, useRef, useCallback } from 'react'
import axios from 'axios'
import {
  X,
  ChevronLeft,
  ChevronRight,
  Send,
  User,
  Calendar,
  Compass,
  Bell,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Briefcase,
  Gift,
  BookOpen,
  Camera,
  MessageSquare,
  ListTodo,
  Sparkles,
} from 'lucide-react'

export interface ChildrenProfile {
  id: string
  parentUserId?: string
  childId?: string
  childName?: string
  name?: string
  birthday?: string
  parentDreamJob?: string
  parentDreamItem?: string
  pairCode?: string
  lineUserId?: string
  isModeSelectable?: boolean
  allowFiveThings?: boolean
  allowFiveQna?: boolean
  allowFiveQnA?: boolean
  allowDiary?: boolean
  allowPhoto?: boolean
  remindParent?: boolean
  remindParentTime?: string
  remindChild?: boolean
  remindChildTime?: string
  remindTime?: string
  minDiaryLength?: number
  createdAt?: string
}

interface ExplorationWizardModalProps {
  isOpen: boolean
  profile: ChildrenProfile | null
  token: string | null
  apiBaseUrl: string
  onClose: () => void
  onComplete: (pairCode: string, profileId: string) => void
  onProfileUpdated?: (updated: ChildrenProfile) => void
}

export const ExplorationWizardModal: React.FC<ExplorationWizardModalProps> = ({
  isOpen,
  profile,
  token,
  apiBaseUrl,
  onClose,
  onComplete,
  onProfileUpdated,
}) => {
  const [step, setStep] = useState<number>(1)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string>('')

  // Form State
  const [formData, setFormData] = useState({
    childName: '',
    birthday: '',
    parentDreamJob: '',
    parentDreamItem: '',
    isModeSelectable: true,
    allowFiveThings: true,
    allowFiveQna: true,
    allowDiary: true,
    allowPhoto: true,
    remindParent: true,
    remindParentTime: '20:00',
    remindChild: true,
    remindChildTime: '19:00',
    minDiaryLength: 50,
  })

  // Prevent auto-save on initial profile load
  const isInitialMount = useRef(true)
  const debounceTimerRef = useRef<any>(null)

  // Sync initial profile values when modal opens or profile changes
  useEffect(() => {
    if (isOpen && profile) {
      isInitialMount.current = true
      setStep(1)
      setSaveStatus('idle')
      setErrorMessage('')

      setFormData({
        childName: profile.childName || profile.name || '',
        birthday: profile.birthday || '',
        parentDreamJob: profile.parentDreamJob || '',
        parentDreamItem: profile.parentDreamItem || '',
        isModeSelectable: profile.isModeSelectable ?? true,
        allowFiveThings: profile.allowFiveThings ?? true,
        allowFiveQna: profile.allowFiveQnA ?? profile.allowFiveQna ?? true,
        allowDiary: profile.allowDiary ?? true,
        allowPhoto: profile.allowPhoto ?? true,
        remindParent: profile.remindParent ?? true,
        remindParentTime: profile.remindParentTime || profile.remindTime || '20:00',
        remindChild: profile.remindChild ?? true,
        remindChildTime: profile.remindChildTime || '19:00',
        minDiaryLength: profile.minDiaryLength || 50,
      })

      // Mark mount finished on next event tick
      setTimeout(() => {
        isInitialMount.current = false
      }, 100)
    }
  }, [isOpen, profile])

  // Execute PUT auto-save call to backend
  const executeSave = useCallback(
    async (currentData: typeof formData) => {
      if (!profile?.id || !token) return
      setSaveStatus('saving')
      setErrorMessage('')
      try {
        const payload = {
          name: currentData.childName,
          childName: currentData.childName,
          birthday: currentData.birthday,
          parentDreamJob: currentData.parentDreamJob,
          parentDreamItem: currentData.parentDreamItem,
          isModeSelectable: currentData.isModeSelectable,
          allowFiveThings: currentData.allowFiveThings,
          allowFiveQna: currentData.allowFiveQna,
          allowDiary: currentData.allowDiary,
          allowPhoto: currentData.allowPhoto,
          remindParent: currentData.remindParent,
          remindParentTime: currentData.remindParentTime,
          remindChild: currentData.remindChild,
          remindChildTime: currentData.remindChildTime,
          remindTime: currentData.remindParentTime,
          minDiaryLength: Number(currentData.minDiaryLength) || 50,
        }

        const res = await axios.put(
          `${apiBaseUrl}/api/v1/children-profiles/${profile.id}`,
          payload,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        )

        setSaveStatus('saved')
        if (onProfileUpdated && res.data) {
          onProfileUpdated(res.data)
        }
      } catch (err: any) {
        console.error('Auto-save error:', err)
        setSaveStatus('error')
        setErrorMessage(err.response?.data?.error || '即時儲存失敗，請檢查網路連線')
      }
    },
    [profile?.id, token, apiBaseUrl, onProfileUpdated]
  )

  // Auto-save trigger effect with 500ms debounce
  useEffect(() => {
    if (isInitialMount.current || !isOpen || !profile?.id) return

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    setSaveStatus('saving')
    debounceTimerRef.current = setTimeout(() => {
      executeSave(formData)
    }, 500)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [formData, isOpen, profile?.id, executeSave])

  if (!isOpen || !profile) return null

  const handleInputChange = (field: keyof typeof formData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleNextStep = () => {
    if (step < 3) {
      setStep((prev) => prev + 1)
    }
  }

  const handlePrevStep = () => {
    if (step > 1) {
      setStep((prev) => prev - 1)
    }
  }

  const handleSubmitStart = async () => {
    // Final explicit save before closing
    await executeSave(formData)
    const pairCode = profile.pairCode || '888888'
    onComplete(pairCode, profile.id)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-slate-900/95 border border-emerald-500/30 rounded-2xl shadow-2xl shadow-emerald-950/50 p-6 md:p-8 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-bold text-slate-100 flex items-center gap-2">
                心芽萬花童 - 探索設定導引
              </h2>
              <p className="text-xs text-slate-400">步驟 {step} / 3：完成小朋友個性化探索參數</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Auto-save Status Indicator */}
            <div className="text-xs flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700">
              {saveStatus === 'saving' && (
                <>
                  <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                  <span className="text-amber-300">儲存中...</span>
                </>
              )}
              {saveStatus === 'saved' && (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-medium">已即時儲存</span>
                </>
              )}
              {saveStatus === 'idle' && (
                <span className="text-slate-400">自動儲存開啟</span>
              )}
              {saveStatus === 'error' && (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                  <span className="text-rose-400">儲存失敗</span>
                </>
              )}
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Step Progress Bar */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          <div
            className={`h-1.5 rounded-full transition-all ${
              step >= 1 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-800'
            }`}
          />
          <div
            className={`h-1.5 rounded-full transition-all ${
              step >= 2 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-800'
            }`}
          />
          <div
            className={`h-1.5 rounded-full transition-all ${
              step >= 3 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-800'
            }`}
          />
        </div>

        {/* Error Alert Message */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Step Contents Container (Scrollable) */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-5 custom-scrollbar">
          {/* STEP 1: 小朋友資訊設定 */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400 mb-2">
                <User className="w-4 h-4" />
                <span>步驟一：小朋友基本資訊</span>
              </div>

              {/* 小朋友姓名 */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  小朋友姓名 <span className="text-emerald-400">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={formData.childName}
                    onChange={(e) => handleInputChange('childName', e.target.value)}
                    placeholder="請輸入小朋友的姓名或暱稱"
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 focus:border-emerald-500 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all"
                  />
                </div>
              </div>

              {/* 小朋友生日 */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  小朋友生日
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="date"
                    value={formData.birthday}
                    onChange={(e) => handleInputChange('birthday', e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 focus:border-emerald-500 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all"
                  />
                </div>
              </div>

              {/* 未來想成為的人 */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  未來想成為的人
                </label>
                <div className="relative">
                  <Briefcase className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={formData.parentDreamJob}
                    onChange={(e) => handleInputChange('parentDreamJob', e.target.value)}
                    placeholder="家長所認知的，例如：太空人、畫家、科學家"
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 focus:border-emerald-500 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all"
                  />
                </div>
              </div>

              {/* 最想獲得的東西 */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  最想獲得的東西
                </label>
                <div className="relative">
                  <Gift className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={formData.parentDreamItem}
                    onChange={(e) => handleInputChange('parentDreamItem', e.target.value)}
                    placeholder="家長所認知的，例如：天文望遠鏡、腳踏車"
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 focus:border-emerald-500 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: 探索模式設定 */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400 mb-2">
                <Compass className="w-4 h-4" />
                <span>步驟二：每日探索功能模式</span>
              </div>

              <div className="space-y-3">
                {/* 開關：是否自選 */}
                <div className="flex items-center justify-between p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/15 text-blue-400 rounded-lg">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-200">是否允許自由選擇模式</div>
                      <div className="text-xs text-slate-400">允許小朋友自由切換探索任務</div>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isModeSelectable}
                      onChange={(e) => handleInputChange('isModeSelectable', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

                {/* 開關：每日五件事 */}
                <div className="flex items-center justify-between p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/15 text-emerald-400 rounded-lg">
                      <ListTodo className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-200">是否每日五件事</div>
                      <div className="text-xs text-slate-400">紀錄與完成每日 5 項生活小任務</div>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.allowFiveThings}
                      onChange={(e) => handleInputChange('allowFiveThings', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

                {/* 開關：每日五問答 */}
                <div className="flex items-center justify-between p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/15 text-purple-400 rounded-lg">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-200">是否每日五問答</div>
                      <div className="text-xs text-slate-400">與 AI 進行每日 5 題互動探索問答</div>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.allowFiveQna}
                      onChange={(e) => handleInputChange('allowFiveQna', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

                {/* 開關：每日一日記 */}
                <div className="flex items-center justify-between p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500/15 text-amber-400 rounded-lg">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-200">是否每日一日記</div>
                      <div className="text-xs text-slate-400">寫下每日心情與心得成長日記</div>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.allowDiary}
                      onChange={(e) => handleInputChange('allowDiary', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

                {/* 開關：每日拍照 */}
                <div className="flex items-center justify-between p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-rose-500/15 text-rose-400 rounded-lg">
                      <Camera className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-200">是否每日拍照紀錄</div>
                      <div className="text-xs text-slate-400">拍照上傳每日生活照片點滴</div>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.allowPhoto}
                      onChange={(e) => handleInputChange('allowPhoto', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: 通知與日記限制設定 */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400 mb-2">
                <Bell className="w-4 h-4" />
                <span>步驟三：推播通知與日記限制設定</span>
              </div>

              {/* 每日提醒家長 */}
              <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-slate-200">每日提醒家長狀態</div>
                    <div className="text-xs text-slate-400">定時發送小孩學習進度總結報告</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.remindParent}
                      onChange={(e) => handleInputChange('remindParent', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>
                {formData.remindParent && (
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">家長提醒時間</label>
                    <input
                      type="time"
                      value={formData.remindParentTime}
                      onChange={(e) => handleInputChange('remindParentTime', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                )}
              </div>

              {/* 每日提醒小孩 */}
              <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-slate-200">每日提醒小孩狀態</div>
                    <div className="text-xs text-slate-400">LINE 機器人定時提醒小孩開始今日探索</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.remindChild}
                      onChange={(e) => handleInputChange('remindChild', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>
                {formData.remindChild && (
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">小孩提醒時間</label>
                    <input
                      type="time"
                      value={formData.remindChildTime}
                      onChange={(e) => handleInputChange('remindChildTime', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                )}
              </div>

              {/* 日記字數最少限制 */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  日記最少字數限制 (個字)
                </label>
                <div className="relative">
                  <BookOpen className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="number"
                    min={10}
                    max={500}
                    value={formData.minDiaryLength}
                    onChange={(e) => handleInputChange('minDiaryLength', Number(e.target.value))}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 focus:border-emerald-500 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="flex items-center justify-between pt-5 border-t border-slate-800 mt-6">
          <div>
            {step > 1 && (
              <button
                type="button"
                onClick={handlePrevStep}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-xl transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>上一步</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {step < 3 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-950/40 transition-all hover:scale-[1.02]"
              >
                <span>下一步</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmitStart}
                disabled={saveStatus === 'saving'}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-950/50 transition-all hover:scale-[1.02] disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>送出啟動</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
