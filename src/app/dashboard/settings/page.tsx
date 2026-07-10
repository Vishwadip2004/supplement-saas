'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

export default function SecurityPage() {
  const [mfaEnabled, setMfaEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [qrUri, setQrUri] = useState('')
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

  const handleSetup = async () => {
    setError('')
    setSuccess('')
    try {
      const res = await fetch('/api/auth/mfa/setup', { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to setup MFA')
        return
      }
      const data = await res.json()
      setQrUri(data.uri)
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
      const res = await fetch('/api/auth/mfa/verify', {
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
      setQrUri('')
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
      const res = await fetch('/api/auth/mfa/disable', {
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
      const csrfRes = await fetch('/api/csrf')
      const csrfData = await csrfRes.json()
      const csrfToken = csrfData.csrfToken

      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Security Settings</h1>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">{success}</div>
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
                <Image src={qrUri} alt="MFA QR Code" width={192} height={192} />
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
              onClick={() => { setSetupStep('idle'); setVerifyCode(''); setQrUri(''); setSecret('') }}
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
