import type { Meal } from '../../data/meals'
import type { Note, Ping } from '../../types'
import { HeartsBar } from './HeartsBar'
import { MealPlanner } from './MealPlanner'
import { NotesBoard } from './NotesBoard'

/** The Us tab: hearts, the shared notes board and the week's meals. */
export function UsRoom({
  notes,
  pings,
  meals,
  onOpenNote,
  onNewNote,
  onAskDeleteNote,
  onOpenMealDay,
}: {
  notes: Note[] | null
  pings: Ping[]
  meals: Meal[] | null
  onOpenNote: (id: string) => void
  onNewNote: () => void
  onAskDeleteNote: (note: Note) => void
  onOpenMealDay: (day: string) => void
}) {
  return (
    <>
      <HeartsBar pings={pings} />
      <NotesBoard notes={notes} onOpen={onOpenNote} onNew={onNewNote} onAskDelete={onAskDeleteNote} />
      <MealPlanner meals={meals} onOpenDay={onOpenMealDay} />
    </>
  )
}
