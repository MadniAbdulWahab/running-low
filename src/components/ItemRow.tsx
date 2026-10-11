import { useRef, useState } from 'react'
import { memberOf, useApp } from '../app-context'
import { usePhoto } from '../hooks/usePhoto'
import { emojiFor } from '../lib/emoji'
import { ago, daysUntil, dueLabel } from '../lib/time'
import type { Item } from '../types'
import { CheckCircle } from './Icons'

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const HOLD_MS = 450

export function ItemRow({ item }: { item: Item }) {
  const { household, uid, done, openItem, selecting, selected, toggleSelect, openMenu } = useApp()
  const [striking, setStriking] = useState(false)
  const [holding, setHolding] = useState(false)
  const photo = usePhoto(household.id, item.photoId)
  const who = memberOf(household, item.addedBy, uid)
  const isSelected = selected.has(item.id)

  // Press and hold opens the item menu; moving the finger (scrolling) cancels it.
  const press = useRef<{ timer: number; x: number; y: number } | null>(null)
  const held = useRef(false)

  const cancelHold = () => {
    if (press.current) window.clearTimeout(press.current.timer)
    press.current = null
    setHolding(false)
  }
  const onPointerDown = (e: React.PointerEvent) => {
    if (selecting || striking || e.button > 0) return
    held.current = false
    setHolding(true)
    const timer = window.setTimeout(() => {
      held.current = true
      press.current = null
      setHolding(false)
      openMenu(item)
    }, HOLD_MS)
    press.current = { timer, x: e.clientX, y: e.clientY }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const p = press.current
    if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 10) cancelHold()
  }
  /** Swallows the click that follows a long press. */
  const consumeHold = () => {
    if (!held.current) return false
    held.current = false
    return true
  }

  const check = () => {
    if (consumeHold() || striking) return
    if (selecting) return toggleSelect(item.id)
    setStriking(true)
    window.setTimeout(() => done(item), reducedMotion() ? 0 : 450)
  }
  const open = () => {
    if (consumeHold()) return
    if (selecting) toggleSelect(item.id)
    else openItem(item.id)
  }

  const days = item.due ? daysUntil(item.due) : null

  return (
    <div
      className="item"
      data-list={item.list}
      data-striking={striking || undefined}
      data-holding={holding || undefined}
      data-selected={isSelected || undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={cancelHold}
      onPointerCancel={cancelHold}
      onContextMenu={(e) => {
        e.preventDefault()
        if (selecting) return
        cancelHold()
        held.current = false
        openMenu(item)
      }}
    >
      <button
        className="item-check"
        onClick={check}
        aria-label={selecting ? `Select ${item.name}` : `Got ${item.name}`}
        aria-pressed={selecting ? isSelected : undefined}
      >
        {selecting ? (
          <span className="select-ring" data-on={isSelected || undefined}>
            {isSelected && <CheckCircle />}
          </span>
        ) : (
          <span className="item-ring" />
        )}
      </button>
      <button className="item-body" onClick={open}>
        <span className="item-emoji" aria-hidden="true">
          {emojiFor(item.name, item.list)}
        </span>
        <span className="item-text">
          <span className="item-name">{item.name}</span>
          {item.note && <span className="item-note">{item.note}</span>}
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
