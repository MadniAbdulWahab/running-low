import type { Countdown } from '../../data/countdowns'
import type { Idea } from '../../data/ideas'
import type { Meal } from '../../data/meals'
import type { Note, Ping } from '../../types'
import { Countdowns } from './Countdowns'
import { DateJar } from './DateJar'
import { HeartsBar } from './HeartsBar'
import { MealPlanner } from './MealPlanner'
import { NotesBoard } from './NotesBoard'

/** The Us tab: hearts, countdowns, the notes board, this week's meals and the date jar. */
export function UsRoom(props: {
  notes: Note[] | null
  pings: Ping[]
  meals: Meal[] | null
  countdowns: Countdown[] | null
  ideas: Idea[] | null
  onOpenNote: (id: string) => void
  onNewNote: () => void
  onAskDeleteNote: (note: Note) => void
  onOpenMealDay: (day: string) => void
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
      <MealPlanner meals={props.meals} onOpenDay={props.onOpenMealDay} />
      <DateJar ideas={props.ideas} />
    </>
  )
}
