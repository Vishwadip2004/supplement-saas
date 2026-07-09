'use client'

import { useEffect, useState } from 'react'

interface Stats {
  totalProducts: number
  lowStock: number
  expiringSoon: number
  totalSales: number
  todaySales: number
  totalCustomers: number
  recentSales: Array<{
    id: string
    quantity: number
    totalAmount: number
    paymentMethod: string
    createdAt: string
    product: { name: string }
  }>
}

export default function ReportsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/reports')
        if (!res.ok) throw new Error('Failed to fetch')
        const data = await res.json()
        setStats(data)
      } catch {
        setError('Failed to load reports')
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error}</p>
      </div>
    )
  }

  if (!stats) return null

  const cards = [
    { label: 'Total Products', value: stats.totalProducts, color: 'blue', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
    { label: 'Low Stock', value: stats.lowStock, color: 'yellow', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
    { label: 'Expiring Soon', value: stats.expiringSoon, color: 'red', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { label: 'Total Sales', value: `$${Number(stats.totalSales).toLocaleString()}`, color: 'green', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { label: 'Today\'s Sales', value: `$${Number(stats.todaySales).toLocaleString()}`, color: 'purple', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
    { label: 'Total Customers', value: stats.totalCustomers, color: 'indigo', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  ]

  const colorMap: Record<string, { bg: string; text: string }> = {
    blue: { bg: 'bg-blue-100', text: 'text-blue-600' },
    yellow: { bg: 'bg-yellow-100', text: 'text-yellow-600' },
    red: { bg: 'bg-red-100', text: 'text-red-600' },
    green: { bg: 'bg-green-100', text: 'text-green-600' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-600' },
    indigo: { bg: 'bg-indigo-100', text: 'text-indigo-600' },
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {cards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center">
              <div className={`w-12 h-12 ${colorMap[card.color].bg} rounded-lg flex items-center justify-center`}>
                <svg className={`w-6 h-6 ${colorMap[card.color].text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={card.icon} />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">{card.label}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Sales</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-500 border-b border-gray-200">
                <th className="pb-3 font-medium">Date</th>
                <th className="pb-3 font-medium">Product</th>
                <th className="pb-3 font-medium">Qty</th>
                <th className="pb-3 font-medium">Total</th>
                <th className="pb-3 font-medium">Payment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {stats.recentSales.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">No recent sales</td>
                </tr>
              ) : (
                stats.recentSales.map((sale) => (
                  <tr key={sale.id} className="text-sm">
                    <td className="py-3 text-gray-900">{new Date(sale.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 text-gray-900">{sale.product.name}</td>
                    <td className="py-3 text-gray-600">{sale.quantity}</td>
                    <td className="py-3 text-gray-900">${Number(sale.totalAmount).toLocaleString()}</td>
                    <td className="py-3">
                      <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                        {sale.paymentMethod}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
