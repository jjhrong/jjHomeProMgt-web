import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'

export interface SearchFunction {
  id: string
  name: string
  type: string
  description: string
}

export interface SearchUser {
  id: string
  realName: string
  email: string
}

export interface SearchResponse {
  functions: SearchFunction[]
  users: SearchUser[]
}

interface AutoCompleteSearchProps {
  token: string | null
  apiBaseUrl: string
  onNavigate: (path: string) => void
  onSelectUser: (user: SearchUser) => void
}

export const AutoCompleteSearch: React.FC<AutoCompleteSearchProps> = ({
  token,
  apiBaseUrl,
  onNavigate,
  onSelectUser,
}) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Handle clicking outside the search component to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        if (!query.trim()) {
          setIsExpanded(false)
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [query])

  // Focus input when search bar expands
  useEffect(() => {
    if (isExpanded) {
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus()
        }
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [isExpanded])

  // 300ms Debounce search API call
  useEffect(() => {
    if (!query.trim()) {
      setResults(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    const handler = setTimeout(async () => {
      try {
        const headers: Record<string, string> = {}
        if (token) {
          headers['Authorization'] = `Bearer ${token}`
        }
        const res = await axios.get<SearchResponse>(`${apiBaseUrl}/api/v1/search?q=${encodeURIComponent(query)}`, {
          headers,
        })
        const data = res.data
        setResults({
          functions: data.functions || [],
          users: data.users || [],
        })
      } catch (err) {
        console.error('Failed to search:', err)
        setResults({ functions: [], users: [] })
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => {
      clearTimeout(handler)
    }
  }, [query, token, apiBaseUrl])

  const handleFunctionClick = (func: SearchFunction) => {
    setIsOpen(false)
    setQuery('')
    onNavigate(`/${func.name}`)
  }

  const handleUserClick = (user: SearchUser) => {
    setIsOpen(false)
    setQuery('')
    onSelectUser(user)
  }

  const hasResults = results && (
    (results.functions && results.functions.length > 0) || 
    (results.users && results.users.length > 0)
  )

  return (
    <div 
      ref={containerRef} 
      className={`relative flex items-center justify-end transition-all duration-300 ease-in-out ${
        isExpanded ? 'w-64 sm:w-80 md:w-96 lg:w-[400px] h-[48px]' : 'w-[48px] h-[48px]'
      }`}
    >
      {/* Search Input Box / Trigger Icon */}
      {isExpanded ? (
        <div className="relative w-full flex items-center h-[48px]">
          <span className="absolute left-4 text-slate-400">
            <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            ref={inputRef}
            type="text"
            placeholder="搜尋功能或使用者..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setIsOpen(true)
            }}
            onFocus={() => setIsOpen(true)}
            className="w-full bg-slate-950/45 border border-white/10 rounded-full py-2 text-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all duration-300 shadow-lg h-[48px]"
            style={{ paddingLeft: '3.5rem', paddingRight: '3.5rem' }}
          />
          {isLoading && (
            <span className="absolute right-12 flex items-center">
              <div className="w-4 h-4 border-2 border-slate-400/30 border-t-slate-400 rounded-full animate-spin"></div>
            </span>
          )}
          <button
            onClick={() => {
              if (query) {
                setQuery('')
                setResults(null)
              } else {
                setIsExpanded(false)
                setIsOpen(false)
              }
            }}
            className="absolute right-4 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="relative flex items-center justify-center text-slate-400 hover:text-white bg-slate-900/50 hover:bg-slate-800/60 border-2 border-slate-800/80 rounded-full transition duration-200 cursor-pointer shadow-sm focus:outline-none w-[48px] h-[48px] flex-shrink-0"
          aria-label="Search"
        >
          <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
      )}

      {/* Floating AutoComplete Dropdown */}
      {isExpanded && isOpen && query.trim() !== '' && (
        <div 
          className="absolute top-full left-0 right-0 mt-3 max-h-96 overflow-y-auto bg-slate-900/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl z-50"
          style={{
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          {isLoading && !results && (
            <div className="text-sm text-slate-400 text-center py-2">搜尋中...</div>
          )}

          {!isLoading && results && !hasResults && (
            <div className="text-sm text-slate-400 text-center py-2">無相符結果</div>
          )}

          {results && (
            <>
              {/* Functions Section */}
              {results.functions && results.functions.length > 0 && (
                <div className="flex flex-col gap-1">
                  <div className="px-3 py-1.5 text-xs font-semibold text-violet-400 uppercase tracking-wider">
                    功能項目
                  </div>
                  <ul className="flex flex-col gap-1">
                    {results.functions.map((func) => (
                      <li
                        key={func.id}
                        onClick={() => handleFunctionClick(func)}
                        className="px-4 py-2.5 text-sm text-slate-300 hover:bg-violet-600/20 hover:text-white flex items-center justify-between cursor-pointer transition-colors rounded-lg group"
                      >
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-slate-400 group-hover:text-violet-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <span>{func.description}</span>
                        </div>
                        <span className="text-xs text-slate-500 font-mono group-hover:text-slate-400">/{func.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Users Section */}
              {results.users && results.users.length > 0 && (
                <div className="flex flex-col gap-1 mt-2">
                  <div className="px-3 py-1.5 text-xs font-semibold text-teal-400 uppercase tracking-wider">
                    使用者項目
                  </div>
                  <ul className="flex flex-col gap-1">
                    {results.users.map((user) => (
                      <li
                        key={user.id}
                        onClick={() => handleUserClick(user)}
                        className="px-4 py-2.5 text-sm text-slate-300 hover:bg-teal-600/20 hover:text-white flex items-center justify-between cursor-pointer transition-colors rounded-lg group"
                      >
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-slate-400 group-hover:text-teal-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span>{user.realName}</span>
                        </div>
                        <span className="text-xs text-slate-500 font-mono group-hover:text-slate-400">{user.email}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
