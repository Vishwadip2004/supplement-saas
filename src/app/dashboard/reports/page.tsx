'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatCurrency, formatDate } from '@/utils'

interface OverviewData {
  period: { from: string; to: string }
  kpi: {
    totalRevenue: number
    totalCost: number
    totalProfit: number
    profitMargin: number
    totalTax: number
    totalDiscount: number
    totalInvoices: number
    avgOrderValue: number
    totalProducts: number
    stockValue: number
    retailValue: number
  }
  topSelling: Array<{ id: string; name: string; sku: string; category: string; sold: number; revenue: number; profit: number; stock: number }>
  topProfit: Array<{ id: string; name: string; sku: string; category: string; sold: number; revenue: number; profit: number; stock: number }>
  slowMoving: Array<{ id: string; name: string; sku: string; category: string; sold: number; revenue: number; profit: number; stock: number }>
  lowStock: Array<{ id: string; name: string; sku: string; quantity: number; minStock: number; category: string }>
  outOfStockCount: number
  expiringSoon: Array<{ id: string; batchNumber: string; productName: string; expiryDate: string; quantity: number }>
  salesTrend: Array<{ date: string; revenue: number; profit: number; count: number }>
  monthlyProfit: Array<{ month: string; revenue: number; cost: number; profit: number; count: number; margin: number }>
  paymentBreakdown: Record<string, number>
  gstSummary: Record<string, { taxable: number; tax: number }>
  recentSales: Array<{ id: string; invoiceNumber?: string; product: string; amount: number; date: string }>
}

