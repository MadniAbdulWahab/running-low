import { useMemo, useState } from 'react'
import { useApp } from '../app-context'
import { frequentFor, type Frequent } from '../starters'
import type { ListId } from '../types'
import { CheckCircle, PlusCircle } from './Icons'

/** One-tap shortcuts for the things this list runs out of most. */
export function QuickPicks({ list }: { list: ListId }) {
  const { items, byKey, add, toast } = useApp()
  const picks = useMemo(() => frequentFor(list, items, byKey, 8), [list, items, byKey])
  const [popping, setPopping] = useState<string | null>(null)

  const tap = (f: Frequent) => {
    if (f.item?.status === 'needed') {
      toast(`${f.name} is already on the list`)
      return
    }
    setPopping(f.key)
    window.setTimeout(() => setPopping((p) => (p === f.key ? null : p)), 340)
    add([f.name], { list })
  }

  return (
    <section aria-label="Quick add">
      <h2 className="group-label">Quick add</h2>
      <div className="picks">
        {picks.map((f) => {
          const on = f.item?.status === 'needed'
          return (
            <button
              key={f.key}
              className="pick"
              data-on={on || undefined}
              data-pop={popping === f.key || undefined}
              onClick={() => tap(f)}
              aria-label={on ? `${f.name}, on the list` : `Add ${f.name}`}
            >
              {on ? <CheckCircle /> : <PlusCircle />}
              {f.name}
            </button>
          )
        })}
      </div>
    </section>
  )
}
