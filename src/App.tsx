import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import './App.css'

const API_BASE_URL = 'http://localhost:8080'

interface User {
  id: string
  nickname: string
  realName: string
  phone: string
  address: string
  email: string
  description: string
  status: string
  avatarUrl: string
  firstLogin: boolean
}

const SCHEMAS: { [key: string]: { fields: { key: string; label: string; type: string; required?: boolean; selectOptions?: string[] }[] } } = {
  configs: {
    fields: [
      { key: 'kind', label: '類別 (Kind)', type: 'text', required: true },
      { key: 'name', label: '屬性名稱 (Name)', type: 'text', required: true },
      { key: 'orderSn', label: '排序編號 (Order SN)', type: 'number', required: true },
      { key: 'value', label: '設定值 (Value)', type: 'text', required: true },
      { key: 'description', label: '功能描述 (Description)', type: 'text', required: true },
      { key: 'status', label: '狀態 (Status)', type: 'select', selectOptions: ['ACTIVE', 'INACTIVE'] },
    ]
  },
  functions: {
    fields: [
      { key: 'id', label: '唯一識別碼 (ID)', type: 'text', required: true },
      { key: 'pId', label: '父功能識別碼 (Parent ID)', type: 'text' },
      { key: 'name', label: '功能名稱 (Name - 英文)', type: 'text', required: true },
      { key: 'orderSn', label: '排序編號 (Order SN)', type: 'number', required: true },
      { key: 'type', label: '功能類型 (Type)', type: 'select', selectOptions: ['HOME', 'PAGE', 'SETT'] },
      { key: 'description', label: '中文描述 (Description)', type: 'text', required: true },
      { key: 'status', label: '狀態 (Status)', type: 'select', selectOptions: ['ACTIVE', 'INACTIVE'] },
    ]
  }
};

const INITIAL_DATA: { [key: string]: any[] } = {
  configs: [
    { kind: 'SYS', name: 'NAME', orderSn: 0, value: 'jjHomeProMgt', description: '系統顯示名稱', status: 'ACTIVE' },
    { kind: 'SYS', name: 'VERSION', orderSn: 1, value: '1.0.0', description: '系統版本號', status: 'ACTIVE' },
  ],
  functions: [
    { id: '00000000-0000-0000-0000-00000000', pId: '', name: 'Home', orderSn: 0, type: 'HOME', description: '首頁', status: 'ACTIVE' },
    { id: '00000000-0000-0000-0000-00000001', pId: '', name: 'User', orderSn: 0, type: 'PAGE', description: '使用者', status: 'ACTIVE' },
    { id: '00000000-0000-0000-0099-00000000', pId: '', name: 'Setting', orderSn: 0, type: 'PAGE', description: '設定', status: 'ACTIVE' },
    { id: '00000000-0000-0000-0099-00000001', pId: '00000000-0000-0000-0099-00000000', name: 'Setting_configs', orderSn: 0, type: 'SETT', description: '參數設定', status: 'ACTIVE' },
  ]
};

