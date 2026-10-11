import { useApp } from '../app-context'
import { LISTS, ROOMS } from '../rooms'
import type { ListId } from '../types'
import { RoomIcon } from './Icons'

/** The Kitchen's glazed tiles: one per room, in that room's colours. */
export function RoomTiles({ counts }: { counts: Record<ListId, number> }) {
  const { goTo } = useApp()
  return (
    <nav className="tiles" aria-label="Rooms">
      {LISTS.map((l) => (
        <button key={l} className="tile" data-palette={l} onClick={() => goTo(l)}>
          <span className="tile-icon">
            <RoomIcon room={l} />
          </span>
          <span className="tile-count">{counts[l]}</span>
          <span className="tile-name">{ROOMS[l].title}</span>
          <span className="tile-label">{ROOMS[l].label}</span>
        </button>
      ))}
    </nav>
  )
}
