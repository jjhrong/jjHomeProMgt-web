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

  // Prevent auto-save on initial load / when no changes were made
  const isInitialMount = useRef(true)
  const initialFormDataRef = useRef<string>('')
  const debounceTimerRef = useRef<any>(null)

  // Sync initial profile values when modal opens or profile changes
  useEffect(() => {
    if (isOpen && profile) {
      isInitialMount.current = true
      setStep(1)
      setSaveStatus('idle')
      setErrorMessage('')

      const initialValues = {
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
      }

      setFormData(initialValues)
      initialFormDataRef.current = JSON.stringify(initialValues)

      setTimeout(() => {
        isInitialMount.current = false
      }, 150)
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
        initialFormDataRef.current = JSON.stringify(currentData)
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

  // Auto-save trigger effect ONLY when formData is edited by user
  useEffect(() => {
    if (isInitialMount.current || !isOpen || !profile?.id) return

    // Compare current formData with initial saved state
    const currentSerialized = JSON.stringify(formData)
    if (currentSerialized === initialFormDataRef.current) {
      return // No actual edits made, do NOT save!
    }

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
    if (JSON.stringify(formData) !== initialFormDataRef.current) {
      await executeSave(formData)
    }
    const pairCode = profile.pairCode || '888888'
    onComplete(pairCode, profile.id)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 md:p-8 flex flex-col max-h-[88vh] overflow-hidden text-slate-100">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-400">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                心芽萬花童 - 探索設定導引
              </h2>
              <p className="text-sm text-slate-400 mt-0.5">
                步驟 {step} / 3：完成小朋友個性化探索參數
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Auto-save Status Indicator */}
            <div className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/90 border border-slate-700">
              {saveStatus === 'saving' && (
                <>
                  <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                  <span className="text-amber-300 font-medium">儲存中...</span>
                </>
              )}
              {saveStatus === 'saved' && (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-medium">已即時儲存</span>
                </>
              )}
              {saveStatus === 'idle' && (
                <span className="text-slate-400 font-medium">自動儲存開啟</span>
              )}
              {saveStatus === 'error' && (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                  <span className="text-rose-400 font-medium">儲存失敗</span>
                </>
              )}
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 p-2 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Step Progress Pills */}
        <div className="grid grid-cols-3 gap-3 my-6">
          <div
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
              step === 1
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                : step > 1
                ? 'bg-slate-800 border-emerald-500/40 text-emerald-400'
                : 'bg-slate-950 border-slate-800 text-slate-500'
            }`}
          >
            <span>1. 小朋友資訊</span>
          </div>
          <div
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
              step === 2
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                : step > 2
                ? 'bg-slate-800 border-emerald-500/40 text-emerald-400'
                : 'bg-slate-950 border-slate-800 text-slate-500'
            }`}
          >
            <span>2. 探索模式</span>
          </div>
          <div
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
              step === 3
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                : 'bg-slate-950 border-slate-800 text-slate-500'
            }`}
          >
            <span>3. 通知與設定</span>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-4 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2.5 text-sm text-rose-300">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Step Contents Container */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-7 custom-scrollbar">
          {/* STEP 1: 小朋友資訊設定 */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-200">
              <div className="flex items-center gap-2 text-base font-bold text-emerald-400 pb-1 border-b border-slate-800">
                <User className="w-5 h-5" />
                <span>步驟一：小朋友基本資訊</span>
              </div>

              {/* 小朋友姓名 */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-200">
                  小朋友姓名 <span className="text-emerald-400">*</span>
                </label>
                <div className="relative flex items-center">
                  <User className="w-5 h-5 absolute left-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={formData.childName}
                    onChange={(e) => handleInputChange('childName', e.target.value)}
                    placeholder="請輸入小朋友的姓名或暱稱"
                    className="w-full pl-11 pr-4 h-12 bg-slate-950/80 border border-slate-700/80 focus:border-emerald-400 rounded-xl text-slate-100 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium placeholder:text-slate-500 transition-all"
                  />
                </div>
              </div>

              {/* 小朋友生日 */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-200">
                  小朋友生日
                </label>
                <div className="relative flex items-center">
                  <Calendar className="w-5 h-5 absolute left-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="date"
                    value={formData.birthday}
                    onChange={(e) => handleInputChange('birthday', e.target.value)}
                    className="w-full pl-11 pr-4 h-12 bg-slate-950/80 border border-slate-700/80 focus:border-emerald-400 rounded-xl text-slate-100 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium transition-all"
                  />
                </div>
              </div>

              {/* 未來想成為的人 */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-200">
                  未來想成為的人
                </label>
                <div className="relative flex items-center">
                  <Briefcase className="w-5 h-5 absolute left-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={formData.parentDreamJob}
                    onChange={(e) => handleInputChange('parentDreamJob', e.target.value)}
                    placeholder="家長所認知的，例如：太空人、畫家、科學家"
                    className="w-full pl-11 pr-4 h-12 bg-slate-950/80 border border-slate-700/80 focus:border-emerald-400 rounded-xl text-slate-100 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium placeholder:text-slate-500 transition-all"
                  />
                </div>
              </div>

              {/* 最想獲得的東西 */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-200">
                  最想獲得的東西
                </label>
                <div className="relative flex items-center">
                  <Gift className="w-5 h-5 absolute left-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={formData.parentDreamItem}
                    onChange={(e) => handleInputChange('parentDreamItem', e.target.value)}
                    placeholder="家長所認知的，例如：天文望遠鏡、腳踏車"
                    className="w-full pl-11 pr-4 h-12 bg-slate-950/80 border border-slate-700/80 focus:border-emerald-400 rounded-xl text-slate-100 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium placeholder:text-slate-500 transition-all"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: 探索模式設定 */}
          {step === 2 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-200">
              <div className="flex items-center gap-2 text-base font-bold text-emerald-400 pb-1 border-b border-slate-800">
                <Compass className="w-5 h-5" />
                <span>步驟二：每日探索功能模式</span>
              </div>

              <div className="space-y-4">
                {/* 開關：是否自選 */}
                <div className="flex items-center justify-between p-4 bg-slate-950/70 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors">
                  <div className="flex items-center gap-3.5">
                    <div className="p-2.5 bg-blue-500/15 text-blue-400 rounded-xl">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-base font-bold text-slate-100">是否允許自由選擇模式</div>
                      <div className="text-xs text-slate-400 mt-0.5">允許小朋友自由切換探索任務</div>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isModeSelectable}
                      onChange={(e) => handleInputChange('isModeSelectable', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-12 h-6.5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5.5 after:w-5.5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

                {/* 開關：每日五件事 */}
                <div className="flex items-center justify-between p-4 bg-slate-950/70 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors">
                  <div className="flex items-center gap-3.5">
                    <div className="p-2.5 bg-emerald-500/15 text-emerald-400 rounded-xl">
                      <ListTodo className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-base font-bold text-slate-100">是否每日五件事</div>
                      <div className="text-xs text-slate-400 mt-0.5">紀錄與完成每日 5 項生活小任務</div>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.allowFiveThings}
                      onChange={(e) => handleInputChange('allowFiveThings', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-12 h-6.5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5.5 after:w-5.5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

                {/* 開關：每日五問答 */}
                <div className="flex items-center justify-between p-4 bg-slate-950/70 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors">
                  <div className="flex items-center gap-3.5">
                    <div className="p-2.5 bg-purple-500/15 text-purple-400 rounded-xl">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-base font-bold text-slate-100">是否每日五問答</div>
                      <div className="text-xs text-slate-400 mt-0.5">與 AI 進行每日 5 題互動探索問答</div>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.allowFiveQna}
                      onChange={(e) => handleInputChange('allowFiveQna', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-12 h-6.5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5.5 after:w-5.5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

                {/* 開關：每日一日記 */}
                <div className="flex items-center justify-between p-4 bg-slate-950/70 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors">
                  <div className="flex items-center gap-3.5">
                    <div className="p-2.5 bg-amber-500/15 text-amber-400 rounded-xl">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-base font-bold text-slate-100">是否每日一日記</div>
                      <div className="text-xs text-slate-400 mt-0.5">寫下每日心情與心得成長日記</div>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.allowDiary}
                      onChange={(e) => handleInputChange('allowDiary', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-12 h-6.5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5.5 after:w-5.5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

                {/* 開關：每日拍照 */}
                <div className="flex items-center justify-between p-4 bg-slate-950/70 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors">
                  <div className="flex items-center gap-3.5">
                    <div className="p-2.5 bg-rose-500/15 text-rose-400 rounded-xl">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-base font-bold text-slate-100">是否每日拍照紀錄</div>
                      <div className="text-xs text-slate-400 mt-0.5">拍照上傳每日生活照片點滴</div>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.allowPhoto}
                      onChange={(e) => handleInputChange('allowPhoto', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-12 h-6.5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5.5 after:w-5.5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: 通知與日記限制設定 */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-200">
              <div className="flex items-center gap-2 text-base font-bold text-emerald-400 pb-1 border-b border-slate-800">
                <Bell className="w-5 h-5" />
                <span>步驟三：推播通知與日記限制設定</span>
              </div>

              {/* 每日提醒家長 */}
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-base font-bold text-slate-100">每日提醒家長狀態</div>
                    <div className="text-xs text-slate-400 mt-0.5">定時發送小孩學習進度總結報告</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.remindParent}
                      onChange={(e) => handleInputChange('remindParent', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-12 h-6.5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5.5 after:w-5.5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>
                {formData.remindParent && (
                  <div className="pt-2 border-t border-slate-800/80">
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">家長提醒時間</label>
                    <input
                      type="time"
                      value={formData.remindParentTime}
                      onChange={(e) => handleInputChange('remindParentTime', e.target.value)}
                      className="w-full h-12 px-4 bg-slate-900 border border-slate-700/80 rounded-xl text-slate-100 text-base focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                )}
              </div>

              {/* 每日提醒小孩 */}
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-base font-bold text-slate-100">每日提醒小孩狀態</div>
                    <div className="text-xs text-slate-400 mt-0.5">LINE 機器人定時提醒小孩開始今日探索</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.remindChild}
                      onChange={(e) => handleInputChange('remindChild', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-12 h-6.5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5.5 after:w-5.5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>
                {formData.remindChild && (
                  <div className="pt-2 border-t border-slate-800/80">
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">小孩提醒時間</label>
                    <input
                      type="time"
                      value={formData.remindChildTime}
                      onChange={(e) => handleInputChange('remindChildTime', e.target.value)}
                      className="w-full h-12 px-4 bg-slate-900 border border-slate-700/80 rounded-xl text-slate-100 text-base focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                )}
              </div>

              {/* 日記字數最少限制 */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-200">
                  日記最少字數限制 (個字)
                </label>
                <div className="relative flex items-center">
                  <BookOpen className="w-5 h-5 absolute left-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="number"
                    min={10}
                    max={500}
                    value={formData.minDiaryLength}
                    onChange={(e) => handleInputChange('minDiaryLength', Number(e.target.value))}
                    className="w-full pl-11 pr-4 h-12 bg-slate-950/80 border border-slate-700/80 focus:border-emerald-400 rounded-xl text-slate-100 text-base font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-800 mt-6">
          <div>
            {step > 1 && (
              <button
                type="button"
                onClick={handlePrevStep}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-base font-bold rounded-xl transition-all"
              >
                <ChevronLeft className="w-5 h-5" />
                <span>上一步</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {step < 3 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-base font-bold rounded-xl shadow-lg shadow-emerald-950/40 transition-all hover:scale-[1.02]"
              >
                <span>下一步</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmitStart}
                disabled={saveStatus === 'saving'}
                className="flex items-center gap-2 px-7 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-base rounded-xl shadow-lg shadow-emerald-950/50 transition-all hover:scale-[1.02] disabled:opacity-50"
              >
                <Send className="w-5 h-5" />
                <span>送出啟動</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
