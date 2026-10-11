import { useState } from 'react'
import { useApp } from '../../app-context'
import { createNote, nextColor } from '../../data/notes'
import { notify } from '../../lib/push'
import type { Note } from '../../types'
import { ArrowUp } from '../Icons'

/** The bottom bar on the Us tab: type a note and send it to the board. */
export function NoteComposer({ notes }: { notes: Note[] }) {
  const { household, uid, toast } = useApp()
  const [text, setText] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const t = text.trim()
    if (!t) return
    createNote(household.id, uid, { text: t, color: nextColor(notes) })
    void notify(household.id, 'notes', `${household.memberNames[uid] ?? 'Someone'} left a note`, t.split('\n')[0], 'us')
    setText('')
    toast('Note added')
  }

  return (
    <div className="toolbar-inner">
      <form className="quick-add" onSubmit={submit}>
        <span className="quick-plus composer-emoji" aria-hidden="true">
          📝
        </span>
        <input
          className="quick-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="New note…"
          aria-label="New note"
          autoComplete="off"
          autoCapitalize="sentences"
          enterKeyHint="send"
          maxLength={5000}
        />
        {text.trim() && (
          <button type="submit" className="quick-btn quick-send" aria-label="Add note">
            <ArrowUp />
          </button>
        )}
      </form>
    </div>
  )
}
