import { useApp } from '../app-context'
import { emojiFor } from '../lib/emoji'
import { LIST_INFO, LISTS } from '../rooms'
import type { Item, ListId } from '../types'
import { ListGlyph } from './Icons'

export function ListCards({ needed }: { needed: Record<ListId, Item[]> }) {
  const { goTo } = useApp()
  return (
    <nav className="list-cards" aria-label="Lists">
      {LISTS.map((l) => {
        const peek = [...new Set(needed[l].map((i) => emojiFor(i.name, i.list)))].slice(0, 3)
        return (
          <button key={l} className="list-card" data-list={l} onClick={() => goTo(l)}>
            <span className="list-card-top">
              <span className="list-icon">
                <ListGlyph list={l} />
              </span>
              <span className="list-card-count">{needed[l].length}</span>
            </span>
            <span className="list-card-name">{LIST_INFO[l].label}</span>
            {peek.length ? (
              <span className="list-card-peek" aria-hidden="true">
                {peek.join(' ')}
              </span>
            ) : (
              <span className="list-card-peek list-card-peek--text">All stocked</span>
            )}
          </button>
        )
      })}
    </nav>
  )
}
