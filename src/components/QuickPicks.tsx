import { useMemo, useState } from 'react'
import { useApp } from '../app-context'
import { emojiFor } from '../lib/emoji'
import { LISTS } from '../rooms'
import { frequentFor, type Frequent } from '../starters'
import type { ListId, RoomId } from '../types'
import { CheckCircle } from './Icons'

type Pick = Frequent & { list: ListId }

/** One-tap shortcuts for the things that run out most. On Home: a few from every list. */
export function QuickPicks({ room }: { room: RoomId }) {
  const { items, byKey, add, toast } = useApp()
  const picks = useMemo<Pick[]>(
    () =>
      room === 'home'
        ? LISTS.flatMap((l) =>
            frequentFor(l, items, byKey, 6)
              .filter((f) => f.item?.status !== 'needed')
              .slice(0, 3)
              .map((f) => ({ ...f, list: l })),
          )
        : frequentFor(room, items, byKey, 8).map((f) => ({ ...f, list: room })),
    [room, items, byKey],
  )
  const [popping, setPopping] = useState<string | null>(null)

  const tap = (f: Pick) => {
    if (f.item?.status === 'needed') {
      toast(`${f.name} is already on the list`)
      return
    }
    setPopping(f.key)
    window.setTimeout(() => setPopping((p) => (p === f.key ? null : p)), 340)
    add([f.name], { list: f.list })
  }

  if (!picks.length) return null

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
              data-list={f.list}
              data-on={on || undefined}
              data-pop={popping === f.key || undefined}
              onClick={() => tap(f)}
              aria-label={on ? `${f.name}, on the list` : `Add ${f.name}`}
            >
              <span className="pick-emoji" aria-hidden="true">
                {emojiFor(f.name, f.list)}
              </span>
              {f.name}
              {on && <CheckCircle />}
            </button>
          )
        })}
      </div>
    </section>
  )
}
