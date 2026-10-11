import { ROOM_ORDER, ROOMS } from '../rooms'
import type { RoomId } from '../types'
import { RoomIcon } from './Icons'

export function TabBar({
  room,
  counts,
  onChange,
}: {
  room: RoomId
  counts: Record<RoomId, number>
  onChange: (r: RoomId) => void
}) {
  return (
    <nav className="tabbar" aria-label="Rooms">
      {ROOM_ORDER.map((r) => (
        <button
          key={r}
          className="tab"
          data-palette={r}
          aria-current={r === room ? 'page' : undefined}
          onClick={() => onChange(r)}
        >
          <span className="tab-icon">
            <RoomIcon room={r} />
            {r !== 'home' && counts[r] > 0 && <b className="tab-badge">{counts[r]}</b>}
          </span>
          <span className="tab-label">{ROOMS[r].label}</span>
        </button>
      ))}
    </nav>
  )
}
