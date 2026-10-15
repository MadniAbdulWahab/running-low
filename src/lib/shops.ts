import type { Item } from '../types'
import { parseISO, toISO } from './time'

/** How far back "Past shops" goes. */
export const SHOP_DAYS = 28

export interface ShopEntry {
  key: string
  name: string
  qty: number | null
}

/** One day's log, as stored at `shops/{YYYY-MM-DD}`. */
export interface ShopLog {
  day: string
  items: Record<string, { name: string; qty: number | null }>
}

/** A past shop: the groceries ticked off on one day. */
export interface PastShop {
  day: string
  items: ShopEntry[]
}

/** The first day "Past shops" covers. */
export function shopsStart(now = Date.now()): string {
  const t = new Date(now)
  return toISO(new Date(t.getFullYear(), t.getMonth(), t.getDate() - (SHOP_DAYS - 1)))
}

/**
 * Groups groceries into shops by the day they were ticked off, newest first. The log only
 * starts with the version that writes it, so groceries still marked as bought fill in
 * (and cover ticks from a phone running an older version).
 */
export function pastShops(logs: ShopLog[], items: Item[], now = Date.now()): PastShop[] {
  const since = shopsStart(now)
  const days = new Map<string, Map<string, ShopEntry>>()
  const put = (day: string, e: ShopEntry) => {
    if (day < since) return
    let m = days.get(day)
    if (!m) days.set(day, (m = new Map()))
    if (!m.has(e.key)) m.set(e.key, e)
  }
  for (const l of logs) for (const [key, v] of Object.entries(l.items)) put(l.day, { key, name: v.name, qty: v.qty })
  for (const i of items)
    if (i.list === 'grocery' && i.status === 'done' && i.doneAt)
      put(toISO(new Date(i.doneAt)), { key: i.key, name: i.name, qty: i.qty })
  return [...days]
    .filter(([, m]) => m.size > 0)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([day, m]) => ({ day, items: [...m.values()].sort((a, b) => a.name.localeCompare(b.name)) }))
}

/** "Today", "Yesterday", "Thursday" within the week, then "Sat 12 Oct". */
export function shopDayLabel(day: string, now = Date.now()): string {
  const t = new Date(now)
  const today = toISO(t)
  if (day === today) return 'Today'
  if (day === toISO(new Date(t.getFullYear(), t.getMonth(), t.getDate() - 1))) return 'Yesterday'
  const d = parseISO(day)
  if (day > toISO(new Date(t.getFullYear(), t.getMonth(), t.getDate() - 7)))
    return d.toLocaleDateString(undefined, { weekday: 'long' })
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
}
