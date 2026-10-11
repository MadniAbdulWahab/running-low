import { initials, useApp } from '../app-context'
import { LIST_INFO } from '../rooms'
import type { RoomId } from '../types'

export function Header({ room, count, onSettings }: { room: RoomId; count: number; onSettings: () => void }) {
  const { household, selecting, selected } = useApp()
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })
  const selectedLine = `${selected.size} selected`

  return (
    <header>
      <div className="nav-bar">
        <span className="nav-date">{room === 'home' ? today : household.name}</span>
        <button className="members-btn" onClick={onSettings} aria-label="Settings and members">
          {household.members.map((m, i) => (
            <span key={m} className="avatar" data-p={i}>
              {initials(household.memberNames[m] ?? '?')}
            </span>
          ))}
          {household.members.length < 2 && <span className="avatar avatar--empty">+</span>}
        </button>
      </div>
      {room === 'home' ? (
        <>
          <h1 className="large-title">Running Low</h1>
          <p className="subtitle">
            {selecting ? selectedLine : `${household.name} · ${count ? `${count} to get` : 'nothing to get'}`}
          </p>
        </>
      ) : (
        <>
          <h1 className="large-title" data-list={room}>
            {LIST_INFO[room].label}
          </h1>
          <p className="subtitle">{selecting ? selectedLine : LIST_INFO[room].count(count)}</p>
        </>
      )}
    </header>
  )
}