const CRUDTable: React.FC<{ objectName: string }> = ({ objectName }) => {
  const typeKey = objectName.toLowerCase() === 'functions' ? 'functions' : 'configs';
  const schema = SCHEMAS[typeKey] || SCHEMAS.configs;
  
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    setItems(INITIAL_DATA[typeKey] || INITIAL_DATA.configs);
  }, [typeKey]);

  const [form, setForm] = useState<any>({});
  const [isEditing, setIsEditing] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [showFormModal, setShowFormModal] = useState(false);

  const handleOpenAdd = () => {
    const defaultForm: any = {};
    schema.fields.forEach(f => {
      defaultForm[f.key] = f.type === 'number' ? 0 : f.type === 'select' ? f.selectOptions?.[0] : '';
    });
    setForm(defaultForm);
    setIsEditing(false);
    setEditingIndex(null);
    setShowFormModal(true);
  };

  const handleOpenEdit = (item: any, index: number) => {
    setForm({ ...item });
    setIsEditing(true);
    setEditingIndex(index);
    setShowFormModal(true);
  };

  const handleDelete = (index: number) => {
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing && editingIndex !== null) {
      const updated = [...items];
      updated[editingIndex] = form;
      setItems(updated);
    } else {
      setItems([...items, form]);
    }
    setShowFormModal(false);
  };

  return (
    <div style={{ background: 'rgba(255,255,255,0.01)', borderRadius: '12px', border: '1px solid var(--card-border)', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h4 style={{ fontSize: '1.1rem', color: 'var(--accent-blue)', textTransform: 'capitalize' }}>{objectName} 維護清單</h4>
        <button className="btn btn-primary" onClick={handleOpenAdd} style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
          + 新增資料
        </button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--card-border)', color: 'var(--text-secondary)' }}>
              {schema.fields.map(f => (
                <th key={f.key} style={{ padding: '12px' }}>{f.label.split(' ')[0]}</th>
              ))}
              <th style={{ padding: '12px', textAlign: 'right' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                {schema.fields.map(f => (
                  <td key={f.key} style={{ padding: '12px', color: f.key === 'status' ? undefined : 'var(--text-primary)' }}>
                    {f.key === 'status' ? (
                      <span style={{ 
                        padding: '2px 8px', 
                        borderRadius: '4px', 
                        fontSize: '0.75rem', 
                        background: item[f.key] === 'ACTIVE' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                        color: item[f.key] === 'ACTIVE' ? 'var(--accent-green)' : 'var(--accent-red)',
                        fontWeight: 600
                      }}>
                        {item[f.key]}
                      </span>
                    ) : (
                      item[f.key] !== undefined && item[f.key] !== null ? String(item[f.key]) : '-'
                    )}
                  </td>
                ))}
                <td style={{ padding: '12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <button 
                    onClick={() => handleOpenEdit(item, idx)}
                    style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', marginRight: '12px', fontSize: '0.85rem' }}
                  >
                    編輯
                  </button>
                  <button 
                    onClick={() => handleDelete(idx)}
                    style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontSize: '0.85rem' }}
                  >
                    刪除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showFormModal && (
        <div className="modal-overlay" style={{ zIndex: 1200, overflowY: 'auto', padding: '40px 0', alignItems: 'flex-start' }}>
          <form className="glass-panel modal-content" onSubmit={handleSubmit} style={{ width: '95%', maxWidth: '450px', padding: '24px', gap: '16px', margin: '0 auto' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '8px', textAlign: 'center' }}>
              {isEditing ? `編輯 ${objectName.slice(0, -1)}` : `新增 ${objectName.slice(0, -1)}`}
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {schema.fields.map(f => (
                <div key={f.key} className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{f.label}</label>
                  {f.type === 'select' ? (
                    <select 
                      className="form-control" 
                      value={form[f.key] || ''} 
                      onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                      style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--card-border)', borderRadius: '8px', padding: '8px' }}
                    >
                      {f.selectOptions?.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <input 
                      type={f.type} 
                      className="form-control" 
                      value={form[f.key] === undefined ? '' : form[f.key]} 
                      onChange={(e) => setForm({ ...form, [f.key]: f.type === 'number' ? parseInt(e.target.value) || 0 : e.target.value })} 
                      required={f.required} 
                    />
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button type="button" className="btn btn-outline" onClick={() => setShowFormModal(false)}>
                取消
              </button>
              <button type="submit" className="btn btn-primary" style={{ minWidth: '80px' }}>
                確定
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'))
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('user')
    return savedUser ? JSON.parse(savedUser) : null
  })

  const [isLoading, setIsLoading] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)
  const oAuthCalled = useRef(false)
  
  // Modals state
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [profileForm, setProfileForm] = useState({
    nickname: '',
    realName: '',
    phone: '',
    address: '',
    description: '',
  })
  const [profileError, setProfileError] = useState<string | null>(null)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [homeFunction, setHomeFunction] = useState<any>({
    name: 'Home',
    description: '首頁',
    type: 'HOME',
    subFunctions: []
  })
  
  const [appName, setAppName] = useState('jjHomeProMgt')
  const [is404, setIs404] = useState(false)
  const [currentFunction, setCurrentFunction] = useState<any>(null)
  const [isValidatingRoute, setIsValidatingRoute] = useState(false)

  // Configure Axios global interceptor for 401 errors
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401) {
          // Token expired or invalid, log out the user
          logout()
        }
        return Promise.reject(error)
      }
    )
    return () => {
      axios.interceptors.response.eject(interceptor)
    }
  }, [])

  // Check URL callback routing on page load
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const path = window.location.pathname
      const searchParams = new URLSearchParams(window.location.search)
      const code = searchParams.get('code')

      if (path.startsWith('/auth/callback/') && code) {
        if (oAuthCalled.current) return
        oAuthCalled.current = true

        setIsLoading(true)
        setLoginError(null)
        
        // Extract provider from URL, e.g. /auth/callback/google -> google
        const provider = path.split('/')[3]

        try {
          const response = await axios.post(`${API_BASE_URL}/api/v1/auth/${provider}/callback`, {
            code: code,
          })

          const { token: receivedToken, isNewUser, user: receivedUser } = response.data
          
          // Save credentials
          localStorage.setItem('token', receivedToken)
          localStorage.setItem('user', JSON.stringify(receivedUser))
          
          setToken(receivedToken)
          setUser(receivedUser)

          // Clear code and callback route from URL, redirect to intended path
          const redirectTo = sessionStorage.getItem('redirect_to') || '/'
          sessionStorage.removeItem('redirect_to')
          window.history.replaceState({}, document.title, redirectTo)

          if (isNewUser) {
            // New user must fill out profile immediately
            setProfileForm({
              nickname: receivedUser.nickname || '',
              realName: receivedUser.realName || '',
              phone: receivedUser.phone || '',
              address: receivedUser.address || '',
              description: receivedUser.description || '',
            })
            setShowProfileModal(true)
          }
        } catch (err: any) {
          console.error(err)
          setLoginError(
            err.response?.data?.error || 'Authentication callback failed. Please try again.'
          )
          window.history.replaceState({}, document.title, '/')
        } finally {
          setIsLoading(false)
        }
      }
    }

    handleOAuthCallback()
  }, [])

  // Fetch system name config on mount
  useEffect(() => {
    const fetchSystemName = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/v1/configs/sys/name`)
        if (response.data && response.data.name) {
          setAppName(response.data.name)
        }
      } catch (err) {
        console.error('Failed to fetch system name:', err)
      }
    }
    fetchSystemName()
  }, [])

  // Dynamic function routing verification helper
  const validateRoute = async (tokenVal = token, userVal = user) => {
    // Clear route errors if not logged in
    if (!tokenVal || !userVal) {
      setIs404(false)
      setCurrentFunction(null)
      return
    }

    const path = window.location.pathname
    // Skip OAuth callback path
    if (path.startsWith('/auth/callback')) {
      return
    }

    let functionName = path.slice(1)
    if (functionName === '') {
      setIs404(false)
      setCurrentFunction({ name: 'Home', description: '首頁', type: 'HOME', subFunctions: [] })
      setIsValidatingRoute(false)
      return
    }

    // If nested path, it's an invalid function name
    if (functionName.includes('/')) {
      setIs404(true)
      setCurrentFunction(null)
      return
    }

    setIsValidatingRoute(true)
    setIs404(false)
    try {
      const response = await axios.get(`${API_BASE_URL}/api/v1/functions?name=${functionName}`, {
        headers: {
          Authorization: `Bearer ${tokenVal}`
        }
      })
      const funcData = response.data
      setCurrentFunction(funcData)
    } catch (err) {
      console.error('Route validation failed:', err)
      setIs404(true)
      setCurrentFunction(null)
    } finally {
      setIsValidatingRoute(false)
    }
  }

  // Dynamic function routing verification
  useEffect(() => {
    validateRoute()
  }, [token, user])

  // Fetch home function details once logged in
  useEffect(() => {
    const fetchHomeFunction = async () => {
      if (!token || !user) return
      try {
        const response = await axios.get(`${API_BASE_URL}/api/v1/functions?name=Home`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
        setHomeFunction(response.data)
      } catch (err) {
        console.error('Failed to fetch home function:', err)
      }
    }
    fetchHomeFunction()
  }, [token, user])

  // General layout function block renderer
  const renderFunctionBlocks = (func: any) => {
    if (!func) return null

    const showFirst = func.name && func.name.toLowerCase() !== 'home'
    const showSecond = func.name === 'Home' || func.name === 'User' || func.type === 'SETT'
    const showThird = func.subFunctions && func.subFunctions.length > 0

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* First Block: Function name and other details */}
        {showFirst && (
          <div style={{ padding: '8px 0' }}>
            <h3 style={{ fontSize: '1.4rem', marginBottom: '8px', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              {func.description}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>功能名稱: {func.name} | 類型: {func.type}</p>
          </div>
        )}

        {/* Separator between First and Second, or First and Third */}
        {showFirst && (showSecond || showThird) && (
          <hr style={{ border: 'none', borderTop: '1px solid var(--card-border)', margin: '0' }} />
        )}

        {/* Second Block: Function content */}
        {showSecond && (
          <div style={{ padding: '8px 0' }}>
            {func.name === 'User' && user && (
              <div className="profile-header-card" style={{ display: 'flex', alignItems: 'center', gap: '20px', background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
                {user.avatarUrl ? (
                  <img className="avatar" src={user.avatarUrl} alt={user.nickname} style={{ width: '80px', height: '80px', borderRadius: '50%' }} />
                ) : (
                  <div className="avatar" style={{ width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '2rem', background: 'var(--accent-purple)' }}>
                    {user.nickname ? user.nickname.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
                <div>
                  <h4 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '4px' }}>{user.nickname}</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>真實姓名: {user.realName || '未填寫'}</p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>聯絡電話: {user.phone || '未填寫'}</p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>聯絡地址: {user.address || '未填寫'}</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>介紹: {user.description || '這個人很懶，什麼都沒寫。'}</p>
                </div>
                <button 
                  type="button"
                  className="btn btn-outline" 
                  onClick={openEditProfile}
                  style={{ marginLeft: 'auto', padding: '8px 16px', fontSize: '0.875rem' }}
                >
                  編輯資訊
                </button>
              </div>
            )}
            {func.name === 'Home' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '200px', opacity: 0.5, border: '2px dashed var(--card-border)', borderRadius: '16px', margin: '12px 0' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '16px' }}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <p style={{ fontSize: '1rem' }}>主畫面功能按鈕尚未規劃，暫時維持空白</p>
              </div>
            )}
            {func.type === 'SETT' && (
              <CRUDTable objectName={func.name.split('_').pop() || 'Config'} />
            )}
          </div>
        )}

        {/* Separator between Second and Third */}
        {showSecond && showThird && (
          <hr style={{ border: 'none', borderTop: '1px solid var(--card-border)', margin: '0' }} />
        )}

        {/* Third Block: Sub-functions */}
        {showThird && (
          <div style={{ padding: '8px 0' }}>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              {func.subFunctions.map((sub: any) => (
                <div 
                  key={sub.id}
                  className="sub-func-btn-container" 
                  style={{ position: 'relative', display: 'inline-block' }}
                >
                  <button
                    className="btn btn-outline"
                    onClick={() => navigateTo(`/${sub.name}`)}
                    style={{
                      width: '8vw',
                      height: '8vw',
                      minWidth: '80px',
                      minHeight: '80px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '12px',
                      padding: '8px',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      wordBreak: 'break-all',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--accent-purple)'
                      e.currentTarget.style.boxShadow = 'var(--neon-purple)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = ''
                      e.currentTarget.style.boxShadow = ''
                    }}
                  >
                    {sub.description}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  const navigateTo = (path: string) => {
    window.history.pushState({}, document.title, path)
    validateRoute(token, user)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
    setShowProfileModal(false)
  }

  // Trigger login redirect by fetching the OAuth authorization URL
  const handleLogin = async (provider: string) => {
    setIsLoading(true)
    setLoginError(null)

    // Save intended destination path for redirection after callback
    const currentPath = window.location.pathname
    if (currentPath && !currentPath.startsWith('/auth/callback')) {
      sessionStorage.setItem('redirect_to', currentPath)
    }

    try {
      const response = await axios.get(`${API_BASE_URL}/api/v1/auth/${provider}`)
      const { url } = response.data
      if (url) {
        window.location.href = url
      } else {
        throw new Error('OAuth URL not found')
      }
    } catch (err: any) {
      console.error(err)
      setLoginError(err.response?.data?.error || `Failed to start ${provider} login.`)
      setIsLoading(false)
    }
  }

  // Open profile editing modal
  const openEditProfile = () => {
    if (user) {
      setProfileForm({
        nickname: user.nickname || '',
        realName: user.realName || '',
        phone: user.phone || '',
        address: user.address || '',
        description: user.description || '',
      })
      setProfileError(null)
      setShowProfileModal(true)
    }
  }

  // Save profile changes
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const trimmedNickname = profileForm.nickname.trim()
    if (!trimmedNickname) {
      setProfileError('Nickname is required')
      return
    }

    setIsSavingProfile(true)
    setProfileError(null)

    try {
      const response = await axios.put(
        `${API_BASE_URL}/api/v1/users/me`,
        {
          nickname: trimmedNickname,
          realName: profileForm.realName,
          phone: profileForm.phone,
          address: profileForm.address,
          description: profileForm.description,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      const updatedUser = response.data
      localStorage.setItem('user', JSON.stringify(updatedUser))
      setUser(updatedUser)
      setShowProfileModal(false)
    } catch (err: any) {
      console.error(err)
      setProfileError(err.response?.data?.error || 'Failed to save profile.')
    } finally {
      setIsSavingProfile(false)
    }
  }

  // Determine if we need to show the forced login overlay
  // Forced if: no token exists, or loading/callback is not active but there is no user object
  const showForcedLogin = !token || !user

  if (isLoading && !token) {
    return (
      <div className="fullscreen-loader">
        <div className="spinner" style={{ width: '40px', height: '40px', color: 'var(--accent-purple)' }}></div>
        <p>連線第三方登入驗證中，請稍候...</p>
      </div>
    )
  }

  return (
    <>
      {/* Top Navbar */}
      <header className="app-header">
        <div 
          className="logo-container"
          onClick={() => { window.location.href = '/' }}
          style={{ cursor: 'pointer' }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="url(#logoGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <defs>
              <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--accent-blue)" />
                <stop offset="100%" stopColor="var(--accent-purple)" />
              </linearGradient>
            </defs>
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span className="logo-text">{appName}</span>
        </div>
        {user && (
          <div className="user-nav-profile">
            <div 
              className="user-nav-trigger" 
              onClick={() => navigateTo('/User')}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                cursor: 'pointer',
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              {user.avatarUrl ? (
                <img className="avatar" src={user.avatarUrl} alt={user.nickname} />
              ) : (
                <div className="avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                  {user.nickname ? user.nickname.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
              <span className="nav-nickname">{user.nickname}</span>
            </div>
             <button 
              className="btn btn-outline" 
              onClick={() => navigateTo('/Setting')} 
              style={{ padding: '8px 16px', fontSize: '0.875rem', marginRight: '8px' }}
            >
              設定
            </button>
            <button className="btn btn-outline" onClick={logout} style={{ padding: '8px 16px', fontSize: '0.875rem' }}>
              登出
            </button>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main style={{ flex: 1 }}>
        {user && (
          <div className="dashboard-container">
            {user.firstLogin && (
              <div className="first-login-banner">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <h4 style={{ fontWeight: 600 }}>請完成首次登入設定</h4>
                  <p style={{ color: 'rgba(59, 130, 246, 0.85)', fontSize: '0.9rem' }}>
                    這是您第一次登入，必須填寫並確認您的個人暱稱以解鎖完整功能。
                  </p>
                </div>
                <button className="btn btn-primary" onClick={openEditProfile} style={{ marginLeft: 'auto', padding: '8px 16px', fontSize: '0.875rem' }}>
                  立即設定
                </button>
              </div>
            )}

            {is404 ? (
              <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '350px', textAlign: 'center', padding: '40px', margin: '20px 0', border: '1px solid var(--accent-red)' }}>
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--accent-red)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '24px', filter: 'drop-shadow(var(--neon-red))' }}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                <h1 style={{ fontSize: '2rem', marginBottom: '8px', color: 'var(--text-primary)' }}>404 Function Not Found</h1>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>您存取的系統功能選單或頁面不存在或已被停用。</p>
                <button 
                  className="btn btn-primary" 
                  onClick={() => { window.location.href = '/' }}
                  style={{ padding: '10px 24px' }}
                >
                  返回首頁
                </button>
              </div>
            ) : isValidatingRoute ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', opacity: 0.6 }}>
                <div className="spinner" style={{ width: '30px', height: '30px', color: 'var(--accent-purple)', marginBottom: '16px' }}></div>
                <p style={{ fontSize: '0.95rem' }}>載入並驗證系統功能選單中...</p>
              </div>
            ) : (
              renderFunctionBlocks(homeFunction)
            )}
          </div>
        )}
      </main>

      {/* 1. Forced Login Modal */}
      {showForcedLogin && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content">
            <div style={{ textAlign: 'center' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent-purple)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(var(--neon-purple))' }}>
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <polyline points="17 11 19 13 23 9" />
              </svg>
            </div>
            <h2 className="modal-title">歡迎登入 {appName}</h2>
            <p className="modal-subtitle">請選擇您喜好的社群帳號，立即開始您的管理之旅。</p>

            {loginError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--accent-red)', padding: '12px', borderRadius: '8px', fontSize: '0.9rem', textAlign: 'center' }}>
                {loginError}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
              {/* LINE Login */}
              <button 
                className="btn oauth-btn oauth-btn-line" 
                onClick={() => handleLogin('line')}
                disabled={isLoading}
              >
                <svg className="oauth-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 10.3c0-5.7-5.4-10.3-12-10.3S0 4.6 0 10.3c0 5.1 4.3 9.3 10.1 10.1.4.1.9.3.9.7v2.3c0 .6-.3.8-.1.9.1.1.7-.2 3.5-2.1 4.1-1.3 9.6-4.9 9.6-11.9zM7.5 13.9H5.7V6.7h1.8v7.2zm4.8 0h-3.6V6.7h1.8V12h1.8v1.9zm2.7 0h-1.8V6.7h1.8v7.2zm5.7 0H19L17.2 9.5v4.4h-1.8V6.7h1.8l1.8 4.4V6.7h1.8v7.2z"/>
                </svg>
                使用 LINE 帳號登入
              </button>

              {/* Google Login */}
              <button 
                className="btn oauth-btn oauth-btn-google" 
                onClick={() => handleLogin('google')}
                disabled={isLoading}
              >
                <svg className="oauth-icon" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                使用 Google 帳號登入
              </button>

              {/* GitHub Login */}
              <button 
                className="btn oauth-btn oauth-btn-github" 
                onClick={() => handleLogin('github')}
                disabled={isLoading}
              >
                <svg className="oauth-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                使用 GitHub 帳號登入
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. General Function Modal (for type PAGE) */}
      {currentFunction && (currentFunction.type === 'PAGE' || currentFunction.type === 'SETT') && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content" style={{ 
            width: currentFunction.type === 'SETT' ? '90%' : '80%', 
            maxWidth: currentFunction.type === 'SETT' ? '90%' : '800px', 
            padding: '32px', 
            position: 'relative' 
          }}>
            {/* Close button (X) in top right */}
            <button 
              className="modal-close-btn" 
              onClick={() => navigateTo('/')}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: '1.5rem',
                cursor: 'pointer',
                transition: 'color 0.2s',
                padding: '4px',
                lineHeight: '1',
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
            >
              &times;
            </button>

            {/* Render three blocks for this PAGE function */}
            {renderFunctionBlocks(currentFunction)}
          </div>
        </div>
      )}

      {/* 2. Edit Profile Modal */}
      {showProfileModal && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <form className="glass-panel modal-content" onSubmit={handleSaveProfile} style={{ gap: '20px' }}>
            <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-purple)" strokeWidth="2.5">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              完成個人檔案設定
            </h2>
            
            {profileError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--accent-red)', padding: '12px', borderRadius: '8px', fontSize: '0.9rem', textAlign: 'center' }}>
                {profileError}
              </div>
            )}

            {/* Nickname (Required) */}
            <div className="form-group">
              <label className="form-label">
                使用者暱稱 (Nickname)<span className="required">*</span>
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="請輸入暱稱（不可重複）"
                value={profileForm.nickname}
                onChange={(e) => setProfileForm({ ...profileForm, nickname: e.target.value })}
                required
              />
            </div>

            {/* Real Name */}
            <div className="form-group">
              <label className="form-label">真實姓名 (Real Name)</label>
              <input
                type="text"
                className="form-control"
                placeholder="請輸入您的真實姓名"
                value={profileForm.realName}
                onChange={(e) => setProfileForm({ ...profileForm, realName: e.target.value })}
              />
            </div>

            {/* Phone */}
            <div className="form-group">
              <label className="form-label">聯絡電話 (Phone)</label>
              <input
                type="text"
                className="form-control"
                placeholder="請輸入您的電話號碼"
                value={profileForm.phone}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
              />
            </div>

            {/* Address */}
            <div className="form-group">
              <label className="form-label">通訊地址 (Address)</label>
              <input
                type="text"
                className="form-control"
                placeholder="請輸入您的通訊地址"
                value={profileForm.address}
                onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
              />
            </div>

            {/* Description */}
            <div className="form-group">
              <label className="form-label">個人簡介 (Description)</label>
              <textarea
                className="form-control"
                placeholder="介紹一下你自己吧..."
                value={profileForm.description}
                onChange={(e) => setProfileForm({ ...profileForm, description: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
              {/* Only show cancel button if they are NOT in forced first-login completion */}
              {user && !user.firstLogin && (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowProfileModal(false)}
                  disabled={isSavingProfile}
                >
                  取消
                </button>
              )}
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSavingProfile}
                style={{ minWidth: '100px' }}
              >
                {isSavingProfile ? (
                  <div className="spinner"></div>
                ) : (
                  '儲存設定'
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}

export default App
