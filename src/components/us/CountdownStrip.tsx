import { daysTo, nextDate, type Countdown } from '../../data/countdowns'
import { colorFor } from './Countdowns'

/** How close a countdown must be before it shows on Home. */
export const SOON_DAYS = 14

/**
 * Home: the next countdown, only once it's within two weeks. A soft tint at first,
 * the full pastel in the last week, and "Today! 🎉" on the day. Tap to open it.
 */
export function CountdownStrip({ countdowns, onOpen }: { countdowns: Countdown[] | null; onOpen: (id: string) => void }) {
  const soon = (countdowns ?? [])
    .map((c) => ({ c, n: daysTo(c) }))
    .filter(({ n }) => n >= 0 && n <= SOON_DAYS)
    .sort((a, b) => a.n - b.n)
  if (!soon.length) return null
  const { c, n } = soon[0]
  const level = n === 0 ? 'today' : n <= 7 ? 'near' : 'soon'
  const date = nextDate(c).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
  const more = soon.length - 1
  const when = n === 0 ? 'today' : n === 1 ? 'tomorrow' : `in ${n} days`

  return (
    <button
      className="cd-strip"
      data-color={colorFor(c.id)}
      data-level={level}
      onClick={() => onOpen(c.id)}
      aria-label={`${c.title}, ${when}`}
    >
      <span className="cd-strip-emoji" aria-hidden="true">
        {c.emoji}
      </span>
      <span className="cd-strip-text">
        <span className="cd-strip-title">{c.title}</span>
        <span className="cd-strip-date">
          {date}
          {more > 0 && ` · +${more} soon`}
        </span>
      </span>
      <span className="cd-strip-count" aria-hidden="true">
        {n === 0 ? (
          <span className="cd-strip-big cd-strip-word">Today! 🎉</span>
        ) : n === 1 ? (
          <span className="cd-strip-big cd-strip-word">Tomorrow!</span>
        ) : (
          <>
            <span className="cd-strip-big">{n}</span>
            <span className="cd-strip-unit">days to go</span>
          </>
        )}
      </span>
    </button>
  )
}
