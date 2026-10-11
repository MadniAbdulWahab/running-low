import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppContext, type AddOptions, type AppCtx } from '../app-context'
import { addItem, markDone, undoDone } from '../data/items'
import { useItems } from '../hooks/useItems'
import { useRoomTheme, type ThemeState } from '../hooks/useTheme'
import { LIST_EMOJI, stickersFor } from '../lib/emoji'
import { WEEK } from '../lib/time'
import { LIST_INFO, LISTS } from '../rooms'
import type { Household, Item, ListId, RoomId } from '../types'
import { Header } from './Header'
import { ChevronRight } from './Icons'
import { ItemRow, RecentRow } from './ItemRow'
import { ItemSheet } from './ItemSheet'
import { ListCards } from './ListCards'
import { QuickAdd } from './QuickAdd'
import { QuickPicks } from './QuickPicks'
import { SettingsSheet } from './SettingsSheet'
import { Stickers } from './Stickers'
import { TabBar } from './TabBar'
import { Toast, type ToastData } from './Toast'

const byNewest = (a: Item, b: Item) => b.addedAt - a.addedAt
const byDue = (a: Item, b: Item) =>
  a.due && b.due ? a.due.localeCompare(b.due) : a.due ? -1 : b.due ? 1 : byNewest(a, b)

interface Props {
  uid: string
  household: Household
  room: RoomId
  setRoom: (r: RoomId) => void
  theme: ThemeState
}

