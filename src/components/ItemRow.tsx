import { useRef, useState } from 'react'
import { memberOf, useApp } from '../app-context'
import { usePhoto } from '../hooks/usePhoto'
import { emojiFor } from '../lib/emoji'
import { ago, daysUntil, dueLabel } from '../lib/time'
import type { Item } from '../types'
import { CheckCircle } from './Icons'

const HOLD_MS = 450

const TickIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 12.5l4 4 8-9" />
  </svg>
)

export function ItemRow({ item }: { item: Item }) {
  const { household, uid, done, askUntick, openItem, selecting, selected, toggleSelect, askDelete } = useApp()
  const [holding, setHolding] = useState(false)
  const photo = usePhoto(household.id, item.photoId)
  const ticked = item.status === 'done'
  const who = memberOf(household, ticked ? (item.doneBy ?? item.addedBy) : item.addedBy, uid)
  const isSelected = selected.has(item.id)

  // Press and hold asks to delete; moving the finger (scrolling) cancels it.
  const press = useRef<{ timer: number; x: number; y: number } | null>(null)
  const held = useRef(false)

  const cancelHold = () => {
    if (press.current) window.clearTimeout(press.current.timer)
    press.current = null
    setHolding(false)
  }
  const onPointerDown = (e: React.PointerEvent) => {
    if (selecting || e.button > 0) return
    held.current = false
    setHolding(true)
    const timer = window.setTimeout(() => {
      held.current = true
      press.current = null
      setHolding(false)
      askDelete(item)
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

  const tick = () => {
    if (consumeHold()) return
    if (ticked) askUntick(item)
    else done(item)
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
      data-done={ticked || undefined}
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
        askDelete(item)
      }}
    >
      {selecting && (
        <button
          className="item-check"
          onClick={() => toggleSelect(item.id)}
          aria-label={`Select ${item.name}`}
          aria-pressed={isSelected}
        >
          <span className="select-ring" data-on={isSelected || undefined}>
            {isSelected && <CheckCircle />}
          </span>
        </button>
      )}
      <button className="item-body" onClick={open}>
        <span className="item-emoji" aria-hidden="true">
          {emojiFor(item.name, item.list)}
        </span>
        <span className="item-text">
          <span className="item-name">
            {item.name}
            {item.qty && item.qty > 1 && <span className="item-qty">×{item.qty}</span>}
          </span>
          {item.note && <span className="item-note">{item.note}</span>}
          <span className="item-meta">
            <i className="who-dot" data-p={who.idx} />
            {ticked ? `Got by ${who.name === 'You' ? 'you' : who.name}` : who.name} ·{' '}
            {ago(ticked ? item.doneAt : item.addedAt)}
            {item.due && !ticked && (
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
      {!selecting && (
        <button
          className="item-tick"
          onClick={tick}
          aria-label={ticked ? `Put ${item.name} back` : `Got ${item.name}`}
          aria-pressed={ticked}
        >
          <span className="tick-ring">
            <TickIcon />
          </span>
        </button>
      )}
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
