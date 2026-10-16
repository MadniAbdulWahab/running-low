import { useRef, useState } from 'react'
import { memberOf, useApp } from '../../app-context'
import { reactionEmoji, updateNote } from '../../data/notes'
import { ago } from '../../lib/time'
import type { Note } from '../../types'
import { ReactionBubble, reactToNote } from './ReactionBubble'

const HOLD_MS = 450
const CARD_CHECKS = 5

/** Sticky-note board: pastel cards in two columns, pinned ones first. */
export function NotesBoard({
  notes,
  onOpen,
  onNew,
  onAskDelete,
}: {
  notes: Note[] | null
  onOpen: (id: string) => void
  onNew: () => void
  onAskDelete: (note: Note) => void
}) {
  return (
    <section aria-label="Notes">
      <h2 className="group-label list-label">
        <span>Notes</span>
        <button className="select-toggle" onClick={onNew}>
          New note
        </button>
      </h2>
      {notes === null ? null : notes.length ? (
        <div className="board">
          {notes.map((n) => (
            <NoteCard key={n.id} note={n} onOpen={() => onOpen(n.id)} onAskDelete={() => onAskDelete(n)} />
          ))}
        </div>
      ) : (
        <div className="empty empty--card">
          <span className="empty-art" aria-hidden="true">
            <span className="sticker sticker--inline">📝</span>
          </span>
          <strong>No notes yet</strong>
          Write one below. It shows up instantly for everyone on the list.
        </div>
      )}
    </section>
  )
}

function NoteCard({ note, onOpen, onAskDelete }: { note: Note; onOpen: () => void; onAskDelete: () => void }) {
  const { household, uid } = useApp()
  const [title, ...rest] = note.text.trim().split('\n')
  const body = rest.join('\n').trim()
  // The writer: a note is theirs, even after someone else ticks its checklist.
  const who = memberOf(household, note.createdBy, uid)
  const checks = note.checklist.filter((c) => c.t.trim())
  const mine = note.createdBy === uid
  const reactions = Object.entries(note.reactions)
  // Stickers pop on only when a reaction arrives, not every time the board shows.
  const firstSeen = useRef(note.reactions)

  // Press and hold: your own note asks to delete it (same feel as list items);
  // someone else's pops up the reactions, like reacting to a post.
  const card = useRef<HTMLElement>(null)
  const [bubble, setBubble] = useState<DOMRect | null>(null)
  const hold = () => {
    if (mine) onAskDelete()
    else if (card.current) setBubble(card.current.getBoundingClientRect())
  }
  const timer = useRef(0)
  const held = useRef(false)
  const start = (e: React.PointerEvent) => {
    if (e.button > 0) return
    held.current = false
    timer.current = window.setTimeout(() => {
      held.current = true
      hold()
    }, HOLD_MS)
  }
  const cancel = () => window.clearTimeout(timer.current)
  const open = () => {
    if (held.current) {
      held.current = false
      return
    }
    onOpen()
  }

  const toggle = (i: number) => {
    const next = note.checklist.map((c, j) => (j === i ? { ...c, done: !c.done } : c))
    updateNote(household.id, uid, note.id, { checklist: next })
  }

  return (
    <article
      ref={card}
      className="note"
      data-reacted={reactions.length > 0 || undefined}
      data-color={note.color}
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerCancel={cancel}
      onPointerMove={(e) => (Math.abs(e.movementY) > 3 || Math.abs(e.movementX) > 3) && cancel()}
      onContextMenu={(e) => {
        e.preventDefault()
        hold()
      }}
    >
      {note.pinned && (
        <span className="note-pin" aria-label="Pinned">
          📌
        </span>
      )}
      <button className="note-open" onClick={open}>
        <span className="note-title">{title || (checks.length ? 'Checklist' : 'Empty note')}</span>
        {body && <span className="note-body">{body}</span>}
      </button>
      {checks.length > 0 && (
        <ul className="note-checks">
          {note.checklist.slice(0, CARD_CHECKS).map((c, i) =>
            c.t.trim() ? (
              <li key={i}>
                <button
                  className="note-check"
                  data-done={c.done || undefined}
                  aria-pressed={c.done}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => toggle(i)}
                >
                  <span className="note-box" aria-hidden="true" />
                  {c.t}
                </button>
              </li>
            ) : null,
          )}
          {checks.length > CARD_CHECKS && <li className="note-more">+{checks.length - CARD_CHECKS} more</li>}
        </ul>
      )}
      <span className="note-meta">
        <span>
          {who.name} · {ago(note.updatedAt)}
        </span>
      </span>
      {reactions.map(([who, kind], i) => (
        <span
          key={who}
          className="note-sticker"
          data-new={firstSeen.current[who] !== kind || undefined}
          style={i ? { right: 14 + i * 22 } : undefined}
          role="img"
          aria-label={`${memberOf(household, who, uid).name} reacted ${reactionEmoji(kind)}`}
        >
          {reactionEmoji(kind)}
        </span>
      ))}
      {bubble && (
        <ReactionBubble
          anchor={bubble}
          current={note.reactions[uid] ?? null}
          onPick={(k) => {
            reactToNote(household, uid, note, k)
            setBubble(null)
          }}
          onClose={() => setBubble(null)}
        />
      )}
    </article>
  )
}
