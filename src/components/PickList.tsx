import { useState } from 'react'
import { useApp } from '../app-context'
import { emojiFor } from '../lib/emoji'
import type { Entry } from '../lib/parse'
import { CheckCircle } from './Icons'

/**
 * Groceries to add in one go (from a template or a past shop). All ticked to start;
 * untick what isn't needed. Anything already on the list is greyed out.
 */
export function PickList({
  entries,
  label,
  onAdded,
}: {
  entries: Entry[]
  /** The button's text for n ticked items. */
  label: (n: number) => string
  onAdded?: () => void
}) {
  const { add, byKey } = useApp()
  const [off, setOff] = useState<Set<string>>(() => new Set())
  const keyOf = (e: Entry) => e.name.toLocaleLowerCase()
  const onList = (e: Entry) => byKey.get(keyOf(e))?.status === 'needed'
  const chosen = entries.filter((e) => !onList(e) && !off.has(keyOf(e)))

  const toggle = (k: string) =>
    setOff((prev) => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })

  const addChosen = () => {
    add(chosen, { list: 'grocery' })
    onAdded?.()
  }

  return (
    <div className="group">
      {entries.map((e) => {
        const k = keyOf(e)
        const already = onList(e)
        const on = !already && !off.has(k)
        return (
          <button
            key={k}
            className="row pick-row"
            role="checkbox"
            aria-checked={on}
            disabled={already}
            onClick={() => toggle(k)}
          >
            <span className="item-emoji" aria-hidden="true">
              {emojiFor(e.name, 'grocery')}
            </span>
            <span className="pick-row-name">
              {e.name}
              {e.qty && e.qty > 1 ? <span className="pick-row-qty"> ×{e.qty}</span> : null}
            </span>
            {already ? (
              <span className="pick-row-state">On the list</span>
            ) : (
              <span className="select-ring" data-on={on || undefined}>
                {on && <CheckCircle />}
              </span>
            )}
          </button>
        )
      })}
      <button className="row row--action row--center pick-add" disabled={!chosen.length} onClick={addChosen}>
        {chosen.length ? label(chosen.length) : entries.every(onList) ? 'Everything’s on the list' : 'Nothing ticked'}
      </button>
    </div>
  )
}
