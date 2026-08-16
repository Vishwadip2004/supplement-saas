'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { csrfFetch } from '@/lib/csrf-client'
import Pagination from '@/components/Pagination'

interface StaffMember {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'MANAGER' | 'STAFF'
  isActive: boolean
  mfaEnabled: boolean
  lastLogin: string | null
  createdAt: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
}

const roleColors: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-800',
  MANAGER: 'bg-purple-100 text-purple-800',
  STAFF: 'bg-green-100 text-green-800',
}

const roleLabels: Record<string, string> = {
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  STAFF: 'Staff',
}

export default function StaffPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const isAdmin = session?.user?.role === 'ADMIN'

  const [staff, setStaff] = useState<StaffMember[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 0 })
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null)
  const [generatedPassword, setGeneratedPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [addForm, setAddForm] = useState({ name: '', email: '', role: 'STAFF' })
  const [editForm, setEditForm] = useState({ name: '', email: '', role: 'STAFF', isActive: true, newPassword: '' })

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/login')
  }, [status, router])

  const loadStaff = useCallback(async (page = 1) => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (search) params.set('search', search)
      if (roleFilter) params.set('role', roleFilter)
      const res = await fetch(`/api/staff?${params}`)
      if (!res.ok) throw new Error('Failed to load staff')
      const data = await res.json()
      setStaff(data.data)
      setPagination(data.pagination)
    } catch {
      setError('Failed to load staff')
    } finally {
      setLoading(false)
    }
  }, [search, roleFilter])

  useEffect(() => {
    if (status !== 'authenticated' || !isAdmin) return

    let cancelled = false
    async function init() {
      setLoading(true)
      setError('')
      try {
        const params = new URLSearchParams({ page: '1', limit: '20' })
        if (search) params.set('search', search)
        if (roleFilter) params.set('role', roleFilter)
        const res = await fetch(`/api/staff?${params}`)
        if (!res.ok) throw new Error('Failed to load staff')
        const data = await res.json()
        if (!cancelled) {
          setStaff(data.data)
          setPagination(data.pagination)
        }
      } catch {
        if (!cancelled) setError('Failed to load staff')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    init()
    return () => { cancelled = true }
  }, [status, isAdmin, search, roleFilter])

  useEffect(() => {
    if (!success) return
    const timer = setTimeout(() => setSuccess(''), 5000)
    return () => clearTimeout(timer)
  }, [success])

  useEffect(() => {
    if (!error) return
    const timer = setTimeout(() => setError(''), 8000)
    return () => clearTimeout(timer)
  }, [error])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    try {
      const res = await csrfFetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to add staff')
      }
      const data = await res.json()
      setGeneratedPassword(data.generatedPassword)
      setSuccess(`Staff member "${data.name}" created successfully`)
      setAddForm({ name: '', email: '', role: 'STAFF' })
      loadStaff(pagination.page)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add staff')
    }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingStaff) return
    setError('')
    setSuccess('')
    try {
      const body: Record<string, unknown> = {
        name: editForm.name,
        email: editForm.email,
        role: editForm.role,
        isActive: editForm.isActive,
      }
      if (editForm.newPassword) body.newPassword = editForm.newPassword

      const res = await csrfFetch(`/api/staff/${editingStaff.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update staff')
      }
      setSuccess('Staff member updated')
      setShowEditModal(false)
      setEditingStaff(null)
      setEditForm({ name: '', email: '', role: 'STAFF', isActive: true, newPassword: '' })
      loadStaff(pagination.page)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update staff')
    }
  }

  const handleDeactivate = async (staffMember: StaffMember) => {
    if (!window.confirm(`Deactivate "${staffMember.name}"? They will no longer be able to log in.`)) return
    setError('')
    setSuccess('')
    try {
      const res = await csrfFetch(`/api/staff/${staffMember.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to deactivate')
      }
      setSuccess(`"${staffMember.name}" deactivated`)
      loadStaff(pagination.page)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deactivate')
    }
  }

  const openEditModal = (member: StaffMember) => {
    setEditingStaff(member)
    setEditForm({
      name: member.name,
      email: member.email,
      role: member.role,
      isActive: member.isActive,
      newPassword: '',
    })
    setShowEditModal(true)
  }

  if (status === 'loading' || !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your team members and their access</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
        >
          + Add Staff
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{success}</div>
      )}
      {generatedPassword && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-800">New staff password (share securely):</p>
              <p className="text-lg font-mono font-bold text-yellow-900 mt-1">{generatedPassword}</p>
            </div>
            <button
              onClick={() => { navigator.clipboard.writeText(generatedPassword); setTimeout(() => setGeneratedPassword(''), 60000) }}
              className="px-3 py-1 text-sm bg-yellow-100 hover:bg-yellow-200 rounded-lg"
            >
              Copy & Dismiss
            </button>
          </div>
          <p className="text-xs text-yellow-600 mt-2">Password will auto-dismiss in 60 seconds. Copy it now.</p>
          <button onClick={() => setGeneratedPassword('')} className="mt-2 text-xs text-yellow-600 hover:underline">Dismiss</button>
        </div>
      )}

      <div className="flex items-center gap-4">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && loadStaff(1)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); loadStaff(1) }}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="">All Roles</option>
          <option value="ADMIN">Admin</option>
          <option value="MANAGER">Manager</option>
          <option value="STAFF">Staff</option>
        </select>
        <button onClick={() => loadStaff(1)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
          Search
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      ) : staff.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-500">No staff members found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">2FA</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Login</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {staff.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-9 h-9 bg-indigo-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-indigo-700">{member.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <span className="ml-3 font-medium text-gray-900">{member.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{member.email}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${roleColors[member.role]}`}>
                      {roleLabels[member.role]}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${member.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                      {member.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {member.mfaEnabled ? 'Enabled' : 'Disabled'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {member.lastLogin ? new Date(member.lastLogin).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => openEditModal(member)}
                      className="text-indigo-600 hover:text-indigo-800 text-sm"
                    >
                      Edit
                    </button>
                    {member.id !== session?.user?.id && member.isActive && (
                      <button
                        onClick={() => handleDeactivate(member)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Deactivate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <Pagination
            page={pagination.page}
            pages={pagination.pages}
            total={pagination.total}
            onPageChange={loadStaff}
          />
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Add Staff Member</h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-indigo-500"
                  placeholder="Full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-indigo-500"
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={addForm.role}
                  onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="STAFF">Staff</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <p className="text-xs text-gray-500">A password will be generated automatically. You can share it with the staff member.</p>
              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                  Add Staff
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && editingStaff && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Edit Staff Member</h2>
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="STAFF">Staff</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700">Active</label>
                <button
                  type="button"
                  onClick={() => setEditForm({ ...editForm, isActive: !editForm.isActive })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${editForm.isActive ? 'bg-indigo-600' : 'bg-gray-300'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${editForm.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reset Password (optional)</label>
                <input
                  type="text"
                  value={editForm.newPassword}
                  onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-indigo-500"
                  placeholder="Leave blank to keep current"
                />
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => { setShowEditModal(false); setEditingStaff(null) }} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
