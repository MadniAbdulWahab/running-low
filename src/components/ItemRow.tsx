import { useState } from 'react'
import { memberOf, useApp } from '../app-context'
import { usePhoto } from '../hooks/usePhoto'
import { ago, daysUntil, dueLabel } from '../lib/time'
import type { Item } from '../types'
import { CheckIcon, PlusIcon } from './Icons'

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function ItemRow({ item, variant = 'row' }: { item: Item; variant?: 'row' | 'card' }) {
  const { household, uid, done, openItem } = useApp()
  const [striking, setStriking] = useState(false)
  const photo = usePhoto(household.id, item.photoId)
  const who = memberOf(household, item.addedBy, uid)

  const check = () => {
    if (striking) return
    setStriking(true)
    window.setTimeout(() => done(item), reducedMotion() ? 0 : 300)
  }

  const overdue = item.due ? daysUntil(item.due) < 0 : false

  return (
    <div className={`item item--${variant}`} data-striking={striking || undefined}>
      <button className="item-check" onClick={check} aria-label={`Got ${item.name}`}>
        <span className="item-ring">
          <CheckIcon />
        </span>
      </button>
      <button className="item-body" onClick={() => openItem(item.id)}>
        <span className="item-name">
          {item.name}
          <svg className="strike" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden>
            <path d="M1 6.2 C 22 4.6, 48 7.4, 72 5.2 S 96 5.6, 99 4.6" pathLength={1} />
          </svg>
        </span>
        <span className="item-meta">
          <i className="who-dot" data-p={who.idx} />
          {who.name} · {ago(item.addedAt)}
          {item.due && (
            <span className="item-due" data-overdue={overdue || undefined}>
              {dueLabel(item.due)}
            </span>
          )}
        </span>
      </button>
      {photo && (
        <button className="item-thumb" onClick={() => openItem(item.id)} aria-label={`Photo of ${item.name}`}>
          <img src={photo} alt="" />
        </button>
      )}
    </div>
  )
}

export function RecentRow({ item }: { item: Item }) {
  const { household, uid, add } = useApp()
  const who = memberOf(household, item.doneBy ?? item.addedBy, uid)
  return (
    <button className="recent-row" onClick={() => add([item.name], { list: item.list })}>
      <span className="recent-text">
        <span className="recent-name">{item.name}</span>
        <span className="item-meta">
          <i className="who-dot" data-p={who.idx} />
          {who.name} · {ago(item.doneAt)}
        </span>
      </span>
      <span className="recent-again">
        <PlusIcon />
        Again
      </span>
    </button>
  )
}
