'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge, SectionHeader, EmptyState, Spinner, TableShell, Th, SearchInput, type BadgeVariant } from './admin-primitives'
import { logActivity } from '@/lib/activity-log'
import type { Profile, UserRole } from '@/lib/supabase/types'

export function ProfilesTab({ currentRole }: { currentRole: UserRole }) {
  const supabase = createClient()
  const [rows, setRows] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [changingRole, setChangingRole] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('profiles').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { setRows(data ?? []); setLoading(false) })
  }, [supabase])

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setChangingRole(userId)
    const { data: { user } } = await supabase.auth.getUser()
    const actorName = user ? (await supabase.from('profiles').select('name').eq('id', user.id).single()).data?.name ?? 'Staff' : 'Staff'
    const target = rows.find(p => p.id === userId)
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
    if (!error) {
      setRows(r => r.map(p => p.id === userId ? { ...p, role: newRole } : p))
      await logActivity({ category: 'log', event_type: 'role_changed', entity_table: 'profiles', entity_id: userId, actor_id: user?.id, actor_name: actorName, message: `${actorName} changed ${target?.name ?? 'a user'}'s role to ${newRole}`, metadata: { target_name: target?.name, old_role: target?.role, new_role: newRole } })
    }
    setChangingRole(null)
  }

  const q = search.toLowerCase()
  const filtered = rows.filter(p => !q || [p.name, p.email, p.role].some(v => v?.toLowerCase().includes(q)))
  const roleBadgeVariant = (role: UserRole): BadgeVariant => role === 'admin' ? 'amber' : role === 'staff' ? 'blue' : 'muted'

  if (loading) return <Spinner />

  return (
    <div>
      <SectionHeader title="User Profiles" sub={`${rows.length} registered accounts`} />

      <div className="mb-5 max-w-xs">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name or email…" />
      </div>

      {filtered.length === 0 ? <EmptyState message="No profiles match your search." /> : (
        <>
          {/* Mobile */}
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
                <div className="flex items-center justify-between pt-2 border-t border-border/40">
                  <p className="text-[10px] text-muted-foreground">Joined {new Date(u.created_at).toLocaleDateString()}</p>
                  {currentRole === 'admin' && (
                    <div className="flex items-center gap-1.5">
                      <select value={u.role} disabled={changingRole === u.id}
                        onChange={e => handleRoleChange(u.id, e.target.value as UserRole)}
                        className="h-7 pl-2.5 pr-6 rounded-lg bg-background border border-border text-[11px] font-semibold outline-none appearance-none cursor-pointer disabled:opacity-50">
                        <option value="client">client</option>
                        <option value="staff">staff</option>
                        <option value="admin">admin</option>
                      </select>
                      {changingRole === u.id && <div className="h-3.5 w-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin" />}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop */}
          <TableShell>
            <thead><tr>
              <Th>User</Th><Th>Email</Th><Th>Role</Th><Th>Joined</Th>
              {currentRole === 'admin' && <Th>Change Role</Th>}
            </tr></thead>
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
                  <td className="px-5 py-3.5"><Badge label={u.role} variant={roleBadgeVariant(u.role)} /></td>
                  <td className="px-5 py-3.5 text-[11px] text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                  {currentRole === 'admin' && (
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <select value={u.role} disabled={changingRole === u.id}
                          onChange={e => handleRoleChange(u.id, e.target.value as UserRole)}
                          className="h-8 pl-3 pr-7 rounded-xl bg-background border border-border text-xs font-semibold outline-none appearance-none cursor-pointer disabled:opacity-50 hover:border-primary/40 transition-colors">
                          <option value="client">client</option>
                          <option value="staff">staff</option>
                          <option value="admin">admin</option>
                        </select>
                        {changingRole === u.id && <div className="h-3.5 w-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin" />}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </TableShell>
        </>
      )}
    </div>
  )
}
