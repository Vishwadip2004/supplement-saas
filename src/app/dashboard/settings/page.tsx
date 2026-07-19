'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { csrfFetch } from '@/lib/csrf-client'
import { useSession } from 'next-auth/react'

export default function SecurityPage() {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN'

  const [mfaEnabled, setMfaEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [qrCode, setQrCode] = useState('')
  const [secret, setSecret] = useState('')
  const [verifyCode, setVerifyCode] = useState('')
  const [setupStep, setSetupStep] = useState<'idle' | 'show-qr' | 'verify'>('idle')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [disableCode, setDisableCode] = useState('')
  const [showDisable, setShowDisable] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [passwordError, setPasswordError] = useState('')

  const [shopName, setShopName] = useState('')
  const [shopNameLoading, setShopNameLoading] = useState(true)
  const [savingShopName, setSavingShopName] = useState(false)
  const [shopNameSuccess, setShopNameSuccess] = useState('')
  const [shopNameError, setShopNameError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function checkMfaStatus() {
      try {
        const res = await fetch('/api/auth/mfa/status')
        if (res.ok && !cancelled) {
          const data = await res.json()
          setMfaEnabled(data.mfaEnabled)
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    checkMfaStatus()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function fetchShopName() {
      try {
        const res = await fetch('/api/shop-settings')
        if (res.ok && !cancelled) {
          const data = await res.json()
          setShopName(data.shopName)
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setShopNameLoading(false)
      }
    }
    fetchShopName()
    return () => { cancelled = true }
  }, [])

  const handleSaveShopName = async () => {
    setShopNameError('')
    setShopNameSuccess('')
    if (!shopName.trim()) {
      setShopNameError('Shop name is required')
      return
    }
    setSavingShopName(true)
    try {
      const res = await csrfFetch('/api/shop-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopName: shopName.trim() }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save')
      }
      const data = await res.json()
      setShopName(data.shopName)
      setShopNameSuccess('Shop name updated! Refresh to see changes in sidebar.')
      setTimeout(() => setShopNameSuccess(''), 3000)
    } catch (err) {
      setShopNameError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSavingShopName(false)
    }
  }

  const handleSetup = async () => {
    setError('')
    setSuccess('')
    try {
      const res = await csrfFetch('/api/auth/mfa/setup', { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to setup MFA')
        return
      }
      const data = await res.json()
      setQrCode(data.qrCode)
      setSecret(data.secret)
      setSetupStep('show-qr')
    } catch {
      setError('Failed to setup MFA')
    }
  }

  const handleVerify = async () => {
    if (verifyCode.length !== 6) return
    setSubmitting(true)
    setError('')
    try {
      const res = await csrfFetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verifyCode }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Invalid code')
        return
      }
      setMfaEnabled(true)
      setSetupStep('idle')
      setSecret('')
      setQrCode('')
      setSuccess('MFA enabled successfully')
      setVerifyCode('')
    } catch {
      setError('Failed to verify code')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDisable = async () => {
    if (disableCode.length !== 6) return
    setSubmitting(true)
    setError('')
    try {
      const res = await csrfFetch('/api/auth/mfa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: disableCode }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Invalid code')
        return
      }
      setMfaEnabled(false)
      setShowDisable(false)
      setSuccess('MFA disabled successfully')
      setDisableCode('')
    } catch {
      setError('Failed to disable MFA')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match')
      return
    }
    if (newPassword.length < 12) {
      setPasswordError('Password must be at least 12 characters')
      return
    }

    setChangingPassword(true)
    try {
      const res = await csrfFetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })

      const data = await res.json()
      if (!res.ok) {
        setPasswordError(data.error || 'Failed to change password')
        return
      }
      setPasswordSuccess(data.message || 'Password changed successfully')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch {
      setPasswordError('Failed to change password')
    } finally {
      setChangingPassword(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">{success}</div>
      )}

      {/* Shop Settings */}
      {isAdmin && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Shop Settings</h2>
          <p className="text-sm text-gray-500 mb-4">Customize how your shop appears in the application</p>

          {shopNameError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{shopNameError}</div>
          )}
          {shopNameSuccess && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">{shopNameSuccess}</div>
          )}

          {shopNameLoading ? (
            <div className="text-sm text-gray-500">Loading...</div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Shop / App Name</label>
                <div className="flex gap-3 mt-1">
                  <input
                    type="text"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    maxLength={50}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="e.g. My Supplement Shop"
                  />
                  <button
                    onClick={handleSaveShopName}
                    disabled={savingShopName || !shopName.trim()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                  >
                    {savingShopName ? 'Saving...' : 'Save'}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">This name will appear in the sidebar and browser tab. Max 50 characters.</p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h2>

        {passwordError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{passwordError}</div>
        )}
        {passwordSuccess && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">{passwordSuccess}</div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={12}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <p className="mt-1 text-xs text-gray-500">Min 12 characters, uppercase, lowercase, number, special character</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={changingPassword}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {changingPassword ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Two-Factor Authentication</h2>
        
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-gray-600">
              {mfaEnabled
                ? 'Two-factor authentication is enabled on your account.'
                : 'Add an extra layer of security to your account.'}
            </p>
          </div>
          <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
            mfaEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }`}>
            {mfaEnabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>

        {setupStep === 'show-qr' && (
          <div className="mt-6 border-t pt-6">
            <h3 className="text-md font-medium text-gray-900 mb-4">Step 1: Scan QR Code</h3>
            <p className="text-sm text-gray-600 mb-4">
              Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.):
            </p>
            <div className="flex justify-center mb-4">
              <div className="bg-white p-4 border rounded-lg">
                <Image src={qrCode} alt="MFA QR Code" width={192} height={192} unoptimized />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-2">Or enter this secret manually:</p>
            <code className="block bg-gray-100 p-3 rounded text-sm font-mono break-all mb-6">{secret}</code>
            
            <h3 className="text-md font-medium text-gray-900 mb-4">Step 2: Enter Verification Code</h3>
            <p className="text-sm text-gray-600 mb-4">
              Enter the 6-digit code from your authenticator app to verify setup:
            </p>
            <div className="flex gap-4">
              <input
                type="text"
                inputMode="numeric"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-center text-lg tracking-widest focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="000000"
                maxLength={6}
              />
              <button
                onClick={handleVerify}
                disabled={submitting || verifyCode.length !== 6}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Verifying...' : 'Verify & Enable'}
              </button>
            </div>
            <button
              onClick={() => { setSetupStep('idle'); setVerifyCode(''); setQrCode(''); setSecret('') }}
              className="mt-4 text-sm text-indigo-600 hover:text-indigo-500"
            >
              Cancel
            </button>
          </div>
        )}

        {setupStep === 'idle' && !mfaEnabled && (
          <button
            onClick={handleSetup}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Enable Two-Factor Authentication
          </button>
        )}

        {mfaEnabled && !showDisable && (
          <button
            onClick={() => setShowDisable(true)}
            className="mt-4 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
          >
            Disable Two-Factor Authentication
          </button>
        )}

        {showDisable && (
          <div className="mt-4 border-t pt-4">
            <p className="text-sm text-gray-600 mb-3">
              Enter your authenticator code to disable MFA:
            </p>
            <div className="flex gap-4">
              <input
                type="text"
                inputMode="numeric"
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-center text-lg tracking-widest focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="000000"
                maxLength={6}
              />
              <button
                onClick={handleDisable}
                disabled={submitting || disableCode.length !== 6}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Disabling...' : 'Disable MFA'}
              </button>
            </div>
            <button
              onClick={() => { setShowDisable(false); setDisableCode('') }}
              className="mt-3 text-sm text-gray-600 hover:text-gray-900"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
