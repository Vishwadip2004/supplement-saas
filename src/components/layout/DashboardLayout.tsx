'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import Sidebar from './Sidebar'
import { csrfFetch } from '@/lib/csrf-client'

const roleLabels: Record<string, string> = {
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  STAFF: 'Staff',
}

const roleBadgeColors: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-800',
  MANAGER: 'bg-purple-100 text-purple-800',
  STAFF: 'bg-green-100 text-green-800',
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [showRoleMenu, setShowRoleMenu] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [pendingRole, setPendingRole] = useState('')
  const [password, setPassword] = useState('')
  const [switchError, setSwitchError] = useState('')
  const [switching, setSwitching] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowRoleMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleRoleSwitch = async (targetRole: string) => {
    const currentRole = session?.user?.role
    if (currentRole === targetRole) {
      setShowRoleMenu(false)
      return
    }

    if (targetRole === 'ADMIN' || targetRole === 'MANAGER') {
      setPendingRole(targetRole)
      setPassword('')
      setSwitchError('')
      setShowPasswordModal(true)
      setShowRoleMenu(false)
      return
    }

    setSwitching(true)
    setSwitchError('')
    try {
      const res = await csrfFetch('/api/auth/switch-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetRole }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to switch role')
      }
      window.location.reload()
    } catch (err) {
      setSwitchError(err instanceof Error ? err.message : 'Failed to switch')
    } finally {
      setSwitching(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSwitching(true)
    setSwitchError('')
    try {
      const res = await csrfFetch('/api/auth/switch-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetRole: pendingRole, password }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to switch role')
      }
      setShowPasswordModal(false)
      window.location.reload()
    } catch (err) {
      setSwitchError(err instanceof Error ? err.message : 'Failed to switch')
    } finally {
      setSwitching(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  const currentRole = session.user?.role || 'STAFF'

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <header className="bg-white shadow-sm h-16 flex items-center justify-between px-6">
          <h2 className="text-lg font-semibold text-gray-800">Dashboard</h2>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="w-9 h-9 bg-indigo-600 rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold text-white">
                  {session.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-gray-900">{session.user?.name}</p>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${roleBadgeColors[currentRole]}`}>
                  {roleLabels[currentRole]}
                </span>
              </div>
              <svg className={`w-4 h-4 text-gray-400 transition-transform ${showRoleMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showRoleMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Switch Role</p>
                </div>
                {['ADMIN', 'MANAGER', 'STAFF'].map((role) => (
                  <button
                    key={role}
                    onClick={() => handleRoleSwitch(role)}
                    disabled={switching || currentRole === role}
                    className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 transition-colors ${
                      currentRole === role
                        ? 'bg-indigo-50 text-indigo-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    } disabled:opacity-50`}
                  >
                    <span className={`w-2 h-2 rounded-full ${
                      currentRole === role ? 'bg-indigo-600' : 'bg-gray-300'
                    }`} />
                    <span>{roleLabels[role]}</span>
                    {currentRole === role && (
                      <span className="ml-auto text-xs text-indigo-600">Current</span>
                    )}
                    {currentRole !== role && (role === 'ADMIN' || role === 'MANAGER') && (
                      <svg className="ml-auto w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    )}
                  </button>
                ))}
                <div className="border-t border-gray-100 mt-1 pt-1">
                  <button
                    onClick={() => signOut({ callbackUrl: '/auth/login' })}
                    className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>

      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Verify Password</h3>
            <p className="text-sm text-gray-500 mb-4">
              Enter your password to switch to {roleLabels[pendingRole]} role
            </p>
            {switchError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm mb-3">
                {switchError}
              </div>
            )}
            <form onSubmit={handlePasswordSubmit}>
              <input
                type="password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 mb-4"
                placeholder="Enter your password"
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setShowPasswordModal(false); setPendingRole(''); setPassword(''); setSwitchError('') }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={switching || !password}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm disabled:opacity-50"
                >
                  {switching ? 'Switching...' : 'Switch Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
