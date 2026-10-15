import { useApp } from '../app-context'
import type { Template } from '../data/templates'
import { usePhoto } from '../hooks/usePhoto'
import { emojiFor } from '../lib/emoji'
import { ChevronRight } from './Icons'

/** A template's photo, or its first item's emoji. */
function TemplateThumb({ template }: { template: Template }) {
  const { household } = useApp()
  const photo = usePhoto(household.id, template.photoId)
  return photo ? (
    <span className="item-thumb meal-thumb">
      <img src={photo} alt="" />
    </span>
  ) : (
    <span className="recipe-emoji recipe-emoji--grocery" aria-hidden="true">
      {template.items.length ? emojiFor(template.items[0].replace(/^\d+\s*[x×]?\s+/, ''), 'grocery') : '🧺'}
    </span>
  )
}

const count = (n: number) => (n === 1 ? '1 item' : `${n} items`)

/** "Templates" on the Groceries tab: groceries bought together, added in one go. */
export function GroceryTemplates({
  templates,
  canSaveList,
  onOpen,
  onNew,
  onSaveList,
}: {
  templates: Template[] | null
  /** Groceries has something on it to save. */
  canSaveList: boolean
  onOpen: (id: string) => void
  onNew: () => void
  onSaveList: () => void
}) {
  if (templates === null) return null
  return (
    <section aria-label="Templates">
      <h2 className="group-label">
        <span>Templates{templates.length ? ` · ${templates.length}` : ''}</span>
      </h2>
      <div className="group">
        {templates.map((t) => (
          <button key={t.id} className="meal-row recipe-row template-row" onClick={() => onOpen(t.id)}>
            <TemplateThumb template={t} />
            <span className="meal-text">
              <span className="meal-name">{t.name}</span>
              {t.items.length ? (
                <span className="meal-ingredients">
                  {count(t.items.length)} · {t.items.join(', ')}
                </span>
              ) : (
                <span className="meal-ingredients recipe-hint">Tap to add items</span>
              )}
            </span>
            <ChevronRight />
          </button>
        ))}
        <button className="row row--action template-action" onClick={onNew}>
          New template
        </button>
        {canSaveList && (
          <button className="row row--action template-action" onClick={onSaveList}>
            Save the list as a template
          </button>
        )}
      </div>
      {!templates.length && (
        <p className="group-footer">Save groceries you buy together, then add them all in one go next time.</p>
      )}
    </section>
  )
}
