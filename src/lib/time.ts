const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR
export const WEEK = 7 * DAY

export function ago(ms: number | null, now = Date.now()): string {
  if (!ms) return 'just now'
  const d = now - ms
  if (d < MIN) return 'just now'
  if (d < HOUR) return `${Math.floor(d / MIN)}m ago`
  if (d < DAY) return `${Math.floor(d / HOUR)}h ago`
  if (d < 2 * DAY) return 'yesterday'
  if (d < 7 * DAY) return `${Math.floor(d / DAY)}d ago`
  return new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Days from today until a 'YYYY-MM-DD' date (negative = overdue). */
export function daysUntil(iso: string): number {
  const t = new Date()
  const today = new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime()
  return Math.round((parseISO(iso).getTime() - today) / DAY)
}

export function dueLabel(iso: string): string {
  const n = daysUntil(iso)
  if (n < -1) return `${-n} days overdue`
  if (n === -1) return 'Due yesterday'
  if (n === 0) return 'Due today'
  if (n === 1) return 'Due tomorrow'
  const date = parseISO(iso)
  return n < 7
    ? `Due ${date.toLocaleDateString(undefined, { weekday: 'long' })}`
    : `Due ${date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`
}
