import { useMemo, useState } from 'react'
import { useApp } from '../app-context'
import { emojiFor } from '../lib/emoji'
import { ROOM_LISTS, singleList } from '../rooms'
import { frequentFor, type Frequent } from '../starters'
import type { ListId, ListRoom } from '../types'
import { CheckCircle, ChevronRight } from './Icons'

type Pick = Frequent & { list: ListId }

/**
 * One-tap shortcuts for the things that run out most. On Home: a few from every list.
 * On a list tab it folds away once something is on that list (open while it's empty);
 * tapping the heading overrides that until you switch tabs.
 */
export function QuickPicks({ room, neededCount = 0 }: { room: ListRoom; neededCount?: number }) {
  const { items, byKey, add, toast } = useApp()
  const foldable = room !== 'home'
  const [manual, setManual] = useState<boolean | null>(null)
  const open = !foldable || (manual ?? neededCount === 0)
  const picks = useMemo<Pick[]>(
    () =>
      room === 'home'
        ? ROOM_LISTS.home.flatMap((l) =>
            frequentFor(l, items, byKey, 6)
              .filter((f) => f.item?.status !== 'needed')
              .slice(0, 3)
              .map((f) => ({ ...f, list: l })),
          )
        : singleList(room)
          ? frequentFor(singleList(room)!, items, byKey, 8).map((f) => ({ ...f, list: singleList(room)! }))
          : ROOM_LISTS[room].flatMap((l) => frequentFor(l, items, byKey, 5).map((f) => ({ ...f, list: l }))),
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
      {foldable ? (
        <h2 className="group-label">
          <button className="fold-toggle" aria-expanded={open} onClick={() => setManual(!open)}>
            <span>Quick add</span>
            <span className="fold-toggle-action">
              {open ? 'Hide' : 'Show'}
              <ChevronRight />
            </span>
          </button>
        </h2>
      ) : (
        <h2 className="group-label">Quick add</h2>
      )}
      {open && (
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
      )}
    </section>
  )
}
