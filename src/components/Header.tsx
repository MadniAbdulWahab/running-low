import { initials, useApp } from '../app-context'
import { LIST_INFO } from '../rooms'
import type { RoomId } from '../types'

interface Props {
  room: RoomId
  count: number
  onSettings: () => void
  /** Ids of the items on this screen that can be selected. */
  selectable: string[]
  onSelectAll: () => void
  onDoneSelecting: () => void
}

export function Header({ room, count, onSettings, selectable, onSelectAll, onDoneSelecting }: Props) {
  const { household, selecting, selected, startSelect } = useApp()
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })
  const allSelected = selectable.length > 0 && selectable.every((id) => selected.has(id))

  return (
    <header>
      <div className="nav-bar">
        {selecting ? (
          <button className="nav-btn" onClick={onSelectAll}>
            {allSelected ? 'Deselect All' : 'Select All'}
          </button>
        ) : (
          <span className="nav-date">{room === 'home' ? today : household.name}</span>
        )}
        <span className="nav-actions">
          {selecting ? (
            <button className="nav-btn nav-btn--strong" onClick={onDoneSelecting}>
              Done
            </button>
          ) : (
            <>
              {selectable.length > 0 && (
                <button className="nav-btn" onClick={() => startSelect()}>
                  Select
                </button>
              )}
              <button className="members-btn" onClick={onSettings} aria-label="Settings and members">
                {household.members.map((m, i) => (
                  <span key={m} className="avatar" data-p={i}>
                    {initials(household.memberNames[m] ?? '?')}
                  </span>
                ))}
                {household.members.length < 2 && <span className="avatar avatar--empty">+</span>}
              </button>
            </>
          )}
        </span>
      </div>
      {room === 'home' ? (
        <>
          <h1 className="large-title">Running Low</h1>
          <p className="subtitle">
            {selecting
              ? `${selected.size} selected`
              : `${household.name} · ${count ? `${count} to get` : 'nothing to get'}`}
          </p>
        </>
      ) : (
        <>
          <h1 className="large-title" data-list={room}>
            {LIST_INFO[room].label}
          </h1>
          <p className="subtitle">{selecting ? `${selected.size} selected` : LIST_INFO[room].count(count)}</p>
        </>
      )}
    </header>
  )
}
