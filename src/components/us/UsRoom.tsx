import type { Countdown } from '../../data/countdowns'
import type { Idea } from '../../data/ideas'
import type { Note, Ping } from '../../types'
import { Countdowns } from './Countdowns'
import { DateJar } from './DateJar'
import { HeartsBar } from './HeartsBar'
import { NotesBoard } from './NotesBoard'

/** The Us tab: hearts, countdowns, the notes board and the date jar. (Meals have their own tab.) */
export function UsRoom(props: {
  notes: Note[] | null
  pings: Ping[]
  countdowns: Countdown[] | null
  ideas: Idea[] | null
  onOpenNote: (id: string) => void
  onNewNote: () => void
  onAskDeleteNote: (note: Note) => void
  onOpenCountdown: (id: string) => void
}) {
  return (
    <>
      <HeartsBar pings={props.pings} />
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