export default function ReportsPage() {
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<OverviewData | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'profit' | 'products' | 'inventory' | 'tax'>('overview')

  const fetchReport = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ type: 'overview', from: dateFrom, to: dateTo })
      const res = await fetch(`/api/reports/advanced?${params}`)
      if (!res.ok) throw new Error('Failed to fetch report')
      setData(await res.json())
    } catch {
      setError('Failed to load report data')
    } finally {
      setLoading(false)
    }
  }, [dateFrom, dateTo])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      try {
        const params = new URLSearchParams({ type: 'overview', from: dateFrom, to: dateTo })
        const res = await fetch(`/api/reports/advanced?${params}`)
        if (!res.ok) throw new Error('Failed to fetch report')
        const d = await res.json()
        if (!cancelled) setData(d)
      } catch {
        if (!cancelled) setError('Failed to load report data')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [dateFrom, dateTo])

  const exportCsv = () => {
    if (!data) return
    const esc = (v: string | number) => {
      const s = String(v)
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`
      }
      return s
    }
    const rows = [
      ['METRIC', 'VALUE'],
      ['Total Revenue', esc(data.kpi.totalRevenue)],
      ['Total Cost (COGS)', esc(data.kpi.totalCost)],
      ['Gross Profit', esc(data.kpi.totalProfit)],
      ['Profit Margin', esc(`${data.kpi.profitMargin}%`)],
      ['Total Tax Collected', esc(data.kpi.totalTax)],
      ['Total Discounts Given', esc(data.kpi.totalDiscount)],
      ['Total Invoices', esc(data.kpi.totalInvoices)],
      ['Avg Order Value', esc(data.kpi.avgOrderValue)],
      ['Total Products', esc(data.kpi.totalProducts)],
      ['Stock Value (Cost)', esc(data.kpi.stockValue)],
      ['Retail Value', esc(data.kpi.retailValue)],
      [],
      ['TOP SELLING PRODUCTS'],
      ['Product', 'SKU', 'Category', 'Units Sold', 'Revenue', 'Profit'],
      ...data.topSelling.map(p => [esc(p.name), esc(p.sku), esc(p.category), p.sold, p.revenue.toFixed(2), p.profit.toFixed(2)]),
      [],
      ['TOP PROFITABLE PRODUCTS'],
      ['Product', 'SKU', 'Units Sold', 'Revenue', 'Profit'],
      ...data.topProfit.map(p => [esc(p.name), esc(p.sku), p.sold, p.revenue.toFixed(2), p.profit.toFixed(2)]),
      [],
      ['LOW STOCK ALERTS'],
      ['Product', 'SKU', 'Current Stock', 'Min Stock'],
      ...data.lowStock.map(p => [esc(p.name), esc(p.sku), p.quantity, p.minStock]),
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `business-report-${dateFrom}-to-${dateTo}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Business Reports</h1>
        <div className="flex gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <button onClick={fetchReport} disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium">
            {loading ? 'Loading...' : 'Refresh'}
          </button>
          <button onClick={exportCsv} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">
            Export CSV
          </button>
        </div>
      </div>

      {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>}

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      )}

      {!loading && data && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
            <KpiCard label="Revenue" value={formatCurrency(data.kpi.totalRevenue)} icon="revenue" />
            <KpiCard label="Profit" value={formatCurrency(data.kpi.totalProfit)} icon="profit" positive={data.kpi.totalProfit > 0} />
            <KpiCard label="Profit Margin" value={`${data.kpi.profitMargin}%`} icon="margin" />
            <KpiCard label="Orders" value={String(data.kpi.totalInvoices)} icon="orders" />
            <KpiCard label="Avg Order" value={formatCurrency(data.kpi.avgOrderValue)} icon="avg" />
            <KpiCard label="Tax Collected" value={formatCurrency(data.kpi.totalTax)} icon="tax" />
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
            {(['overview', 'profit', 'products', 'inventory', 'tax'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
                {tab === 'overview' ? 'Overview' : tab === 'profit' ? 'Profit' : tab === 'products' ? 'Products' : tab === 'inventory' ? 'Inventory' : 'Tax (GST)'}
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Sales Trend */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Daily Sales Trend</h3>
                  {data.salesTrend.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-8">No sales in this period</p>
                  ) : (
                    <div className="space-y-2">
                      {data.salesTrend.slice(-10).map(day => {
                        const maxRevenue = Math.max(...data.salesTrend.map(d => d.revenue))
                        const width = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0
                        return (
                          <div key={day.date} className="flex items-center gap-3">
                            <span className="text-xs text-gray-500 w-16 shrink-0">{new Date(day.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                            <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                              <div className="h-full bg-indigo-500 rounded-full flex items-center justify-end pr-2" style={{ width: `${Math.max(width, 8)}%` }}>
                                <span className="text-[10px] text-white font-medium">{formatCurrency(day.revenue)}</span>
                              </div>
                            </div>
                            <span className="text-xs text-green-600 w-16 text-right shrink-0">+{formatCurrency(day.profit)}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Payment Breakdown */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Payment Methods</h3>
                  {Object.keys(data.paymentBreakdown).length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-8">No payments recorded</p>
                  ) : (
                    <div className="space-y-3">
                      {Object.entries(data.paymentBreakdown)
                        .sort(([, a], [, b]) => b - a)
                        .map(([method, amount]) => {
                          const total = Object.values(data.paymentBreakdown).reduce((s, v) => s + v, 0)
                          const pct = total > 0 ? (amount / total) * 100 : 0
                          const methodLabels: Record<string, string> = { CASH: 'Cash', CARD: 'Card', UPI: 'UPI', TRANSFER: 'Bank Transfer', OTHER: 'Other' }
                          return (
                            <div key={method}>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="font-medium text-gray-700">{methodLabels[method] || method}</span>
                                <span className="text-gray-900">{formatCurrency(amount)} ({pct.toFixed(0)}%)</span>
                              </div>
                              <div className="w-full bg-gray-100 rounded-full h-2">
                                <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${pct}%` }}></div>
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Sales */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Recent Sales</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="text-xs text-gray-500 border-b">
                        <th className="text-left pb-2 font-medium">Invoice</th>
                        <th className="text-left pb-2 font-medium">Product</th>
                        <th className="text-right pb-2 font-medium">Amount</th>
                        <th className="text-left pb-2 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {data.recentSales.map(sale => (
                        <tr key={sale.id} className="text-sm">
                          <td className="py-2 font-mono text-indigo-600">{sale.invoiceNumber || '-'}</td>
                          <td className="py-2 text-gray-900">{sale.product}</td>
                          <td className="py-2 text-right font-medium text-gray-900">{formatCurrency(sale.amount)}</td>
                          <td className="py-2 text-gray-500">{formatDate(sale.date)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Profit Tab */}
          {activeTab === 'profit' && (
            <div className="space-y-6">
              {/* Profit Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <p className="text-xs text-gray-500">Total Revenue</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(data.kpi.totalRevenue)}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <p className="text-xs text-gray-500">Total Cost (COGS)</p>
                  <p className="text-xl font-bold text-red-600 mt-1">{formatCurrency(data.kpi.totalCost)}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <p className="text-xs text-gray-500">Gross Profit</p>
                  <p className={`text-xl font-bold mt-1 ${data.kpi.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(data.kpi.totalProfit)}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <p className="text-xs text-gray-500">Profit Margin</p>
                  <p className={`text-xl font-bold mt-1 ${data.kpi.profitMargin >= 20 ? 'text-green-600' : data.kpi.profitMargin >= 10 ? 'text-yellow-600' : 'text-red-600'}`}>{data.kpi.profitMargin}%</p>
                </div>
              </div>

              {/* Monthly Profit */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-1">Monthly Profit Breakdown</h3>
                <p className="text-xs text-gray-500 mb-4">Revenue, cost, profit and margin for each month in the selected period</p>
                {data.monthlyProfit.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">No data for this period</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="text-xs text-gray-500 border-b">
                          <th className="text-left pb-2 font-medium">Month</th>
                          <th className="text-right pb-2 font-medium">Invoices</th>
                          <th className="text-right pb-2 font-medium">Revenue</th>
                          <th className="text-right pb-2 font-medium">Cost</th>
                          <th className="text-right pb-2 font-medium">Profit</th>
                          <th className="text-right pb-2 font-medium">Margin</th>
                          <th className="pb-2 font-medium" style={{ width: '120px' }}></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {data.monthlyProfit.map(m => {
                          const maxRevenue = Math.max(...data.monthlyProfit.map(x => x.revenue))
                          const barWidth = maxRevenue > 0 ? (m.revenue / maxRevenue) * 100 : 0
                          return (
                            <tr key={m.month} className="text-sm hover:bg-gray-50">
                              <td className="py-3 font-medium text-gray-900">
                                {new Date(m.month + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                              </td>
                              <td className="py-3 text-right text-gray-600">{m.count}</td>
                              <td className="py-3 text-right text-gray-900">{formatCurrency(m.revenue)}</td>
                              <td className="py-3 text-right text-red-600">{formatCurrency(m.cost)}</td>
                              <td className={`py-3 text-right font-bold ${m.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(m.profit)}
                              </td>
                              <td className="py-3 text-right">
                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${m.margin >= 20 ? 'bg-green-100 text-green-800' : m.margin >= 10 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                                  {m.margin}%
                                </span>
                              </td>
                              <td className="py-3 pl-2">
                                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                  <div className={`h-2 rounded-full ${m.profit >= 0 ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${barWidth}%` }}></div>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Daily Profit */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-1">Daily Profit Breakdown</h3>
                <p className="text-xs text-gray-500 mb-4">Day-by-day profit for the selected period</p>
                {data.salesTrend.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">No sales in this period</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="text-xs text-gray-500 border-b">
                          <th className="text-left pb-2 font-medium">Date</th>
                          <th className="text-right pb-2 font-medium">Orders</th>
                          <th className="text-right pb-2 font-medium">Revenue</th>
                          <th className="text-right pb-2 font-medium">Cost</th>
                          <th className="text-right pb-2 font-medium">Profit</th>
                          <th className="pb-2 font-medium" style={{ width: '120px' }}></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {data.salesTrend.map(day => {
                          const maxRevenue = Math.max(...data.salesTrend.map(d => d.revenue))
                          const barWidth = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0
                          const cost = day.revenue - day.profit
                          return (
                            <tr key={day.date} className="text-sm hover:bg-gray-50">
                              <td className="py-2 text-gray-900">
                                {new Date(day.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', weekday: 'short' })}
                              </td>
                              <td className="py-2 text-right text-gray-600">{day.count}</td>
                              <td className="py-2 text-right text-gray-900">{formatCurrency(day.revenue)}</td>
                              <td className="py-2 text-right text-red-600">{formatCurrency(cost)}</td>
                              <td className={`py-2 text-right font-bold ${day.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(day.profit)}
                              </td>
                              <td className="py-2 pl-2">
                                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                  <div className={`h-2 rounded-full ${day.profit >= 0 ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${barWidth}%` }}></div>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Products Tab */}
          {activeTab === 'products' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Selling */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Top Selling Products</h3>
                  {data.topSelling.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-8">No sales in this period</p>
                  ) : (
                    <div className="space-y-3">
                      {data.topSelling.map((p, i) => (
                        <div key={p.id} className="flex items-center gap-3">
                          <span className="text-lg font-bold text-gray-300 w-6 text-center">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                            <p className="text-xs text-gray-500">{p.sold} units sold</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">{formatCurrency(p.revenue)}</p>
                            <p className="text-xs text-green-600">+{formatCurrency(p.profit)} profit</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Most Profitable */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Most Profitable Products</h3>
                  {data.topProfit.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-8">No sales in this period</p>
                  ) : (
                    <div className="space-y-3">
                      {data.topProfit.map((p, i) => (
                        <div key={p.id} className="flex items-center gap-3">
                          <span className="text-lg font-bold text-gray-300 w-6 text-center">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                            <p className="text-xs text-gray-500">{p.sold} units | {p.category}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-green-600">{formatCurrency(p.profit)}</p>
                            <p className="text-xs text-gray-500">{formatCurrency(p.revenue)} revenue</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Slow Moving */}
              {data.slowMoving.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">Slow Moving / Dead Stock</h3>
                  <p className="text-xs text-gray-500 mb-4">Products with stock but zero sales in this period</p>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="text-xs text-gray-500 border-b">
                          <th className="text-left pb-2 font-medium">Product</th>
                          <th className="text-left pb-2 font-medium">Category</th>
                          <th className="text-right pb-2 font-medium">Current Stock</th>
                          <th className="text-right pb-2 font-medium">Unsold Stock</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {data.slowMoving.map(p => (
                          <tr key={p.id} className="text-sm">
                            <td className="py-2 text-gray-900">{p.name} <span className="text-gray-400">({p.sku})</span></td>
                            <td className="py-2 text-gray-600">{p.category}</td>
                            <td className="py-2 text-right text-gray-900">{p.stock}</td>
                            <td className="py-2 text-right font-medium text-orange-600">{p.stock} units</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Inventory Tab */}
          {activeTab === 'inventory' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <p className="text-xs text-gray-500">Stock Value (Cost)</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(data.kpi.stockValue)}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <p className="text-xs text-gray-500">Retail Value</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(data.kpi.retailValue)}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <p className="text-xs text-gray-500">Potential Profit</p>
                  <p className="text-xl font-bold text-green-600 mt-1">{formatCurrency(data.kpi.retailValue - data.kpi.stockValue)}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <p className="text-xs text-gray-500">Out of Stock</p>
                  <p className="text-xl font-bold text-red-600 mt-1">{data.outOfStockCount} products</p>
                </div>
              </div>

              {/* Low Stock */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-1">Low Stock Alerts</h3>
                <p className="text-xs text-gray-500 mb-4">Products running low - need to reorder</p>
                {data.lowStock.length === 0 ? (
                  <p className="text-sm text-green-600 text-center py-8">All products are well stocked</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="text-xs text-gray-500 border-b">
                          <th className="text-left pb-2 font-medium">Product</th>
                          <th className="text-left pb-2 font-medium">Category</th>
                          <th className="text-right pb-2 font-medium">Current</th>
                          <th className="text-right pb-2 font-medium">Min Required</th>
                          <th className="text-right pb-2 font-medium">Need to Order</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {data.lowStock.map(p => (
                          <tr key={p.id} className="text-sm">
                            <td className="py-2 text-gray-900">{p.name} <span className="text-gray-400">({p.sku})</span></td>
                            <td className="py-2 text-gray-600">{p.category}</td>
                            <td className="py-2 text-right font-medium text-red-600">{p.quantity}</td>
                            <td className="py-2 text-right text-gray-900">{p.minStock}</td>
                            <td className="py-2 text-right font-bold text-orange-600">{p.minStock - p.quantity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Expiring Soon */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-1">Expiring Soon</h3>
                <p className="text-xs text-gray-500 mb-4">Batches expiring within 90 days - risk of waste</p>
                {data.expiringSoon.length === 0 ? (
                  <p className="text-sm text-green-600 text-center py-8">No products expiring soon</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="text-xs text-gray-500 border-b">
                          <th className="text-left pb-2 font-medium">Product</th>
                          <th className="text-left pb-2 font-medium">Batch</th>
                          <th className="text-left pb-2 font-medium">Expiry Date</th>
                          <th className="text-right pb-2 font-medium">Qty at Risk</th>
                          <th className="text-left pb-2 font-medium">Days Left</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {data.expiringSoon.map(item => {
                          const expiryTime = new Date(item.expiryDate).getTime()
                          const nowTime = new Date().getTime()
                          const daysLeft = Math.ceil((expiryTime - nowTime) / (1000 * 60 * 60 * 24))
                          return (
                            <tr key={item.id} className="text-sm">
                              <td className="py-2 text-gray-900">{item.productName}</td>
                              <td className="py-2 font-mono text-gray-600">{item.batchNumber}</td>
                              <td className="py-2 text-gray-900">{formatDate(item.expiryDate)}</td>
                              <td className="py-2 text-right font-medium text-orange-600">{item.quantity}</td>
                              <td className="py-2">
                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${daysLeft <= 7 ? 'bg-red-100 text-red-800' : daysLeft <= 30 ? 'bg-orange-100 text-orange-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                  {daysLeft} days
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tax Tab */}
          {activeTab === 'tax' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <p className="text-xs text-gray-500">Total Taxable</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(Object.values(data.gstSummary).reduce((s, r) => s + r.taxable, 0))}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <p className="text-xs text-gray-500">Total GST Collected</p>
                  <p className="text-xl font-bold text-indigo-600 mt-1">{formatCurrency(Object.values(data.gstSummary).reduce((s, r) => s + r.tax, 0))}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <p className="text-xs text-gray-500">Total Discounts</p>
                  <p className="text-xl font-bold text-orange-600 mt-1">{formatCurrency(data.kpi.totalDiscount)}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <p className="text-xs text-gray-500">Net Revenue</p>
                  <p className="text-xl font-bold text-green-600 mt-1">{formatCurrency(data.kpi.totalRevenue - data.kpi.totalTax)}</p>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">GST Breakdown by Rate</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="text-xs text-gray-500 border-b">
                        <th className="text-left pb-2 font-medium">GST Rate</th>
                        <th className="text-right pb-2 font-medium">Taxable Amount</th>
                        <th className="text-right pb-2 font-medium">Tax Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {Object.entries(data.gstSummary).map(([rate, info]) => (
                        <tr key={rate} className="text-sm">
                          <td className="py-2 font-medium text-gray-900">{rate}%</td>
                          <td className="py-2 text-right text-gray-900">{formatCurrency(info.taxable)}</td>
                          <td className="py-2 text-right font-medium text-indigo-600">{formatCurrency(info.tax)}</td>
                        </tr>
                      ))}
                      <tr className="text-sm font-bold border-t-2">
                        <td className="py-2 text-gray-900">Total</td>
                        <td className="py-2 text-right text-gray-900">{formatCurrency(Object.values(data.gstSummary).reduce((s, r) => s + r.taxable, 0))}</td>
                        <td className="py-2 text-right text-indigo-600">{formatCurrency(Object.values(data.gstSummary).reduce((s, r) => s + r.tax, 0))}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function KpiCard({ label, value, icon, positive }: { label: string; value: string; icon: string; positive?: boolean }) {
  const iconMap: Record<string, { bg: string; icon: string }> = {
    revenue: { bg: 'bg-green-100', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    profit: { bg: 'bg-emerald-100', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
    margin: { bg: 'bg-blue-100', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    orders: { bg: 'bg-purple-100', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
    avg: { bg: 'bg-amber-100', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' },
    tax: { bg: 'bg-indigo-100', icon: 'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z' },
  }
  const config = iconMap[icon] || iconMap.revenue

  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 ${config.bg} rounded-lg flex items-center justify-center shrink-0`}>
          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={config.icon} />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="text-xs text-gray-500 truncate">{label}</p>
          <p className={`text-lg font-bold truncate ${positive === false ? 'text-red-600' : positive === true ? 'text-green-600' : 'text-gray-900'}`}>{value}</p>
        </div>
      </div>
    </div>
  )
}
