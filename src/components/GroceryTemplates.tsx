import { useState } from 'react'
import { useApp } from '../app-context'
import type { Template } from '../data/templates'
import { usePhoto } from '../hooks/usePhoto'
import { emojiFor } from '../lib/emoji'
import { ChevronRight, PlusIcon } from './Icons'

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

// Folding is remembered on this phone; open until folded.
const FOLD_KEY = 'outof.templatesFolded'
function readFolded() {
  try {
    return localStorage.getItem(FOLD_KEY) === '1'
  } catch {
    return false
  }
}

/** "Templates" on the Groceries tab: groceries bought together, added in one go. */
export function GroceryTemplates({
  templates,
  onOpen,
  onNew,
}: {
  templates: Template[] | null
  onOpen: (id: string) => void
  onNew: () => void
}) {
  const [folded, setFolded] = useState(readFolded)
  const toggle = () =>
    setFolded((f) => {
      try {
        localStorage.setItem(FOLD_KEY, f ? '0' : '1')
      } catch {}
      return !f
    })

  if (templates === null) return null
  return (
    <section aria-label="Templates">
      <h2 className="group-label list-label">
        <button className="fold-head" aria-expanded={!folded} onClick={toggle}>
          Templates{templates.length ? ` · ${templates.length}` : ''}
          <ChevronRight />
        </button>
        <button className="select-toggle heading-add" aria-label="New template" onClick={onNew}>
          <PlusIcon />
        </button>
      </h2>
      {!folded &&
        (templates.length ? (
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
          </div>
        ) : (
          <button className="dashed-add" onClick={onNew}>
            <PlusIcon />
            <span>
              Make a template
              <span className="dashed-add-hint">Groceries you buy together, added in one go</span>
            </span>
          </button>
        ))}
    </section>
  )
}
