import { useEffect, useRef, useState } from 'react'
import { memberOf, useApp } from '../../app-context'
import { deleteNote, reactionEmoji, REACTIONS, updateNote } from '../../data/notes'
import { notify } from '../../lib/push'
import { ago } from '../../lib/time'
import { NOTE_COLORS } from '../../rooms'
import type { ChecklistEntry, Note } from '../../types'
import { CloseIcon } from '../Icons'
import { Sheet } from '../Sheet'
import { reactToNote } from './ReactionBubble'

/**
 * Editing one note. Text and checklist save as you type (debounced) and when
 * the sheet closes; a note left completely empty is removed on close.
 * A note belongs to its writer: anyone else sees it read-only and can only tick its checklist.
 */
export function NoteSheet({ note, onClose, onAskDelete }: { note: Note; onClose: () => void; onAskDelete: () => void }) {
  const { household, uid } = useApp()
  const hid = household.id
  const mine = note.createdBy === uid
  const [text, setText] = useState(note.text)
  const [checklist, setChecklist] = useState<ChecklistEntry[]>(note.checklist)
  const editing = useRef(false)
  const startedEmpty = useRef(!note.text.trim() && !note.checklist.some((e) => e.t.trim()))
  const saved = useRef({ text: note.text, checklist: JSON.stringify(note.checklist) })

  // Take edits from the other phone, but never while typing here.
  useEffect(() => {
    if (editing.current) return
    setText(note.text)
    setChecklist(note.checklist)
    saved.current = { text: note.text, checklist: JSON.stringify(note.checklist) }
  }, [note.text, note.checklist])

  const save = (t: string, c: ChecklistEntry[]) => {
    const cj = JSON.stringify(c)
    if (t === saved.current.text && cj === saved.current.checklist) return
    saved.current = { text: t, checklist: cj }
    if (mine) updateNote(hid, uid, note.id, { text: t.slice(0, 5000), checklist: c.slice(0, 30) })
    else updateNote(hid, uid, note.id, { checklist: c })
  }
  useEffect(() => {
    if (!editing.current) return
    const timer = window.setTimeout(() => save(text, checklist), 600)
    return () => window.clearTimeout(timer)
  }, [text, checklist])

  const latest = useRef({ text, checklist })
  latest.current = { text, checklist }
  // If the sheet disappears some other way, still keep what was typed.
  useEffect(() => () => save(latest.current.text, latest.current.checklist), [])

  // Closing: save, or throw the note away if nothing was written in it.
  const finish = () => {
    const { text: t, checklist: c } = latest.current
    if (!mine) {
      save(note.text, c)
      onClose()
      return
    }
    if (!t.trim() && !c.some((e) => e.t.trim())) {
      saved.current = { text: t, checklist: JSON.stringify(c) }
      deleteNote(hid, note.id)
    } else {
      save(t, c)
      if (startedEmpty.current) {
        const first = t.trim().split('\n')[0] || c.find((e) => e.t.trim())?.t || ''
        void notify(hid, 'notes', `${household.memberNames[uid] ?? 'Someone'} left a note`, first, 'us')
      }
    }
    onClose()
  }

  const editList = (next: ChecklistEntry[]) => {
    editing.current = true
    setChecklist(next)
  }
  const firstLine = text.trim().split('\n')[0]
  const created = memberOf(household, note.createdBy, uid)
  const edited = memberOf(household, note.updatedBy, uid)

  return (
    <Sheet title={firstLine || 'Note'} onClose={finish}>
      {mine && (
        <div className="note-tools">
          <div className="note-swatches" role="radiogroup" aria-label="Colour">
            {NOTE_COLORS.map((c) => (
              <button
                key={c}
                className="note-swatch"
                data-color={c}
                role="radio"
                aria-checked={note.color === c}
                aria-label={c}
                onClick={() => updateNote(hid, uid, note.id, { color: c })}
              />
            ))}
          </div>
          <button
            className="select-toggle"
            aria-pressed={note.pinned}
            onClick={() => updateNote(hid, uid, note.id, { pinned: !note.pinned })}
          >
            {note.pinned ? 'Pinned' : 'Pin'}
          </button>
        </div>
      )}

      <div className="note-paper" data-color={note.color}>
        <label className="visually-hidden" htmlFor="note-text">
          Note
        </label>
        <textarea
          id="note-text"
          className="note-text"
          rows={6}
          maxLength={5000}
          value={text}
          readOnly={!mine}
          placeholder={mine ? 'Write something…' : ''}
          onFocus={() => (editing.current = true)}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => {
            editing.current = false
            save(text, checklist)
          }}
        />
      </div>

      {!mine && (
        <>
          <h3 className="group-label">React</h3>
          <div className="reaction-row" role="group" aria-label="React">
            {REACTIONS.map((r) => {
              const on = note.reactions[uid] === r.kind
              return (
                <button
                  key={r.kind}
                  className="select-toggle reaction-pill"
                  aria-pressed={on}
                  onClick={() => reactToNote(household, uid, note, on ? null : r.kind)}
                >
                  <span aria-hidden="true">{r.emoji}</span> {r.label}
                </button>
              )
            })}
          </div>
        </>
      )}

      {(mine || checklist.length > 0) && <h3 className="group-label">Checklist</h3>}
      {(mine || checklist.length > 0) && (
        <div className="group">
          {checklist.map((c, i) => (
            <div key={i} className="row note-row">
              <button
                className="note-check"
                data-done={c.done || undefined}
                aria-pressed={c.done}
                aria-label={c.done ? 'Mark not done' : 'Mark done'}
                onClick={() => editList(checklist.map((e, j) => (j === i ? { ...e, done: !e.done } : e)))}
              >
                <span className="note-box" aria-hidden="true" />
              </button>
              <input
                className="row-input"
                value={c.t}
                readOnly={!mine}
                maxLength={200}
                placeholder="Item"
                aria-label={`Checklist item ${i + 1}`}
                onFocus={() => (editing.current = true)}
                onChange={(e) => editList(checklist.map((x, j) => (j === i ? { ...x, t: e.target.value } : x)))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && checklist.length < 30) editList([...checklist.slice(0, i + 1), { t: '', done: false }, ...checklist.slice(i + 1)])
                }}
                onBlur={() => {
                  editing.current = false
                  save(text, checklist)
                }}
              />
              {mine && (
                <button className="note-row-remove" aria-label="Remove item" onClick={() => editList(checklist.filter((_, j) => j !== i))}>
                  <CloseIcon />
                </button>
              )}
            </div>
          ))}
          {mine && checklist.length < 30 && (
            <button className="row row--action" onClick={() => editList([...checklist, { t: '', done: false }])}>
              + Add item
            </button>
          )}
        </div>
      )}

      <p className="group-footer">
        Created by {created.name === 'You' ? 'you' : created.name} · {ago(note.createdAt)}
        {note.updatedAt - note.createdAt > 60_000 &&
          ` · edited by ${edited.name === 'You' ? 'you' : edited.name} ${ago(note.updatedAt)}`}
        {mine &&
          Object.entries(note.reactions)
            .filter(([who]) => who !== uid)
            .map(([who, k]) => (
              <span key={who}>
                <br />
                {memberOf(household, who, uid).name} reacted {reactionEmoji(k)}
              </span>
            ))}
        {!mine && (
          <>
            <br />
            Only {created.name} can change this note.{checklist.length > 0 && ' You can tick its checklist.'}
          </>
        )}
      </p>

      {mine && (
        <div className="group" style={{ marginTop: 24 }}>
          <button className="row row--danger" onClick={onAskDelete}>
            Delete note
          </button>
        </div>
      )}
    </Sheet>
  )
}
