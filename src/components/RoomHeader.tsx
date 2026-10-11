import { initials, useApp } from '../app-context'
import { ROOMS } from '../rooms'
import type { RoomId } from '../types'

export function RoomHeader({ room, count, onSettings }: { room: RoomId; count: number; onSettings: () => void }) {
  const { household } = useApp()
  const r = ROOMS[room]
  return (
    <header className="room-header">
      <div className="room-header-top">
        <span className="eyebrow">{r.label}</span>
        <button className="members-btn" onClick={onSettings} aria-label="Settings and members">
          {household.members.map((m, i) => (
            <span key={m} className="avatar avatar--small" data-p={i}>
              {initials(household.memberNames[m] ?? '?')}
            </span>
          ))}
          {household.members.length < 2 && <span className="avatar avatar--small avatar--empty">+</span>}
        </button>
      </div>
      <h1 className="room-title">
        <span className="room-title-the">The</span> {r.title}
      </h1>
      <p className="room-count">{r.count(count)}</p>
    </header>
  )
}
