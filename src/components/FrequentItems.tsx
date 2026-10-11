import { useMemo, useState } from 'react'
import { useApp } from '../app-context'
import { frequentFor, type Frequent } from '../starters'
import type { ListId } from '../types'

const CAPTION: Record<ListId, string> = {
  grocery: 'On the fridge door',
  household: 'On the shelf',
  important: 'Usual paperwork',
}

function tint(key: string) {
  let h = 0
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return h % 6
}

/** One-tap shortcuts: magnets on the fridge, jars in the pantry, tabs on the desk. */
export function FrequentItems({ list }: { list: ListId }) {
  const { items, byKey, add, toast } = useApp()
  const frequent = useMemo(
    () => frequentFor(list, items, byKey, list === 'important' ? 6 : 8),
    [list, items, byKey],
  )
  const [snapping, setSnapping] = useState<string | null>(null)

  const tap = (f: Frequent) => {
    if (f.item?.status === 'needed') {
      toast(`${f.name} is already on the list`)
      return
    }
    setSnapping(f.key)
    window.setTimeout(() => setSnapping((s) => (s === f.key ? null : s)), 450)
    add([f.name], { list })
  }

  return (
    <section className={`frequent frequent--${list}`} aria-label="Quick add">
      <h2 className="section-label">{CAPTION[list]}</h2>
      <div className="frequent-grid">
        {frequent.map((f) => {
          const on = f.item?.status === 'needed'
          return (
            <button
              key={f.key}
              className="freq"
              data-on={on || undefined}
              data-snap={snapping === f.key || undefined}
              data-tint={tint(f.key)}
              onClick={() => tap(f)}
              aria-label={on ? `${f.name}, on the list` : `Add ${f.name}`}
            >
              {list === 'grocery' && (
                <>
                  <span className="magnet">
                    <span className="magnet-mono">{f.name.charAt(0)}</span>
                  </span>
                  <span className="freq-name">{f.name}</span>
                </>
              )}
              {list === 'household' && (
                <span className="jar">
                  <span className="jar-lid" />
                  <span className="jar-label">{f.name}</span>
                </span>
              )}
              {list === 'important' && <span className="paper-tab">{f.name}</span>}
            </button>
          )
        })}
      </div>
    </section>
  )
}
