import { useCallback, useEffect, useMemo, useState } from 'react'
import { AppContext, type AddOptions, type AppCtx } from '../app-context'
import { addItem, markDone, undoDone } from '../data/items'
import { useItems } from '../hooks/useItems'
import { useRoomTheme, type ThemeState } from '../hooks/useTheme'
import { WEEK } from '../lib/time'
import { LISTS, ROOMS } from '../rooms'
import type { Household, Item, ListId, RoomId } from '../types'
import { Backdrop } from './Backdrop'
import { FrequentItems } from './FrequentItems'
import { ChevronIcon } from './Icons'
import { ItemRow, RecentRow } from './ItemRow'
import { ItemSheet } from './ItemSheet'
import { QuickAdd } from './QuickAdd'
import { RoomHeader } from './RoomHeader'
import { RoomTiles } from './RoomTiles'
import { SettingsSheet } from './SettingsSheet'
import { TabBar } from './TabBar'
import { Toast, type ToastData } from './Toast'

const DONE_VERB: Record<ListId, string> = {
  grocery: 'Bought',
  household: 'Restocked',
  important: 'Sorted',
}

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
      else if (added.length > 1) parts.push(`Added ${added.length} things`)
      if (already.length)
        parts.push(`${already.join(', ')} ${already.length === 1 ? 'is' : 'are'} already on the list`)
      if (parts.length) toast(parts.join('. '))
    }
    const done = (item: Item) => {
      markDone(hid, uid, item)
      toast(`${DONE_VERB[item.list]} ${item.name}`, () => undoDone(hid, item))
    }
    return { uid, household, items, byKey, add, done, openItem: setOpenId, goTo, toast }
  }, [hid, uid, household, items, byKey, goTo, toast])

  const openItem = openId ? items.find((i) => i.id === openId) : undefined

  return (
    <AppContext.Provider value={ctx}>
      <Backdrop room={room} />
      <main className="page" key={room}>
        <RoomHeader room={room} count={counts[room]} onSettings={() => setSettings(true)} />
        {loaded === null ? null : room === 'home' ? (
          <>
            <RoomTiles counts={counts} />
            {counts.home === 0 ? (
              <p className="empty">{ROOMS.home.empty}</p>
            ) : (
              LISTS.filter((l) => needed[l].length).map((l) => (
                <section key={l} className="group">
                  <button className="group-head" data-palette={l} onClick={() => goTo(l)}>
                    <i className="swatch" />
                    {ROOMS[l].label}
                    <span className="group-count">{needed[l].length}</span>
                  </button>
                  <div className="plain-list">
                    {needed[l].map((i) => (
                      <ItemRow key={i.id} item={i} />
                    ))}
                  </div>
                </section>
              ))
            )}
            <Recent items={recent} title={ROOMS.home.recent} />
          </>
        ) : (
          <>
            <FrequentItems list={room} />
            <ListBody list={room} items={needed[room]} />
            <Recent items={recent.filter((i) => i.list === room)} title={ROOMS[room].recent} />
          </>
        )}
      </main>

      <div className="dock">
        <Toast toast={toastData} onDone={clearToast} />
        <QuickAdd room={room} />
        <TabBar room={room} counts={counts} onChange={goTo} />
      </div>

      {openItem && <ItemSheet key={openItem.id} item={openItem} onClose={() => setOpenId(null)} />}
      {settings && <SettingsSheet theme={theme} onClose={() => setSettings(false)} />}
    </AppContext.Provider>
  )
}

function ListBody({ list, items }: { list: ListId; items: Item[] }) {
  const rows = items.map((i) => <ItemRow key={i.id} item={i} variant={list === 'important' ? 'card' : 'row'} />)
  const empty = <p className="empty">{ROOMS[list].empty}</p>

  if (list === 'grocery') {
    return (
      <div className="notepad">
        <span className="notepad-magnet" aria-hidden />
        {items.length ? rows : empty}
      </div>
    )
  }
  return <div className={`list list--${list}`}>{items.length ? rows : empty}</div>
}

function Recent({ items, title }: { items: Item[]; title: string }) {
  const [open, setOpen] = useState(false)
  if (!items.length) return null
  return (
    <section className="recent">
      <button className="recent-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {title}
        <span className="recent-count">{items.length}</span>
        <ChevronIcon open={open} />
      </button>
      {open && (
        <div className="recent-list">
          {items.map((i) => (
            <RecentRow key={i.id} item={i} />
          ))}
        </div>
      )}
    </section>
  )
}
