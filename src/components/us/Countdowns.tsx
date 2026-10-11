import { useState } from 'react'
import { useApp } from '../../app-context'
import {
  bySoonest,
  daysTo,
  defaultCountdownDate,
  deleteCountdown,
  saveCountdown,
  type Countdown,
} from '../../data/countdowns'
import { NOTE_COLORS } from '../../rooms'
import { Sheet } from '../Sheet'

const EMOJI = ['🎉', '✈️', '🎂', '💍', '🏖️', '🎄', '🏠', '❤️', '🎁', '🎟️']

const colorFor = (id: string) => {
  let h = 0
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return NOTE_COLORS[h % NOTE_COLORS.length]
}

function unit(n: number) {
  if (n === 0) return 'today'
  if (n === 1) return 'day to go'
  if (n > 1) return 'days to go'
  return n === -1 ? 'day ago' : 'days ago'
}

/** A row of pastel cards counting down to things you're looking forward to. */
export function Countdowns({ items, onOpen }: { items: Countdown[] | null; onOpen: (id: string) => void }) {
  if (items === null) return null
  const sorted = [...items].sort(bySoonest)
  return (
    <section aria-label="Countdowns">
      <h2 className="group-label">
        <span>Countdowns</span>
      </h2>
      <div className="cd-row">
        {sorted.map((c) => {
          const n = daysTo(c)
          return (
            <button
              key={c.id}
              className="cd-card"
              data-color={colorFor(c.id)}
              data-past={n < 0 || undefined}
              onClick={() => onOpen(c.id)}
              aria-label={`${c.title}: ${n === 0 ? 'today' : `${Math.abs(n)} ${unit(n)}`}`}
            >
              <span className="cd-emoji" aria-hidden="true">
                {c.emoji}
              </span>
              <span className="cd-days">{n === 0 ? 'Today!' : Math.abs(n)}</span>
              <span className="cd-unit">{n === 0 ? '🎉' : unit(n)}</span>
              <span className="cd-title">{c.title}</span>
            </button>
          )
        })}
        <button className="cd-card cd-add" onClick={() => onOpen('new')}>
          <span className="cd-plus" aria-hidden="true">
            +
          </span>
          <span className="cd-title">Add a countdown</span>
        </button>
      </div>
    </section>
  )
}

/** Create or edit one countdown. */
export function CountdownSheet({ countdown, onClose }: { countdown?: Countdown; onClose: () => void }) {
  const { household, uid, toast } = useApp()
  const [title, setTitle] = useState(countdown?.title ?? '')
  const [date, setDate] = useState(countdown?.date ?? defaultCountdownDate())
  const [emoji, setEmoji] = useState(countdown?.emoji ?? '🎉')
  const [yearly, setYearly] = useState(countdown?.yearly ?? false)
  const valid = title.trim().length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(date)

  const save = () => {
    if (!valid) return toast('Give it a name and a date')
    saveCountdown(household.id, uid, { id: countdown?.id, title, date, emoji, yearly })
    onClose()
  }

  return (
    <Sheet title={countdown ? 'Countdown' : 'New countdown'} onClose={onClose}>
      <h3 className="group-label">What’s coming up</h3>
      <div className="group">
        <label className="row">
          <span className="visually-hidden">Name</span>
          <input
            className="row-input"
            value={title}
            maxLength={60}
            placeholder="Paris trip, anniversary…"
            autoCapitalize="sentences"
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="row">
          <span className="row-label">Date</span>
          <input type="date" className="row-date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <div className="row row--segmented">
          <div className="segmented">
            <button aria-pressed={!yearly} onClick={() => setYearly(false)}>
              Once
            </button>
            <button aria-pressed={yearly} onClick={() => setYearly(true)}>
              Every year
            </button>
          </div>
        </div>
      </div>

      <h3 className="group-label">Emoji</h3>
      <div className="cd-emoji-pick" role="radiogroup" aria-label="Emoji">
        {EMOJI.map((e) => (
          <button key={e} role="radio" aria-checked={emoji === e} onClick={() => setEmoji(e)}>
            {e}
          </button>
        ))}
      </div>

      <button className="btn" style={{ marginTop: 22 }} disabled={!valid} onClick={save}>
        {countdown ? 'Save' : 'Add countdown'}
      </button>
      {countdown && (
        <div className="group" style={{ marginTop: 14 }}>
          <button
            className="row row--danger"
            onClick={() => {
              deleteCountdown(household.id, countdown.id)
              toast('Countdown removed')
              onClose()
            }}
          >
            Delete countdown
          </button>
        </div>
      )}
    </Sheet>
  )
}
