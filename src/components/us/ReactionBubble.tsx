import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { reactionEmoji, REACTIONS, setReaction } from '../../data/notes'
import { notify } from '../../lib/push'
import type { Household, Note, ReactionKind } from '../../types'

/** Sets your reaction (or takes it back) and lets the writer know about a new one. */
export function reactToNote(household: Household, uid: string, note: Note, kind: ReactionKind | null) {
  setReaction(household.id, uid, note.id, kind)
  if (!kind) return
  const first = note.text.trim().split('\n')[0] || note.checklist.find((c) => c.t.trim())?.t || ''
  void notify(household.id, 'notes', `${household.memberNames[uid] ?? 'Someone'} reacted ${reactionEmoji(kind)} to your note`, first, 'us')
}

const WIDTH = 168
const HEIGHT = 52

/**
 * The ❤️ 👍 👎 bubble that pops up over a held note, like reacting to a post.
 * Fixed to the screen (so the board's columns can't clip it); a tap outside, scrolling or Escape closes it.
 */
export function ReactionBubble({
  anchor,
  current,
  onPick,
  onClose,
}: {
  anchor: DOMRect
  current: ReactionKind | null
  onPick: (kind: ReactionKind | null) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const close = useRef(onClose)
  close.current = onClose

  useEffect(() => {
    const outside = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) close.current()
    }
    const key = (e: KeyboardEvent) => e.key === 'Escape' && close.current()
    const scrolled = () => close.current()
    document.addEventListener('pointerdown', outside)
    window.addEventListener('keydown', key)
    window.addEventListener('scroll', scrolled, { passive: true })
    return () => {
      document.removeEventListener('pointerdown', outside)
      window.removeEventListener('keydown', key)
      window.removeEventListener('scroll', scrolled)
    }
  }, [])

  const left = Math.min(Math.max(8, anchor.left + anchor.width / 2 - WIDTH / 2), window.innerWidth - WIDTH - 8)
  // Above the note when there's room; otherwise just inside its top edge.
  const top = anchor.top - HEIGHT - 6 > 8 ? anchor.top - HEIGHT - 6 : anchor.top + 6

  return createPortal(
    <div
      ref={ref}
      className="reaction-bubble"
      role="group"
      aria-label="React"
      style={{ left, top, width: WIDTH }}
      // It's portalled, but React events still bubble to the held note: keep taps here from starting another hold.
      onPointerDown={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.stopPropagation()}
    >
      {REACTIONS.map((r) => (
        <button
          key={r.kind}
          className="reaction-btn"
          aria-label={r.label}
          aria-pressed={current === r.kind}
          onClick={() => onPick(current === r.kind ? null : r.kind)}
        >
          {r.emoji}
        </button>
      ))}
    </div>,
    document.body,
  )
}