export function RoomShell({ uid, household, room, setRoom, theme }: Props) {
  useRoomTheme(room, theme.mode)
  const hid = household.id
  const loaded = useItems(hid)
  const items = useMemo(() => loaded ?? [], [loaded])
  const [openId, setOpenId] = useState<string | null>(null)
  const [settings, setSettings] = useState(false)
  const [toastData, setToastData] = useState<ToastData | null>(null)
  const [, setTick] = useState(0)
  const direction = useRef<'forward' | 'back'>('forward')

  // Keep "2m ago" labels fresh.
  useEffect(() => {
    const t = window.setInterval(() => setTick((n) => n + 1), 60_000)
    return () => window.clearInterval(t)
  }, [])

  const toast = useCallback((message: string, undo?: () => void) => {
    setToastData({ id: Date.now(), message, undo })
  }, [])
  const clearToast = useCallback(() => setToastData(null), [])

  useEffect(() => {
    const onError = (e: Event) => toast((e as CustomEvent<string>).detail)
    window.addEventListener('outof:error', onError)
    return () => window.removeEventListener('outof:error', onError)
  }, [toast])

  const byKey = useMemo(() => new Map(items.map((i) => [i.key, i])), [items])

  const { needed, recent, counts } = useMemo(() => {
    const cutoff = Date.now() - WEEK
    const needed = { grocery: [], household: [], important: [] } as Record<ListId, Item[]>
    const recent: Item[] = []
    for (const i of items) {
      if (i.status === 'needed') needed[i.list]?.push(i)
      else if (i.doneAt && i.doneAt > cutoff) recent.push(i)
    }
    needed.grocery.sort(byNewest)
    needed.household.sort(byNewest)
    needed.important.sort(byDue)
    recent.sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0))
    const counts = {
      home: needed.grocery.length + needed.household.length + needed.important.length,
      grocery: needed.grocery.length,
      household: needed.household.length,
      important: needed.important.length,
    }
    return { needed, recent, counts }
  }, [items])

  const goTo = useCallback(
    (r: RoomId) => {
      direction.current = r === 'home' ? 'back' : 'forward'
      setRoom(r)
      window.scrollTo({ top: 0 })
    },
    [setRoom],
  )

  const ctx = useMemo<AppCtx>(() => {
    const add = (names: string[], opts: AddOptions) => {
      const added: string[] = []
      const already: string[] = []
      for (const name of names) {
        const existing = byKey.get(name.toLocaleLowerCase())
        if (existing?.status === 'needed' && !opts.photo) {
          already.push(existing.name)
          continue
        }
        const list = opts.list ?? existing?.list ?? opts.fallback ?? 'grocery'
        addItem(hid, uid, name, list, existing, opts.photo)
        added.push(existing?.name ?? name)
      }
      const parts: string[] = []
      if (added.length === 1) parts.push(`Added ${added[0]}`)
      else if (added.length > 1) parts.push(`Added ${added.length} items`)
      if (already.length)
        parts.push(`${already.join(', ')} ${already.length === 1 ? 'is' : 'are'} already on the list`)
      if (parts.length) toast(parts.join('. '))
    }
    const done = (item: Item) => {
      markDone(hid, uid, item)
      toast(`${LIST_INFO[item.list].doneVerb} ${item.name}`, () => undoDone(hid, item))
    }
    return { uid, household, items, byKey, add, done, openItem: setOpenId, goTo, toast }
  }, [hid, uid, household, items, byKey, goTo, toast])

  const openItem = openId ? items.find((i) => i.id === openId) : undefined
  const roomRecent = room === 'home' ? recent : recent.filter((i) => i.list === room)
  const stickers = useMemo(() => stickersFor(room, items), [room, items])

  return (
    <AppContext.Provider value={ctx}>
      <Stickers room={room} emojis={stickers} />
      <main className="page" key={room} data-dir={direction.current}>
        <Header room={room} count={counts[room]} onSettings={() => setSettings(true)} />

        {room === 'home' ? (
          <>
            <ListCards needed={needed} />
            {loaded === null ? null : counts.home === 0 ? (
              <EmptyArt
                emojis={['🥛', '🧻', '📌']}
                title="Nothing’s running low"
                text="Tap something below or type it in when it runs out."
              />
            ) : (
              LISTS.filter((l) => needed[l].length).map((l) => (
                <section key={l} data-list={l}>
                  <button className="section-head" onClick={() => goTo(l)}>
                    {LIST_INFO[l].label}
                    <ChevronRight />
                  </button>
                  <div className="group">
                    {needed[l].map((i) => (
                      <ItemRow key={i.id} item={i} />
                    ))}
                  </div>
                </section>
              ))
            )}
            <QuickPicks room="home" />
          </>
        ) : (
          <div data-list={room}>
            <QuickPicks room={room} />
            <h2 className="group-label">On the list</h2>
            {loaded === null ? null : needed[room].length ? (
              <div className="group">
                {needed[room].map((i) => (
                  <ItemRow key={i.id} item={i} />
                ))}
              </div>
            ) : (
              <EmptyArt
                emojis={[LIST_EMOJI[room]]}
                title="All stocked up"
                text={LIST_INFO[room].empty}
              />
            )}
          </div>
        )}

        {loaded !== null && (
          <Recent items={roomRecent} title={room === 'home' ? 'Recently bought' : LIST_INFO[room].recent} />
        )}
      </main>

      <div className="dock">
        <Toast toast={toastData} onDone={clearToast} />
        <div className="toolbar">
          <QuickAdd room={room} />
        </div>
        <TabBar room={room} counts={counts} onChange={goTo} />
      </div>

      {openItem && <ItemSheet key={openItem.id} item={openItem} onClose={() => setOpenId(null)} />}
      {settings && <SettingsSheet theme={theme} onClose={() => setSettings(false)} />}
    </AppContext.Provider>
  )
}

function EmptyArt({ emojis, title, text }: { emojis: string[]; title: string; text: string }) {
  return (
    <div className="empty empty--card">
      <span className="empty-art" aria-hidden="true">
        {emojis.map((e, i) => (
          <span key={i} className="sticker sticker--inline">
            {e}
          </span>
        ))}
      </span>
      <strong>{title}</strong>
      {text}
    </div>
  )
}

function Recent({ items, title }: { items: Item[]; title: string }) {
  const [open, setOpen] = useState(false)
  if (!items.length) return null
  return (
    <section>
      <h2 className="group-label">
        <span>
          {title} · {items.length}
        </span>
        <button className="recent-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          {open ? 'Hide' : 'Show'}
        </button>
      </h2>
      {open && (
        <div className="group">
          {items.map((i) => (
            <RecentRow key={i.id} item={i} />
          ))}
        </div>
      )}
    </section>
  )
}
