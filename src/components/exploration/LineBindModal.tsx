import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { Copy, Check, QrCode, X, Sparkles, Smartphone } from 'lucide-react'

interface LineBindModalProps {
  isOpen: boolean
  pairCode: string
  profileId?: string
  token: string | null
  apiBaseUrl: string
  onClose: () => void
}

export const LineBindModal: React.FC<LineBindModalProps> = ({
  isOpen,
  pairCode,
  profileId,
  token,
  apiBaseUrl,
  onClose,
}) => {
  const [copied, setCopied] = useState(false)
  const [lineBindInfo, setLineBindInfo] = useState<{
    qrCodeUrl?: string
    lineBotUrl?: string
  } | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && profileId && token) {
      setLoading(true)
      axios
        .get(`${apiBaseUrl}/api/v1/children-profiles/${profileId}/line-bind-info`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => {
          if (res.data) {
            setLineBindInfo(res.data)
          }
        })
        .catch((err) => {
          console.warn('Could not fetch LINE bind info, fallback to default display:', err)
        })
        .finally(() => {
          setLoading(false)
        })
    }
  }, [isOpen, profileId, token, apiBaseUrl])

  if (!isOpen) return null

  const handleCopyCode = () => {
    if (!pairCode) return
    navigator.clipboard.writeText(pairCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // QR Code placeholder image generator using public API or clean styled container
  const qrImageUrl =
    lineBindInfo?.qrCodeUrl ||
    `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://line.me/R/ti/p/%40heart_buds_bot?code=${pairCode}`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900/90 border border-emerald-500/30 rounded-2xl shadow-2xl shadow-emerald-950/40 p-6 overflow-hidden">
        {/* Decorative ambient background glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800/60 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-400">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              LINE 機器人連動綁定
              <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            </h3>
            <p className="text-xs text-slate-400">開啟心芽萬花童 AI 探索旅程</p>
          </div>
        </div>

        {/* Instruction Message */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3.5 mb-5 text-xs text-slate-300 leading-relaxed">
          請掃描下方 <span className="text-emerald-400 font-semibold">QR Code</span> 加入「心芽萬花童」LINE 官方帳號，並在聊天室中發送專屬連動密碼完成綁定：
        </div>

        {/* QR Code Container */}
        <div className="flex flex-col items-center justify-center mb-6">
          <div className="relative p-3 bg-white rounded-2xl shadow-lg border border-slate-200 group">
            {loading ? (
              <div className="w-44 h-44 flex items-center justify-center text-slate-500">
                <QrCode className="w-8 h-8 animate-spin text-emerald-600" />
              </div>
            ) : (
              <img
                src={qrImageUrl}
                alt="LINE Bot QR Code"
                className="w-44 h-44 object-contain rounded-lg"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                }}
              />
            )}
          </div>
          <span className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
            <QrCode className="w-3.5 h-3.5 text-emerald-400" />
            掃描 QR Code 開啟 LINE 聊天室
          </span>
        </div>

        {/* Pair Code Section */}
        <div className="bg-slate-950/70 border border-emerald-500/40 rounded-xl p-4 mb-6">
          <div className="text-xs text-slate-400 text-center mb-1.5 font-medium">
            小朋友專屬啟動連動密碼
          </div>
          <div className="flex items-center justify-center gap-3">
            <span className="text-2xl font-black tracking-widest text-emerald-400 font-mono drop-shadow-[0_0_10px_rgba(52,211,153,0.3)]">
              {pairCode || '------'}
            </span>
            <button
              type="button"
              onClick={handleCopyCode}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm ${
                copied
                  ? 'bg-emerald-600 text-white shadow-emerald-900/50'
                  : 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span>已複製！</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-emerald-400" />
                  <span>一鍵複製</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer Action */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-950/50 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          完成並關閉
        </button>
      </div>
    </div>
  )
}
