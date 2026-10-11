import { useApp } from '../app-context'
import { LIST_INFO, LISTS } from '../rooms'
import type { ListId } from '../types'
import { ListGlyph } from './Icons'

export function ListCards({ counts }: { counts: Record<ListId, number> }) {
  const { goTo } = useApp()
  return (
    <nav className="list-cards" aria-label="Lists">
      {LISTS.map((l) => (
        <button key={l} className="list-card" data-list={l} onClick={() => goTo(l)}>
          <span className="list-card-top">
            <span className="list-icon">
              <ListGlyph list={l} />
            </span>
            <span className="list-card-count">{counts[l]}</span>
          </span>
          <span className="list-card-name">{LIST_INFO[l].label}</span>
        </button>
      ))}
    </nav>
  )
}
