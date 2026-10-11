import type { Countdown } from '../../data/countdowns'
import type { Idea } from '../../data/ideas'
import type { Note } from '../../types'
import { Countdowns } from './Countdowns'
import { DateJar } from './DateJar'
import { NotesBoard } from './NotesBoard'

/** The Us tab: countdowns, the notes board and the date jar. (Hearts live on Home, meals on their own tab.) */
export function UsRoom(props: {
  notes: Note[] | null
  countdowns: Countdown[] | null
  ideas: Idea[] | null
  onOpenNote: (id: string) => void
  onNewNote: () => void
  onAskDeleteNote: (note: Note) => void
  onOpenCountdown: (id: string) => void
}) {
  return (
    <>
      <Countdowns items={props.countdowns} onOpen={props.onOpenCountdown} />
      <NotesBoard
        notes={props.notes}
        onOpen={props.onOpenNote}
        onNew={props.onNewNote}
        onAskDelete={props.onAskDeleteNote}
      />
      <DateJar ideas={props.ideas} />
    </>
  )
}
