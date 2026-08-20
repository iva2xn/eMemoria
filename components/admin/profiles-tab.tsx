'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge, SectionHeader, EmptyState, Spinner, TableShell, Th, SearchInput, type BadgeVariant } from './admin-primitives'
import { AlertBanner } from '@/components/ui/alert-banner'
import { logActivity } from '@/lib/activity-log'
import { Trash2, X, UserCog } from 'lucide-react'
import type { Profile, UserRole } from '@/lib/supabase/types'

// ── Role Change Confirm Modal ─────────────────────────────────
function RoleChangeModal({
  target,
  newRole,
  onClose,
  onConfirm,
}: {
  target: Profile
  newRole: UserRole
  onClose: () => void
  onConfirm: () => Promise<void>
}) {
  const [step, setStep] = useState<1 | 2>(1)
  const [loading, setLoading] = useState(false)

  const roleVariant = (r: UserRole): BadgeVariant =>
    r === 'admin' ? 'amber' : r === 'staff' ? 'blue' : 'muted'

  const handleConfirm = async () => {
    setLoading(true)
    await onConfirm()
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm pointer-events-none" />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl pointer-events-auto">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <UserCog className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">Change Role</h2>
            </div>
            <button onClick={onClose} className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="px-6 py-5 space-y-4">
            {step === 1 ? (
              <>
                <p className="text-sm text-muted-foreground">
                  You are about to change the role of <span className="font-semibold text-foreground">{target.name}</span>.
                </p>
                <div className="bg-muted/40 border border-border rounded-xl px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Current Role</p>
                    <Badge label={target.role} variant={roleVariant(target.role)} />
                  </div>
                  <span className="text-lg text-muted-foreground">→</span>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">New Role</p>
                    <Badge label={newRole} variant={roleVariant(newRole)} />
                  </div>
                </div>
                <div className="flex gap-3 pt-1">
                  <Button type="button" variant="ghost" onClick={onClose} className="flex-1 h-10 rounded-xl">Cancel</Button>
                  <Button type="button" onClick={() => setStep(2)} className="flex-1 h-10 rounded-xl">Next →</Button>
                </div>
              </>
            ) : (
              <>
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3 space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Confirm Role Change</p>
                  <p className="text-sm text-foreground">
                    Set <span className="font-semibold">{target.name}</span> to{' '}
                    <span className="font-semibold">{newRole}</span>?
                  </p>
                  {newRole === 'admin' && (
                    <p className="text-[11px] text-amber-600">This grants full admin access including payment approvals and role management.</p>
                  )}
                </div>
                <div className="flex gap-3 pt-1">
                  <Button type="button" variant="ghost" onClick={() => setStep(1)} className="flex-1 h-10 rounded-xl">← Back</Button>
                  <Button type="button" onClick={handleConfirm} disabled={loading} className="flex-1 h-10 rounded-xl">
                    {loading ? 'Saving…' : 'Confirm Change'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Delete Account Confirm Modal ──────────────────────────────
function DeleteAccountModal({
  target,
  onClose,
  onConfirm,
}: {
  target: Profile
  onClose: () => void
  onConfirm: () => Promise<void>
}) {
  const [step, setStep] = useState<1 | 2>(1)
  const [loading, setLoading] = useState(false)
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')

  const handleNext = () => {
    if (confirm.trim() !== 'DELETE') {
      setError('Type "DELETE" (all caps) to continue.')
      return
    }
    setError('')
    setStep(2)
  }

  const handleConfirm = async () => {
    setLoading(true)
    await onConfirm()
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm pointer-events-none" />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl pointer-events-auto">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-red-500" />
              <h2 className="text-sm font-bold text-foreground">Delete Account</h2>
            </div>
            <button onClick={onClose} className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="px-6 py-5 space-y-4">
            {step === 1 ? (
              <>
                <div className="bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-3 space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-red-600">Warning — Irreversible Action</p>
                  <p className="text-sm text-muted-foreground">
                    Deleting <span className="font-semibold text-foreground">{target.name}</span>'s account will permanently remove their profile and all associated data.
                  </p>
                </div>
                {error && <AlertBanner variant="error" message={error} />}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Type <span className="text-red-500 font-mono">DELETE</span> to continue
                  </label>
                  <input
                    type="text"
                    value={confirm}
                    onChange={e => { setConfirm(e.target.value); setError('') }}
                    placeholder='DELETE'
                    className="w-full h-10 px-3 rounded-xl bg-background border border-border/80 text-sm focus:border-red-500/60 focus:ring-1 focus:ring-red-500/10 outline-none transition-all"
                  />
                </div>
                <div className="flex gap-3 pt-1">
                  <Button type="button" variant="ghost" onClick={onClose} className="flex-1 h-10 rounded-xl">Cancel</Button>
                  <Button
                    type="button"
                    onClick={handleNext}
                    className="flex-1 h-10 rounded-xl bg-red-500 hover:bg-red-600 text-white border-0"
                  >
                    Next →
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-3 space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-red-600">Final Confirmation</p>
                  <p className="text-sm text-foreground">
                    Permanently delete <span className="font-semibold">{target.name}</span>{' '}
                    <span className="text-muted-foreground">({target.email})</span>?
                  </p>
                  <p className="text-[11px] text-red-600 font-medium">This cannot be undone.</p>
                </div>
                <div className="flex gap-3 pt-1">
                  <Button type="button" variant="ghost" onClick={() => setStep(1)} className="flex-1 h-10 rounded-xl">← Back</Button>
                  <Button
                    type="button"
                    onClick={handleConfirm}
                    disabled={loading}
                    className="flex-1 h-10 rounded-xl bg-red-500 hover:bg-red-600 text-white border-0"
                  >
                    {loading ? 'Deleting…' : 'Delete Account'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Profiles Tab ──────────────────────────────────────────────
export function ProfilesTab({ currentRole }: { currentRole: UserRole }) {
  const supabase = createClient()
  const [rows, setRows]     = useState<Profile[]>([])
  const [myId, setMyId]     = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Role change modal
  const [roleChangeTarget, setRoleChangeTarget] = useState<Profile | null>(null)
  const [pendingRole, setPendingRole]           = useState<UserRole | null>(null)

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null)

  const [generalError, setGeneralError] = useState('')

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setMyId(user.id)
      const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
      setRows(data ?? [])
      setLoading(false)
    }
    init()
  }, [supabase])

  // ── Role change ───────────────────────────────────────────
  const openRoleChange = (profile: Profile, newRole: UserRole) => {
    if (newRole === profile.role) return
    setRoleChangeTarget(profile)
    setPendingRole(newRole)
  }

  const confirmRoleChange = async () => {
    if (!roleChangeTarget || !pendingRole) return
    setGeneralError('')
    const { data: { user } } = await supabase.auth.getUser()
    const actorName = user
      ? (await supabase.from('profiles').select('name').eq('id', user.id).single()).data?.name ?? 'Staff'
      : 'Staff'

    const { error } = await supabase.from('profiles').update({ role: pendingRole }).eq('id', roleChangeTarget.id)
    if (error) {
      setGeneralError(`Failed to update role: ${error.message}`)
    } else {
      setRows(r => r.map(p => p.id === roleChangeTarget.id ? { ...p, role: pendingRole } : p))
      await logActivity({
        category: 'log',
        event_type: 'role_changed',
        entity_table: 'profiles',
        entity_id: roleChangeTarget.id,
        actor_id: user?.id,
        actor_name: actorName,
        message: `${actorName} changed ${roleChangeTarget.name}'s role to ${pendingRole}`,
        metadata: {
          target_name: roleChangeTarget.name,
          old_role: roleChangeTarget.role,
          new_role: pendingRole,
        },
      })
    }
    setRoleChangeTarget(null)
    setPendingRole(null)
  }

  // ── Delete account ────────────────────────────────────────
  const confirmDeleteAccount = async () => {
    if (!deleteTarget) return
    setGeneralError('')
    const { data: { user } } = await supabase.auth.getUser()
    const actorName = user
      ? (await supabase.from('profiles').select('name').eq('id', user.id).single()).data?.name ?? 'Staff'
      : 'Staff'

    // Deleting from auth.users cascades to profiles via FK
    const { error } = await supabase.rpc('admin_delete_user', { target_user_id: deleteTarget.id })

    if (error) {
      // Fallback: delete the profile row directly (profile FK cascade will handle related rows)
      const { error: profileErr } = await supabase.from('profiles').delete().eq('id', deleteTarget.id)
      if (profileErr) {
        setGeneralError(`Failed to delete account: ${profileErr.message}`)
        setDeleteTarget(null)
        return
      }
    }

    await logActivity({
      category: 'log',
      event_type: 'account_deleted',
      entity_table: 'profiles',
      entity_id: deleteTarget.id,
      actor_id: user?.id,
      actor_name: actorName,
      message: `${actorName} deleted account for ${deleteTarget.name} (${deleteTarget.email})`,
      metadata: { target_name: deleteTarget.name, target_email: deleteTarget.email },
    })

    setRows(r => r.filter(p => p.id !== deleteTarget.id))
    setDeleteTarget(null)
  }

  // ── Render ────────────────────────────────────────────────
  const q        = search.toLowerCase()
  const filtered = rows.filter(p => !q || [p.name, p.email, p.role].some(v => v?.toLowerCase().includes(q)))

  const roleBadgeVariant = (role: UserRole): BadgeVariant =>
    role === 'admin' ? 'amber' : role === 'staff' ? 'blue' : 'muted'

  if (loading) return <Spinner />

  return (
    <div>
      <SectionHeader title="User Profiles" sub={`${rows.length} registered accounts`} />

      {generalError && (
        <div className="mb-4">
          <AlertBanner variant="error" message={generalError} />
        </div>
      )}

      <div className="mb-5 max-w-xs">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name or email…" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="No profiles match your search." />
      ) : (
        <>
          {/* ── Mobile cards ── */}
          <div className="md:hidden space-y-3">
            {filtered.map(u => (
              <div key={u.id} className="bg-card border border-border rounded-2xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-primary">{u.name?.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground text-sm truncate">{u.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
                    </div>
                  </div>
                  <Badge label={u.role} variant={roleBadgeVariant(u.role)} />
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border/40 gap-2 flex-wrap">
                  <p className="text-[10px] text-muted-foreground">Joined {new Date(u.created_at).toLocaleDateString()}</p>
                  <div className="flex items-center gap-2">
                    {currentRole === 'admin' && (
                      <select
                        value={u.role}
                        onChange={e => openRoleChange(u, e.target.value as UserRole)}
                        className="h-7 pl-2.5 pr-6 rounded-lg bg-background border border-border text-[11px] font-semibold outline-none appearance-none cursor-pointer hover:border-primary/40 transition-colors"
                      >
                        <option value="client">client</option>
                        <option value="staff">staff</option>
                        <option value="admin">admin</option>
                      </select>
                    )}
                    {currentRole === 'admin' && u.id !== myId && (
                      <button
                        onClick={() => setDeleteTarget(u)}
                        className="h-7 w-7 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 flex items-center justify-center hover:bg-red-500/20 transition-colors"
                        title="Delete account"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Desktop table ── */}
          <TableShell>
            <thead>
              <tr>
                <Th>User</Th>
                <Th>Email</Th>
                <Th>Role</Th>
                <Th>Joined</Th>
                {currentRole === 'admin' && <Th>Change Role</Th>}
                {currentRole === 'admin' && <Th>Actions</Th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 hidden md:table-row-group">
              {filtered.map(u => (
                <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-primary">{u.name?.charAt(0).toUpperCase()}</span>
                      </div>
                      <span className="font-semibold text-foreground text-sm">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-muted-foreground">{u.email}</td>
                  <td className="px-5 py-3.5">
                    <Badge label={u.role} variant={roleBadgeVariant(u.role)} />
                  </td>
                  <td className="px-5 py-3.5 text-[11px] text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  {currentRole === 'admin' && (
                    <td className="px-5 py-3.5">
                      <select
                        value={u.role}
                        onChange={e => openRoleChange(u, e.target.value as UserRole)}
                        className="h-8 pl-3 pr-7 rounded-xl bg-background border border-border text-xs font-semibold outline-none appearance-none cursor-pointer hover:border-primary/40 transition-colors"
                      >
                        <option value="client">client</option>
                        <option value="staff">staff</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                  )}
                  {currentRole === 'admin' && (
                    <td className="px-5 py-3.5">
                      {u.id !== myId ? (
                        <button
                          onClick={() => setDeleteTarget(u)}
                          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-[11px] font-bold hover:bg-red-500/20 transition-colors"
                        >
                          <Trash2 className="h-3 w-3" /> Delete
                        </button>
                      ) : (
                        <span className="text-[11px] text-muted-foreground italic">You</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </TableShell>
        </>
      )}

      {/* Role change modal */}
      {roleChangeTarget && pendingRole && (
        <RoleChangeModal
          target={roleChangeTarget}
          newRole={pendingRole}
          onClose={() => { setRoleChangeTarget(null); setPendingRole(null) }}
          onConfirm={confirmRoleChange}
        />
      )}

      {/* Delete account modal */}
      {deleteTarget && (
        <DeleteAccountModal
          target={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={confirmDeleteAccount}
        />
      )}
    </div>
  )
}
