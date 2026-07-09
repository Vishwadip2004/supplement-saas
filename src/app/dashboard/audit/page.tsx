'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'

interface AuditLogEntry {
  id: string
  action: string
  resource: string
  resourceId: string | null
  details: string | null
  ipAddress: string | null
  status: string
  timestamp: string
  user: { name: string; email: string } | null
}

const statusColors: Record<string, string> = {
  SUCCESS: 'bg-green-100 text-green-800',
  FAILURE: 'bg-red-100 text-red-800',
  WARNING: 'bg-yellow-100 text-yellow-800',
}

const resourceOptions = [
  'auth', 'product', 'sale', 'customer', 'supplier',
]

export default function AuditPage() {
  const { data: session } = useSession()
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ total: 0, pages: 1 })
  const [resourceFilter, setResourceFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const loadLogs = useCallback(async (pageNum: number) => {
    try {
      setLoading(true)
      setError('')
      const params = new URLSearchParams({ page: String(pageNum), limit: '50' })
      if (resourceFilter) params.set('resource', resourceFilter)
      if (statusFilter) params.set('status', statusFilter)
      const res = await fetch(`/api/audit?${params}`)
      if (!res.ok) throw new Error('Failed to fetch audit logs')
      const data = await res.json()
      setLogs(data.data)
      setPagination(data.pagination)
      setPage(pageNum)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch audit logs')
    } finally {
      setLoading(false)
    }
  }, [resourceFilter, statusFilter])

  useEffect(() => {
    let cancelled = false
    async function init() {
      try {
        setLoading(true)
        const params = new URLSearchParams({ page: '1', limit: '50' })
        if (resourceFilter) params.set('resource', resourceFilter)
        if (statusFilter) params.set('status', statusFilter)
        const res = await fetch(`/api/audit?${params}`)
        if (!res.ok) throw new Error('Failed to fetch audit logs')
        const data = await res.json()
        if (!cancelled) {
          setLogs(data.data)
          setPagination(data.pagination)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to fetch audit logs')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    init()
    return () => { cancelled = true }
  }, [resourceFilter, statusFilter])

  const formatDate = (d: string) => new Date(d).toLocaleString()

  if (!['ADMIN', 'MANAGER'].includes(session?.user?.role || '')) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">Access Denied</h2>
        <p className="mt-2 text-gray-600">You need Admin or Manager role to view audit logs.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
        <span className="text-sm text-gray-500">{pagination.total} total entries</span>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <div className="flex gap-4 mb-6">
        <select
          value={resourceFilter}
          onChange={(e) => { setResourceFilter(e.target.value); setPage(1) }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="">All Resources</option>
          {resourceOptions.map((r) => (
            <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="">All Statuses</option>
          <option value="SUCCESS">Success</option>
          <option value="FAILURE">Failure</option>
          <option value="WARNING">Warning</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No audit logs found</div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Resource</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {logs.map((log) => (
                <>
                  <tr
                    key={log.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                  >
                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                      {formatDate(log.timestamp)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {log.user?.name || log.user?.email || 'System'}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {log.action}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {log.resource}
                      {log.resourceId && (
                        <span className="ml-1 text-gray-400">({log.resourceId.slice(0, 8)}...)</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[log.status] || 'bg-gray-100 text-gray-800'}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{log.ipAddress || '-'}</td>
                  </tr>
                  {expandedId === log.id && log.details && (
                    <tr key={`${log.id}-details`}>
                      <td colSpan={6} className="px-6 py-4 bg-gray-50">
                        <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                          {(() => {
                            try {
                              return JSON.stringify(JSON.parse(log.details), null, 2)
                            } catch {
                              return log.details
                            }
                          })()}
                        </pre>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>

          {pagination.pages > 1 && (
            <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200">
              <button
                onClick={() => loadLogs(page - 1)}
                disabled={page <= 1}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {page} of {pagination.pages}
              </span>
              <button
                onClick={() => loadLogs(page + 1)}
                disabled={page >= pagination.pages}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
