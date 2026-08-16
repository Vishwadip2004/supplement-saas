'use client'

import { useState, useEffect } from 'react'
import { formatCurrency } from '@/utils'

interface ExpiryLot {
  id: string
  batchNumber: string
  quantity: number
  expiryDate: string
  purchasePrice: number | null
  product: { id: string; name: string; sku: string; category: string }
  daysExpired?: number
  daysUntilExpiry?: number
}

interface ExpiryData {
  expired: ExpiryLot[]
  expiring30: ExpiryLot[]
  expiring60: ExpiryLot[]
  expiring90: ExpiryLot[]
  summary: {
    expiredCount: number
    expiredQuantity: number
    expiredValue: number
    expiring30Count: number
    expiring60Count: number
    expiring90Count: number
  }
}

export default function ExpiryAlertsPage() {
  const [data, setData] = useState<ExpiryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'expired' | '30' | '60' | '90'>('expired')

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/expiry-alerts')
        if (!res.ok) throw new Error('Failed to fetch expiry alerts')
        const json = await res.json()
        setData(json)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <svg className="animate-spin h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">{error}</div>
    )
  }

  if (!data) return null

  const tabs = [
    { key: 'expired', label: 'Expired', count: data.summary.expiredCount, bg: 'bg-red-500', border: 'border-red-600', text: 'text-white' },
    { key: '30', label: 'Expiring in 30 Days', count: data.summary.expiring30Count, bg: 'bg-orange-500', border: 'border-orange-600', text: 'text-white' },
    { key: '60', label: 'Expiring in 60 Days', count: data.summary.expiring60Count, bg: 'bg-amber-400', border: 'border-amber-500', text: 'text-gray-900' },
    { key: '90', label: 'Expiring in 90 Days', count: data.summary.expiring90Count, bg: 'bg-blue-500', border: 'border-blue-600', text: 'text-white' },
  ] as const

  const getActiveLots = () => {
    switch (activeTab) {
      case 'expired': return data.expired
      case '30': return data.expiring30
      case '60': return data.expiring60
      case '90': return data.expiring90
    }
  }

  const activeLots = getActiveLots()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Expiry Alerts</h1>
        <p className="text-sm text-gray-500 mt-1">Monitor product expiration dates and take action</p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">{error}</div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              activeTab === tab.key
                ? `${tab.bg} ${tab.border} ${tab.text} shadow-lg scale-[1.02]`
                : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
            }`}
          >
            <p className={`text-2xl font-bold ${activeTab === tab.key ? tab.text : 'text-gray-900'}`}>{tab.count}</p>
            <p className={`text-sm font-medium mt-1 ${activeTab === tab.key ? tab.text : 'text-gray-600'}`}>{tab.label}</p>
          </button>
        ))}
      </div>

      {data.summary.expiredCount > 0 && (
        <div className="bg-red-100 border-2 border-red-300 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="font-semibold text-red-800">
                {data.summary.expiredQuantity} units expired ({data.summary.expiredCount} lots)
              </p>
              <p className="text-sm text-red-600">
                Estimated loss: {formatCurrency(data.summary.expiredValue)}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expiry Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Value</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {activeLots.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-500">
                    No lots in this category
                  </td>
                </tr>
              ) : (
                activeLots.map((lot) => {
                  const isExpired = activeTab === 'expired'
                  return (
                    <tr key={lot.id} className={isExpired ? 'bg-red-50 border-l-4 border-red-400' : ''}>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-gray-900">{lot.product.name}</p>
                        <p className="text-xs text-gray-500">{lot.product.sku}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{lot.batchNumber}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{lot.product.category}</td>
                      <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">{lot.quantity}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {new Date(lot.expiryDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        {isExpired ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-200 text-red-900">
                            Expired {lot.daysExpired}d ago
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-200 text-amber-900">
                            {lot.daysUntilExpiry}d left
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">
                        {lot.purchasePrice ? formatCurrency(Number(lot.purchasePrice) * lot.quantity) : '-'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
