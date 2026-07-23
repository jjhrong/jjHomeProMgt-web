import React, { useState, useEffect } from 'react'
import axios from 'axios'
import {
  MessageSquare,
  Heart,
  Plus,
  Pin,
  Trash2,
  ExternalLink,
  Send,
  Image as ImageIcon,
  Link as LinkIcon,
  X,
  Sparkles,
  AlertCircle,
} from 'lucide-react'

interface PostBoardProps {
  func: {
    id: string
    name: string
    description?: string
    type?: string
  }
  token: string | null
  apiBaseUrl: string
  user: any
}

interface PostItem {
  id: string
  functionID: string
  title: string
  content: string
  coverUrl?: string
  linkUrl?: string
  status: number
  lmUser: string
  lmDate: string
  likesCount: number
  isLiked: boolean
  commentsCount?: number
  commentCount?: number
}

interface CommentItem {
  id: string
  postId: string
  userId: string
  content: string
  status: number
  lmDate: string
  nickname?: string
  avatarUrl?: string
}

export const PostBoard: React.FC<PostBoardProps> = ({ func, token, apiBaseUrl, user: _user }) => {
  const [posts, setPosts] = useState<PostItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // New Post Form State
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false)
  const [newTitle, setNewTitle] = useState<string>('')
  const [newContent, setNewContent] = useState<string>('')
  const [newCoverUrl, setNewCoverUrl] = useState<string>('')
  const [newLinkUrl, setNewLinkUrl] = useState<string>('')
  const [isSubmittingPost, setIsSubmittingPost] = useState<boolean>(false)
  const [postError, setPostError] = useState<string | null>(null)

  // Comments State keyed by postId
  const [expandedComments, setExpandedComments] = useState<{ [postId: string]: boolean }>({})
  const [commentsMap, setCommentsMap] = useState<{ [postId: string]: CommentItem[] }>({})
  const [loadingComments, setLoadingComments] = useState<{ [postId: string]: boolean }>({})
  const [commentInputs, setCommentInputs] = useState<{ [postId: string]: string }>({})
  const [submittingComment, setSubmittingComment] = useState<{ [postId: string]: boolean }>({})

  // Fetch posts for current function
  const fetchPosts = async () => {
    if (!token || (!func?.id && !func?.name)) return
    setLoading(true)
    setError(null)
    try {
      // Endpoint can be called with func.id or func.name
      const targetId = func.id || func.name
      const res = await axios.get(`${apiBaseUrl}/api/v1/posts/${targetId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const list = res.data || []
      // Sort posts: Pinned (status & 4 === 4) first, then by lmDate descending
      list.sort((a: PostItem, b: PostItem) => {
        const isPinnedA = (a.status & 4) === 4
        const isPinnedB = (b.status & 4) === 4
        if (isPinnedA && !isPinnedB) return -1
        if (!isPinnedA && isPinnedB) return 1
        return new Date(b.lmDate).getTime() - new Date(a.lmDate).getTime()
      })
      setPosts(list)
    } catch (err: any) {
      console.error('Failed to fetch posts:', err)
      setError(err.response?.data?.error || '無法載入貼文列表，請確認連線與權限。')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPosts()
  }, [func?.id, func?.name, token])

  // Handle Create Post
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) {
      setPostError('請輸入貼文標題')
      return
    }

    setIsSubmittingPost(true)
    setPostError(null)

    try {
      const targetId = func.id || func.name
      await axios.post(
        `${apiBaseUrl}/api/v1/posts/${targetId}`,
        {
          title: newTitle.trim(),
          content: newContent,
          coverUrl: newCoverUrl,
          linkUrl: newLinkUrl,
          status: 2, // ACTIVE (bit 1, value 2)
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      setShowCreateModal(false)
      setNewTitle('')
      setNewContent('')
      setNewCoverUrl('')
      setNewLinkUrl('')
      fetchPosts()
    } catch (err: any) {
      console.error('Failed to create post:', err)
      setPostError(err.response?.data?.error || '發表貼文失敗，請稍後再試。')
    } finally {
      setIsSubmittingPost(false)
    }
  }

  // Handle Toggle Like
  const handleToggleLike = async (postId: string) => {
    if (!token) return

    // Optimistic UI update
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const nextIsLiked = !p.isLiked
          return {
            ...p,
            isLiked: nextIsLiked,
            likesCount: nextIsLiked ? p.likesCount + 1 : Math.max(0, p.likesCount - 1),
          }
        }
        return p
      })
    )

    try {
      await axios.post(
        `${apiBaseUrl}/api/v1/posts/${postId}/like`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )
    } catch (err) {
      console.error('Failed to toggle like:', err)
      // Revert if error
      fetchPosts()
    }
  }

  // Handle Fetch Comments
  const toggleComments = async (postId: string) => {
    const isCurrentlyExpanded = expandedComments[postId]
    setExpandedComments((prev) => ({ ...prev, [postId]: !isCurrentlyExpanded }))

    if (!isCurrentlyExpanded && !commentsMap[postId]) {
      setLoadingComments((prev) => ({ ...prev, [postId]: true }))
      try {
        const res = await axios.get(`${apiBaseUrl}/api/v1/posts/${postId}/comments`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        setCommentsMap((prev) => ({ ...prev, [postId]: res.data || [] }))
      } catch (err) {
        console.error('Failed to fetch comments:', err)
      } finally {
        setLoadingComments((prev) => ({ ...prev, [postId]: false }))
      }
    }
  }

  // Handle Add Comment (Optimistic UI Update)
  const handleAddComment = async (postId: string) => {
    const text = commentInputs[postId]?.trim()
    if (!text || !token) return

    setSubmittingComment((prev) => ({ ...prev, [postId]: true }))
    try {
      const res = await axios.post(
        `${apiBaseUrl}/api/v1/posts/${postId}/comments`,
        { content: text },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const newComment = res.data
      setCommentsMap((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] || []), newComment],
      }))
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id === postId) {
            const currentCount = p.commentCount ?? p.commentsCount ?? 0
            const nextCount = currentCount + 1
            return {
              ...p,
              commentsCount: nextCount,
              commentCount: nextCount,
            }
          }
          return p
        })
      )
      setCommentInputs((prev) => ({ ...prev, [postId]: '' }))
    } catch (err) {
      console.error('Failed to add comment:', err)
    } finally {
      setSubmittingComment((prev) => ({ ...prev, [postId]: false }))
    }
  }

  // Handle Delete Comment (Optimistic UI Update)
  const handleDeleteComment = async (postId: string, commentId: string) => {
    if (!token || !window.confirm('確定要刪除這則回應嗎？')) return

    setCommentsMap((prev) => ({
      ...prev,
      [postId]: (prev[postId] || []).filter((c) => c.id !== commentId),
    }))
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const currentCount = p.commentCount ?? p.commentsCount ?? 0
          const nextCount = Math.max(0, currentCount - 1)
          return {
            ...p,
            commentsCount: nextCount,
            commentCount: nextCount,
          }
        }
        return p
      })
    )

    try {
      await axios.delete(`${apiBaseUrl}/api/v1/posts/${postId}/comments/${commentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
    } catch (err: any) {
      console.error('Failed to delete comment:', err)
    }
  }

  // Handle Pin Post (Manager action)
  const handlePinPost = async (postId: string, currentStatus: number) => {
    if (!token) return
    const isPinned = (currentStatus & 1) === 1
    try {
      await axios.put(
        `${apiBaseUrl}/api/v1/posts/${postId}/pin`,
        { active: !isPinned },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      fetchPosts()
    } catch (err: any) {
      alert(err.response?.data?.error || '操作失敗：您可能沒有管理權限。')
    }
  }

  // Handle Delete Post
  const handleDeletePost = async (postId: string) => {
    if (!token || !window.confirm('確定要刪除這篇貼文嗎？')) return
    try {
      await axios.delete(`${apiBaseUrl}/api/v1/posts/${postId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      fetchPosts()
    } catch (err: any) {
      alert(err.response?.data?.error || '刪除失敗：權限不足或系統錯誤。')
    }
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div style={{ maxWidth: '840px', margin: '0 auto', padding: '12px 0' }}>
      {/* Header Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '24px',
          borderRadius: '20px',
          background: 'linear-gradient(135deg, #152820 0%, #0d1a14 100%)',
          border: '1px solid rgba(163, 198, 175, 0.2)',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.4)',
          marginBottom: '24px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f0f5f2', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
            <Sparkles className="w-5 h-5 text-emerald-400" />
            {func.description || func.name} 討論公告牆
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#91a89c', marginTop: '6px', margin: 0 }}>
            發表想法、發起討論或瀏覽社群成員的分享內容。
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-lg shadow-emerald-950/40 transition-all cursor-pointer border border-emerald-400/30 text-sm"
        >
          <Plus className="w-4 h-4" />
          發表貼文
        </button>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[1, 2].map((n) => (
            <div
              key={n}
              style={{
                height: '140px',
                borderRadius: '18px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                animation: 'pulse 1.5s infinite',
              }}
            />
          ))}
        </div>
      )}

      {/* Error Banner */}
      {error && !loading && (
        <div
          style={{
            padding: '16px 20px',
            borderRadius: '16px',
            background: 'rgba(217, 119, 100, 0.15)',
            border: '1px solid rgba(217, 119, 100, 0.3)',
            color: '#e58e7d',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '0.9rem',
          }}
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && posts.length === 0 && (
        <div
          style={{
            padding: '48px 24px',
            textAlign: 'center',
            borderRadius: '20px',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px dashed rgba(163, 198, 175, 0.2)',
            color: '#a1b5aa',
          }}
        >
          <MessageSquare className="w-12 h-12 text-emerald-500/40 mx-auto mb-3" />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#d8e3dc', marginBottom: '8px' }}>目前尚無任何貼文</h3>
          <p style={{ fontSize: '0.875rem', color: '#889e92', marginBottom: '20px' }}>成為第一個發起討論的人吧！</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-2.5 rounded-xl bg-emerald-700/80 hover:bg-emerald-600 text-white text-sm font-semibold transition-all cursor-pointer"
          >
            發布第一篇貼文
          </button>
        </div>
      )}

      {/* Post List */}
      {!loading && !error && posts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {posts.map((post) => {
            const isPinned = (post.status & 4) === 4
            const isCommentsOpen = !!expandedComments[post.id]
            const postComments = commentsMap[post.id] || []

            return (
              <div
                key={post.id}
                style={{
                  borderRadius: '20px',
                  background: 'linear-gradient(145deg, #13221b 0%, #0a1410 100%)',
                  border: isPinned
                    ? '1.5px solid rgba(250, 204, 21, 0.5)'
                    : '1px solid rgba(163, 198, 175, 0.18)',
                  boxShadow: isPinned
                    ? '0 10px 30px rgba(250, 204, 21, 0.1)'
                    : '0 8px 24px rgba(0, 0, 0, 0.3)',
                  padding: '24px',
                  transition: 'all 0.2s',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Pinned Ribbon Badge */}
                {isPinned && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '16px',
                      right: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px',
                      borderRadius: '20px',
                      background: 'rgba(250, 204, 21, 0.15)',
                      border: '1px solid rgba(250, 204, 21, 0.4)',
                      color: '#facc15',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                    }}
                  >
                    <Pin className="w-3.5 h-3.5" />
                    <span>置頂公告</span>
                  </div>
                )}

                {/* Author Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: '#3a664b',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '1rem',
                    }}
                  >
                    {post.lmUser ? post.lmUser.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f0f5f2' }}>
                      {post.lmUser || '匿名使用者'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#7a9485' }}>
                      {formatDate(post.lmDate)}
                    </div>
                  </div>
                </div>

                {/* Post Title & Content */}
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff', marginBottom: '10px', lineHeight: '1.4' }}>
                  {post.title}
                </h3>
                {post.content && (
                  <p style={{ fontSize: '0.925rem', color: '#c5d6cc', lineHeight: '1.7', whiteSpace: 'pre-line', marginBottom: '16px' }}>
                    {post.content}
                  </p>
                )}

                {/* Cover Image Preview */}
                {post.coverUrl && (
                  <div style={{ marginBottom: '16px', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <img src={post.coverUrl} alt="Cover" style={{ width: '100%', maxHeight: '360px', objectFit: 'cover' }} />
                  </div>
                )}

                {/* Link Preview */}
                {post.linkUrl && (
                  <a
                    href={post.linkUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '0.85rem',
                      color: '#4ade80',
                      background: 'rgba(74, 222, 128, 0.1)',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      marginBottom: '16px',
                      textDecoration: 'none',
                    }}
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                    <span>{post.linkUrl}</span>
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                )}

                {/* Action Bar */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid rgba(163, 198, 175, 0.12)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {/* Like Button */}
                    <button
                      onClick={() => handleToggleLike(post.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                        post.isLiked
                          ? 'bg-rose-950/60 text-rose-400 border border-rose-500/40'
                          : 'bg-emerald-950/40 text-emerald-300/80 hover:bg-emerald-900/60 hover:text-emerald-200 border border-emerald-500/20'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${post.isLiked ? 'fill-rose-400 text-rose-400' : ''}`} />
                      <span>{post.likesCount}</span>
                    </button>

                    {/* Comments Toggle Button */}
                    <button
                      onClick={() => toggleComments(post.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-emerald-950/40 text-emerald-300/80 hover:bg-emerald-900/60 hover:text-emerald-200 border border-emerald-500/20 transition-all cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>
                        回覆 ({(post.commentCount ?? post.commentsCount ?? 0)})
                      </span>
                    </button>
                  </div>

                  {/* Manager Controls */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={() => handlePinPost(post.id, post.status)}
                      title={isPinned ? '取消置頂' : '置頂貼文'}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-amber-950/40 transition-colors cursor-pointer"
                    >
                      <Pin className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      title="刪除貼文"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Expanded Comments Section */}
                {isCommentsOpen && (
                  <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px dashed rgba(163, 198, 175, 0.15)' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#a1b5aa', marginBottom: '12px' }}>
                      回覆 ({postComments.length})
                    </h4>

                    {loadingComments[post.id] ? (
                      <div style={{ fontSize: '0.85rem', color: '#7a9485', padding: '10px 0' }}>載入回應中...</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                        {postComments.map((cmt) => (
                          <div
                            key={cmt.id}
                            style={{
                              padding: '10px 14px',
                              borderRadius: '12px',
                              background: 'rgba(255, 255, 255, 0.025)',
                              border: '1px solid rgba(255, 255, 255, 0.05)',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#e0eae4' }}>
                                {cmt.nickname || cmt.userId}
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '0.7rem', color: '#688273' }}>
                                  {formatDate(cmt.lmDate)}
                                </span>
                                <button
                                  onClick={() => handleDeleteComment(post.id, cmt.id)}
                                  title="刪除回應"
                                  className="text-slate-500 hover:text-rose-400 transition-colors p-0.5 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                            <p style={{ fontSize: '0.875rem', color: '#b2c7bc', margin: 0, lineHeight: '1.5' }}>
                              {cmt.content}
                            </p>
                          </div>
                        ))}

                        {postComments.length === 0 && (
                          <div style={{ fontSize: '0.85rem', color: '#688273', fontStyle: 'italic' }}>
                            暫無回應，發表您的想法吧！
                          </div>
                        )}
                      </div>
                    )}

                    {/* Add Comment Input */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        placeholder="撰寫您的回應..."
                        value={commentInputs[post.id] || ''}
                        onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddComment(post.id)
                        }}
                        style={{
                          flex: 1,
                          padding: '10px 14px',
                          borderRadius: '10px',
                          background: 'rgba(10, 18, 14, 0.8)',
                          border: '1px solid rgba(163, 198, 175, 0.25)',
                          color: '#ffffff',
                          fontSize: '0.875rem',
                          outline: 'none',
                        }}
                      />
                      <button
                        onClick={() => handleAddComment(post.id)}
                        disabled={submittingComment[post.id] || !commentInputs[post.id]?.trim()}
                        className="px-4 py-2 rounded-10 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-semibold text-sm transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>傳送</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Create Post Modal */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(8, 14, 11, 0.82)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '560px',
              background: 'linear-gradient(145deg, #182a22 0%, #0d1612 100%)',
              border: '1px solid rgba(163, 198, 175, 0.25)',
              borderRadius: '24px',
              padding: '28px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
              color: '#f0f5f2',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus className="w-5 h-5 text-emerald-400" />
                發表新貼文 ({func.description || func.name})
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg hover:bg-emerald-950 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {postError && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: 'rgba(217, 119, 100, 0.2)',
                  border: '1px solid rgba(217, 119, 100, 0.4)',
                  color: '#e58e7d',
                  fontSize: '0.875rem',
                  marginBottom: '16px',
                }}
              >
                {postError}
              </div>
            )}

            <form onSubmit={handleCreatePost} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#a1b5aa', marginBottom: '6px' }}>
                  貼文標題 *
                </label>
                <input
                  type="text"
                  placeholder="輸入簡明扼要的標題"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: 'rgba(10, 18, 14, 0.8)',
                    border: '1px solid rgba(163, 198, 175, 0.25)',
                    color: '#ffffff',
                    fontSize: '0.95rem',
                    outline: 'none',
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#a1b5aa', marginBottom: '6px' }}>
                  貼文內容
                </label>
                <textarea
                  rows={5}
                  placeholder="分享您的詳細內容、想法或問題..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: 'rgba(10, 18, 14, 0.8)',
                    border: '1px solid rgba(163, 198, 175, 0.25)',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#a1b5aa', marginBottom: '6px' }}>
                  <ImageIcon className="w-4 h-4 text-emerald-400" />
                  封面圖片網址 (選填)
                </label>
                <input
                  type="text"
                  placeholder="https://example.com/image.jpg"
                  value={newCoverUrl}
                  onChange={(e) => setNewCoverUrl(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: 'rgba(10, 18, 14, 0.8)',
                    border: '1px solid rgba(163, 198, 175, 0.25)',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#a1b5aa', marginBottom: '6px' }}>
                  <LinkIcon className="w-4 h-4 text-emerald-400" />
                  參考連結網址 (選填)
                </label>
                <input
                  type="text"
                  placeholder="https://example.com"
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: 'rgba(10, 18, 14, 0.8)',
                    border: '1px solid rgba(163, 198, 175, 0.25)',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-3 rounded-xl border border-emerald-900/60 hover:bg-emerald-950/60 text-slate-300 font-semibold transition-colors cursor-pointer text-sm"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPost || !newTitle.trim()}
                  className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-semibold shadow-lg shadow-emerald-900/40 transition-all cursor-pointer text-sm"
                >
                  {isSubmittingPost ? '發布中...' : '確認發布'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
