import { initials, useApp } from '../app-context'
import { LIST_INFO } from '../rooms'
import type { RoomId } from '../types'
import { ChevronLeft } from './Icons'

export function Header({ room, count, onSettings }: { room: RoomId; count: number; onSettings: () => void }) {
  const { household, goTo } = useApp()

  if (room !== 'home') {
    return (
      <header>
        <div className="nav-bar">
          <button className="back-btn" onClick={() => goTo('home')}>
            <ChevronLeft />
            Lists
          </button>
        </div>
        <h1 className="large-title" data-list={room}>
          {LIST_INFO[room].label}
        </h1>
        <p className="subtitle">{LIST_INFO[room].count(count)}</p>
      </header>
    )
  }

  return (
    <header>
      <div className="nav-bar" style={{ justifyContent: 'flex-end' }}>
        <button className="members-btn" onClick={onSettings} aria-label="Settings and members">
          {household.members.map((m, i) => (
            <span key={m} className="avatar" data-p={i}>
              {initials(household.memberNames[m] ?? '?')}
            </span>
          ))}
          {household.members.length < 2 && <span className="avatar avatar--empty">+</span>}
        </button>
      </div>
      <h1 className="large-title">Running Low</h1>
      <p className="subtitle">
        {household.name} · {count ? `${count} to get` : 'nothing to get'}
      </p>
    </header>
  )
}
