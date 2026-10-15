import { useState } from 'react'
import { shopDayLabel, type PastShop } from '../lib/shops'
import { parseISO } from '../lib/time'
import { ChevronRight } from './Icons'

/** "Past shops": groceries ticked off, one row per day. Tap one to add it again or save it as a template. */
export function PastShops({ shops, onOpen }: { shops: PastShop[]; onOpen: (day: string) => void }) {
  const [open, setOpen] = useState(false)
  if (!shops.length) return null
  return (
    <section aria-label="Past shops">
      <h2 className="group-label">
        <span>Past shops · {shops.length}</span>
        <button className="recent-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          {open ? 'Hide' : 'Show'}
        </button>
      </h2>
      {open && (
        <div className="group">
          {shops.map((s) => {
            const date = parseISO(s.day)
            return (
              <button key={s.day} className="meal-row recipe-row shop-row" onClick={() => onOpen(s.day)}>
                <span className="meal-day">
                  <span className="meal-dow">{date.toLocaleDateString(undefined, { weekday: 'short' })}</span>
                  <span className="meal-date">{date.getDate()}</span>
                </span>
                <span className="meal-text">
                  <span className="meal-name">{shopDayLabel(s.day)}</span>
                  <span className="meal-ingredients">
                    {s.items.length === 1 ? '1 item' : `${s.items.length} items`} ·{' '}
                    {s.items.map((i) => i.name).join(', ')}
                  </span>
                </span>
                <ChevronRight />
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}
