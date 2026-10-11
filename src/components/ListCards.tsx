import { useApp } from '../app-context'
import { bySoonest, daysTo, type Countdown } from '../data/countdowns'
import type { Meal } from '../data/meals'
import { emojiFor } from '../lib/emoji'
import { todayISO } from '../lib/time'
import { LIST_INFO, LISTS, ROOM_LABEL } from '../rooms'
import type { Item, ListId, Note, RoomId } from '../types'
import { HeartGlyph, ListGlyph, MealsGlyph } from './Icons'

function Card({
  room,
  icon,
  count,
  label,
  peek,
  peekText,
}: {
  room: RoomId
  icon: React.ReactNode
  count: number
  label: string
  peek: string
  peekText?: boolean
}) {
  const { goTo } = useApp()
  return (
    <button
      className="list-card"
      data-tone={room}
      data-list={room === 'grocery' || room === 'important' ? room : undefined}
      onClick={() => goTo(room)}
    >
      <span className="list-card-top">
        <span className="list-icon">{icon}</span>
        <span className="list-card-count">{count}</span>
      </span>
      <span className="list-card-name">{label}</span>
      <span className={peekText ? 'list-card-peek list-card-peek--text' : 'list-card-peek'} aria-hidden={!peekText}>
        {peek}
      </span>
    </button>
  )
}

/** Home: one card per tab, each with a peek at what's in it. */
export function ListCards({
  needed,
  meals,
  notes,
  countdowns,
}: {
  needed: Record<ListId, Item[]>
  meals: Meal[] | null
  notes: Note[] | null
  countdowns: Countdown[] | null
}) {
  const today = todayISO()
  const upcoming = (meals ?? []).filter((m) => m.name && m.day >= today).sort((a, b) => a.day.localeCompare(b.day))
  const tonight = upcoming.find((m) => m.day === today)
  const next = [...(countdowns ?? [])].sort(bySoonest)[0]
  const nextDays = next ? daysTo(next) : 0

  return (
    <nav className="list-cards" aria-label="Tabs">
      {LISTS.map((l) => {
        const peek = [...new Set(needed[l].map((i) => emojiFor(i.name, i.list)))].slice(0, 4)
        return (
          <Card
            key={l}
            room={l}
            icon={<ListGlyph list={l} />}
            count={needed[l].length}
            label={LIST_INFO[l].label}
            peek={peek.length ? peek.join(' ') : l === 'grocery' ? 'All stocked' : 'All sorted'}
            peekText={!peek.length}
          />
        )
      })}
      <Card
        room="meals"
        icon={<MealsGlyph />}
        count={upcoming.length}
        label={ROOM_LABEL.meals}
        peek={tonight ? `Tonight: ${tonight.name}` : upcoming[0] ? `Next: ${upcoming[0].name}` : 'Nothing planned'}
        peekText
      />
      <Card
        room="us"
        icon={<HeartGlyph />}
        count={notes?.length ?? 0}
        label={ROOM_LABEL.us}
        peek={
          next
            ? `${next.emoji} ${next.title} · ${nextDays === 0 ? 'today' : nextDays === 1 ? '1 day' : `${nextDays} days`}`
            : 'Notes, countdowns, dates'
        }
        peekText
      />
    </nav>
  )
}
