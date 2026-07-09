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

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Security Settings</h1>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">{success}</div>
      )}

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
