import { isList, LIST_INFO, ROOM_ORDER } from '../rooms'
import type { RoomId } from '../types'
import { HeartGlyph, HomeGlyph, ListGlyph } from './Icons'

export function TabBar({
  room,
  counts,
  onChange,
}: {
  room: RoomId
  counts: Partial<Record<RoomId, number>>
  onChange: (r: RoomId) => void
}) {
  return (
    <nav className="tabbar" aria-label="Lists">
      {ROOM_ORDER.map((r) => (
        <button
          key={r}
          className="tab"
          data-list={isList(r) ? r : undefined}
          aria-current={r === room ? 'page' : undefined}
          onClick={() => onChange(r)}
        >
          <span className="tab-icon">
            {r === 'home' ? <HomeGlyph /> : r === 'us' ? <HeartGlyph /> : <ListGlyph list={r} />}
            {isList(r) && (counts[r] ?? 0) > 0 && <b className="tab-badge">{counts[r]}</b>}
          </span>
          <span className="tab-label">{r === 'home' ? 'Home' : r === 'us' ? 'Us' : LIST_INFO[r].label}</span>
        </button>
      ))}
    </nav>
  )
}
