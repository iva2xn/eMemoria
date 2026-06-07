'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge, SectionHeader, EmptyState, Spinner, type BadgeVariant } from './admin-primitives'
import { Search } from 'lucide-react'
import { logActivity } from '@/lib/activity-log'
import type { Profile, UserRole } from '@/lib/supabase/types'

export function ProfilesTab({ currentRole }: { currentRole: UserRole }) {
  const supabase = createClient()
  const [rows, setRows]           = useState<Profile[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
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
      await logActivity({
        category:     'log',
        event_type:   'role_changed',
        entity_table: 'profiles',
        entity_id:    userId,
        actor_id:     user?.id,
        actor_name:   actorName,
        message:      `${actorName} changed ${target?.name ?? 'a user'}'s role to ${newRole}`,
        metadata:     { target_name: target?.name, old_role: target?.role, new_role: newRole },
      })
    }
    setChangingRole(null)
  }

  const q = search.toLowerCase()
  const filtered = rows.filter(p => !q || [p.name, p.email, p.role].some(v => v?.toLowerCase().includes(q)))

  const roleBadgeVariant = (role: UserRole): BadgeVariant =>
    role === 'admin' ? 'blue' : role === 'staff' ? 'amber' : 'muted'

  if (loading) return <Spinner />

  return (
    <div>
      <SectionHeader title="User Profiles" sub={`${rows.length} registered accounts`} />
      <div className="relative max-w-xs mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          placeholder="Search by name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full h-10 pl-9 pr-4 rounded-xl bg-background border border-border/80 text-sm focus:border-primary/60 focus:ring-1 focus:ring-primary/10 outline-none transition-all"
        />
      </div>
      {filtered.length === 0 ? <EmptyState message="No profiles match your search." /> : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map(u => (
              <div key={u.id} className="bg-card border border-border rounded-2xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground text-sm truncate">{u.name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono truncate">{u.email}</p>
                  </div>
                  <Badge label={u.role} variant={roleBadgeVariant(u.role)} />
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-border/40">
                  <p className="text-[10px] text-muted-foreground font-mono">
                    Joined {new Date(u.created_at).toLocaleDateString()}
                  </p>
                  {currentRole === 'admin' && (
                    <div className="flex items-center gap-1.5">
                      <select
                        value={u.role}
                        disabled={changingRole === u.id}
                        onChange={e => handleRoleChange(u.id, e.target.value as UserRole)}
                        className="h-7 pl-2.5 pr-7 rounded-lg bg-background border border-border/80 text-[11px] font-semibold text-foreground focus:border-primary/60 outline-none transition-all appearance-none cursor-pointer disabled:opacity-50"
                        aria-label={`Change role for ${u.name}`}
                      >
                        <option value="client">client</option>
                        <option value="staff">staff</option>
                        <option value="admin">admin</option>
                      </select>
                      {changingRole === u.id && (
                        <div className="h-3.5 w-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto border border-border rounded-2xl bg-card">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-muted/30 border-b border-border text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Joined</th>
                  {currentRole === 'admin' && <th className="px-5 py-3">Change Role</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(u => (
                  <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3.5 font-semibold text-foreground">{u.name}</td>
                    <td className="px-5 py-3.5 text-muted-foreground font-mono">{u.email}</td>
                    <td className="px-5 py-3.5">
                      <Badge label={u.role} variant={roleBadgeVariant(u.role)} />
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground font-mono text-[10px]">{new Date(u.created_at).toLocaleDateString()}</td>
                    {currentRole === 'admin' && (
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <select
                            value={u.role}
                            disabled={changingRole === u.id}
                            onChange={e => handleRoleChange(u.id, e.target.value as UserRole)}
                            className="h-7 pl-2.5 pr-7 rounded-lg bg-background border border-border/80 text-[11px] font-semibold text-foreground focus:border-primary/60 focus:ring-1 focus:ring-primary/10 outline-none transition-all appearance-none cursor-pointer disabled:opacity-50"
                            aria-label={`Change role for ${u.name}`}
                          >
                            <option value="client">client</option>
                            <option value="staff">staff</option>
                            <option value="admin">admin</option>
                          </select>
                          {changingRole === u.id && (
                            <div className="h-3.5 w-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
