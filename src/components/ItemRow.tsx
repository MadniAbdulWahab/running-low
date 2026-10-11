import { useState } from 'react'
import { memberOf, useApp } from '../app-context'
import { usePhoto } from '../hooks/usePhoto'
import { emojiFor } from '../lib/emoji'
import { ago, daysUntil, dueLabel } from '../lib/time'
import type { Item } from '../types'

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function ItemRow({ item }: { item: Item }) {
  const { household, uid, done, openItem } = useApp()
  const [striking, setStriking] = useState(false)
  const photo = usePhoto(household.id, item.photoId)
  const who = memberOf(household, item.addedBy, uid)

  const check = () => {
    if (striking) return
    setStriking(true)
    window.setTimeout(() => done(item), reducedMotion() ? 0 : 450)
  }

  const days = item.due ? daysUntil(item.due) : null

  return (
    <div className="item" data-list={item.list} data-striking={striking || undefined}>
      <button className="item-check" onClick={check} aria-label={`Got ${item.name}`}>
        <span className="item-ring" />
      </button>
      <button className="item-body" onClick={() => openItem(item.id)}>
        <span className="item-emoji" aria-hidden="true">
          {emojiFor(item.name, item.list)}
        </span>
        <span className="item-text">
          <span className="item-name">{item.name}</span>
          <span className="item-meta">
            <i className="who-dot" data-p={who.idx} />
            {who.name} · {ago(item.addedAt)}
            {item.due && (
              <>
                {' · '}
                <span
                  className="item-due"
                  data-overdue={days !== null && days < 0 ? true : undefined}
                  data-soon={days !== null && days >= 0 && days <= 2 ? true : undefined}
                >
                  {dueLabel(item.due)}
                </span>
              </>
            )}
          </span>
        </span>
        {photo && (
          <span className="item-thumb">
            <img src={photo} alt="" />
          </span>
        )}
      </button>
    </div>
  )
}

export function RecentRow({ item }: { item: Item }) {
  const { household, uid, add } = useApp()
  const who = memberOf(household, item.doneBy ?? item.addedBy, uid)
  return (
    <button
      className="recent-row"
      data-list={item.list}
      onClick={() => add([item.name], { list: item.list })}
      aria-label={`Add ${item.name} again`}
    >
      <span className="item-ring item-ring--done" />
      <span className="item-body">
        <span className="item-emoji" aria-hidden="true">
          {emojiFor(item.name, item.list)}
        </span>
        <span className="item-text">
          <span className="item-name">{item.name}</span>
          <span className="item-meta">
            <i className="who-dot" data-p={who.idx} />
            {who.name} · {ago(item.doneAt)}
          </span>
        </span>
        <span className="recent-again">Add again</span>
      </span>
    </button>
  )
}
