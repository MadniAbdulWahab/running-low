import type { Note, Ping } from '../../types'
import { HeartsBar } from './HeartsBar'
import { NotesBoard } from './NotesBoard'

/** The Us tab: hearts and the shared notes board. */
export function UsRoom({
  notes,
  pings,
  onOpenNote,
  onNewNote,
  onAskDeleteNote,
}: {
  notes: Note[] | null
  pings: Ping[]
  onOpenNote: (id: string) => void
  onNewNote: () => void
  onAskDeleteNote: (note: Note) => void
}) {
  return (
    <>
      <HeartsBar pings={pings} />
      <NotesBoard notes={notes} onOpen={onOpenNote} onNew={onNewNote} onAskDelete={onAskDeleteNote} />
    </>
  )
}
