import { LIST_INFO, ROOM_ORDER } from '../rooms'
import type { RoomId } from '../types'
import { HomeGlyph, ListGlyph } from './Icons'

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
    <nav className="tabbar" aria-label="Lists">
      {ROOM_ORDER.map((r) => (
        <button
          key={r}
          className="tab"
          data-list={r === 'home' ? undefined : r}
          aria-current={r === room ? 'page' : undefined}
          onClick={() => onChange(r)}
        >
          <span className="tab-icon">
            {r === 'home' ? <HomeGlyph /> : <ListGlyph list={r} />}
            {r !== 'home' && counts[r] > 0 && <b className="tab-badge">{counts[r]}</b>}
          </span>
          <span className="tab-label">{r === 'home' ? 'Home' : LIST_INFO[r].label}</span>
        </button>
      ))}
    </nav>
  )
}
