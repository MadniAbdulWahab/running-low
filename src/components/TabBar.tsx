import { ROOM_LABEL, ROOM_ORDER } from '../rooms'
import type { RoomId } from '../types'
import { HeartGlyph, HomeGlyph, ListGlyph, MealsGlyph } from './Icons'

const ICON: Record<RoomId, () => React.ReactElement> = {
  home: HomeGlyph,
  grocery: () => <ListGlyph list="grocery" />,
  important: () => <ListGlyph list="important" />,
  meals: MealsGlyph,
  us: HeartGlyph,
}

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
    <nav className="tabbar" aria-label="Tabs">
      {ROOM_ORDER.map((r) => {
        const Icon = ICON[r]
        const badge = r === 'grocery' || r === 'important' ? (counts[r] ?? 0) : 0
        return (
          <button
            key={r}
            className="tab"
            data-list={r === 'grocery' || r === 'important' ? r : undefined}
            aria-current={r === room ? 'page' : undefined}
            onClick={() => onChange(r)}
          >
            <span className="tab-icon">
              <Icon />
              {badge > 0 && <b className="tab-badge">{badge}</b>}
            </span>
            <span className="tab-label">{ROOM_LABEL[r]}</span>
          </button>
        )
      })}
    </nav>
  )
}
