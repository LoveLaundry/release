import { useMemo, useState } from 'react'
import { PageHeader } from '../../../components/ui/page-header'
import { useRouteAccess } from '../../../context/RouteAccessContext'
import { ROUTES, NAV_GROUPS } from '../../../config/route-meta'

const ROLE_GROUPS: { label: string; roles: string[] }[] = [
  { label: 'Laundry roles', roles: ['ADMIN', 'MANAGER', 'STAFF'] },
  { label: 'Shop roles', roles: ['SHOP_ADMIN', 'SHOP_STAFF'] },
  { label: 'Hotel roles', roles: ['HOTEL_ADMIN', 'HOTEL_MANAGER'] },
]

export default function RouteAccessPage() {
  const { overrides, setOverride, loading } = useRouteAccess()
  const [activeGroup, setActiveGroup] = useState(0)
  const [activeRole, setActiveRole] = useState(ROLE_GROUPS[0].roles[0])
  const [saving, setSaving] = useState<string | null | 'bulk'>(null)

  const toggleableRoutes = useMemo(() => {
    return ROUTES.filter(
      (r) => r.path && r.path !== '/login' && r.path !== '/guest/shop' && !r.path.startsWith('/track/')
    ).map((r) => ({ path: r.path, title: r.title, group: (r.group || 'Other') as string }))
  }, [])

  const disabledForRole = useMemo(() => {
    return new Set(overrides?.[activeRole]?.disabled_routes || [])
  }, [overrides, activeRole])

  const grouped = useMemo(() => {
    const byGroup = new Map<string, { path: string; title: string; group: string }[]>()
    for (const r of toggleableRoutes) {
      const g = r.group || 'Other'
      if (!byGroup.has(g)) byGroup.set(g, [])
      byGroup.get(g)!.push(r)
    }
    // order by NAV_GROUPS then extras
    const ordered: { group: string; items: typeof toggleableRoutes }[] = []
    for (const ng of NAV_GROUPS) {
      if (byGroup.has(ng.id)) ordered.push({ group: ng.label, items: byGroup.get(ng.id)! })
    }
    for (const [g, items] of byGroup) {
      if (!NAV_GROUPS.find((ng) => ng.label === g || ng.id === g)) ordered.push({ group: g, items })
    }
    return ordered
  }, [toggleableRoutes])

  const setDisabledList = async (nextDisabled: string[]) => {
    setSaving('bulk')
    try {
      await setOverride(activeRole, nextDisabled)
    } catch (e) {
      alert('Failed to save. Check permissions / network.')
    } finally {
      setSaving(null)
    }
  }

  const toggleRoute = async (routePath: string) => {
    const current = new Set(overrides?.[activeRole]?.disabled_routes || [])
    if (current.has(routePath)) current.delete(routePath)
    else current.add(routePath)
    setSaving(routePath)
    try {
      await setOverride(activeRole, Array.from(current))
    } catch {
      alert('Failed to save. Check permissions / network.')
    } finally {
      setSaving(null)
    }
  }

  const disableAllInGroup = async (paths: string[]) => {
    const current = new Set(overrides?.[activeRole]?.disabled_routes || [])
    for (const p of paths) current.add(p)
    await setDisabledList(Array.from(current))
  }

  const enableAllInGroup = async (paths: string[]) => {
    const current = new Set(overrides?.[activeRole]?.disabled_routes || [])
    for (const p of paths) current.delete(p)
    await setDisabledList(Array.from(current))
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title="Route Access"
        subtitle="Turn routes/pages on or off per role. Changes apply after refresh or next navigation."
      />

      <div className="flex flex-wrap gap-2">
        {ROLE_GROUPS.map((g, i) => (
          <button
            key={g.label}
            type="button"
            onClick={() => {
              setActiveGroup(i)
              setActiveRole(g.roles[0])
            }}
            className={`px-3 py-1.5 rounded text-sm border ${i === activeGroup ? 'bg-[var(--accent)] text-white border-[var(--accent)]' : 'border-[var(--border)]'}`}
          >
            {g.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-sm text-[var(--text-muted)]">Role:</span>
        {ROLE_GROUPS[activeGroup].roles.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setActiveRole(r)}
            className={`px-3 py-1.5 rounded text-sm border ${r === activeRole ? 'bg-[var(--surface-2)] font-semibold border-[var(--border-2)]' : 'border-[var(--border)]'}`}
          >
            {r}
          </button>
        ))}
      </div>

      {loading && <div className="text-sm text-[var(--text-muted)]">Loading overrides…</div>}

      <div className="space-y-6">
        {grouped.map((g) => (
          <div key={g.group} className="rounded-lg border border-[var(--border)] overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-[var(--surface-2)] px-3 py-2">
              <h3 className="text-sm font-semibold">{g.group}</h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={saving !== null}
                  onClick={() => enableAllInGroup(g.items.map((i) => i.path))}
                  className="text-xs px-2 py-1 rounded border border-[var(--border)] hover:bg-[var(--surface)] disabled:opacity-50"
                >
                  Enable all
                </button>
                <button
                  type="button"
                  disabled={saving !== null}
                  onClick={() => disableAllInGroup(g.items.map((i) => i.path))}
                  className="text-xs px-2 py-1 rounded border border-[var(--border)] hover:bg-[var(--surface)] disabled:opacity-50"
                >
                  Disable all
                </button>
              </div>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-t border-[var(--border)]">
                  <th className="text-left p-3 w-1/3">Route</th>
                  <th className="text-left p-3 w-1/2">Title</th>
                  <th className="text-left p-3 w-1/6">Enabled for {activeRole}</th>
                </tr>
              </thead>
              <tbody>
                {g.items.map((r) => {
                  const disabled = disabledForRole.has(r.path)
                  return (
                    <tr key={r.path} className="border-t border-[var(--border)]">
                      <td className="p-3 font-mono text-xs">{r.path}</td>
                      <td className="p-3">{r.title}</td>
                      <td className="p-3">
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!disabled}
                            disabled={saving !== null}
                            onChange={() => toggleRoute(r.path)}
                          />
                          <span>{disabled ? 'Disabled' : 'Enabled'}</span>
                        </label>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  )
}
