import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppContext, type AddOptions, type AppCtx } from '../app-context'
import { addItem, deleteMany, markDone, markDoneMany, moveItem, moveMany, undoDone, undoDoneMany } from '../data/items'
import { useItems } from '../hooks/useItems'
import { useRoomTheme, type ThemeState } from '../hooks/useTheme'
import { LIST_EMOJI } from '../lib/emoji'
import { WEEK } from '../lib/time'
import { LIST_INFO, LISTS } from '../rooms'
import type { Household, Item, ListId, RoomId } from '../types'
import { ActionSheet, type SheetAction } from './ActionSheet'
import { Header } from './Header'
import { ChevronRight } from './Icons'
import { ItemRow, RecentRow } from './ItemRow'
import { ItemSheet } from './ItemSheet'
import { ListCards } from './ListCards'
import { QuickAdd } from './QuickAdd'
import { QuickPicks } from './QuickPicks'
import { SettingsSheet } from './SettingsSheet'
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
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [menuItem, setMenuItem] = useState<Item | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Item[] | null>(null)
  const [moveFor, setMoveFor] = useState<Item[] | null>(null)

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

  // Only items needed on the current screen can be selected.
  const selectable = useMemo(
    () => (room === 'home' ? [...needed.grocery, ...needed.household, ...needed.important] : needed[room]),
    [room, needed],
  )
  const selectedItems = useMemo(() => selectable.filter((i) => selected.has(i.id)), [selectable, selected])

  const stopSelect = useCallback(() => {
    setSelecting(false)
    setSelected(new Set())
  }, [])
  const startSelect = useCallback((id?: string) => {
    setSelecting(true)
    setSelected(new Set(id ? [id] : []))
  }, [])
  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])
  const selectAll = () =>
    setSelected(selectedItems.length === selectable.length ? new Set() : new Set(selectable.map((i) => i.id)))

  // Nothing left to select (e.g. the other phone cleared the list): leave select mode.
  useEffect(() => {
    if (selecting && selectable.length === 0) stopSelect()
  }, [selecting, selectable.length, stopSelect])

  const goTo = useCallback(
    (r: RoomId) => {
      stopSelect()
      direction.current = r === 'home' ? 'back' : 'forward'
      setRoom(r)
      window.scrollTo({ top: 0 })
    },
    [setRoom, stopSelect],
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
    return {
      uid,
      household,
      items,
      byKey,
      add,
      done,
      openItem: setOpenId,
      goTo,
      toast,
      selecting,
      selected,
      toggleSelect,
      startSelect,
      openMenu: setMenuItem,
    }
  }, [hid, uid, household, items, byKey, goTo, toast, selecting, selected, toggleSelect, startSelect])

  const plural = (n: number) => (n === 1 ? '1 item' : `${n} items`)

  const gotSelected = () => {
    const sel = selectedItems
    markDoneMany(hid, uid, sel)
    toast(`Got ${plural(sel.length)}`, () => undoDoneMany(hid, sel))
    stopSelect()
  }

  const menuActions = (item: Item): SheetAction[] => [
    { label: 'Mark as got', onSelect: () => ctx.done(item) },
    { label: 'Details & note…', onSelect: () => setOpenId(item.id) },
    { label: 'Select', onSelect: () => startSelect(item.id) },
    ...LISTS.filter((l) => l !== item.list).map((l) => ({
      label: `Move to ${LIST_INFO[l].label}`,
      onSelect: () => {
        moveItem(hid, item, l)
        toast(`Moved ${item.name} to ${LIST_INFO[l].label}`)
      },
    })),
    { label: 'Delete', destructive: true, onSelect: () => setConfirmDelete([item]) },
  ]

  const openItem = openId ? items.find((i) => i.id === openId) : undefined
  const roomRecent = room === 'home' ? recent : recent.filter((i) => i.list === room)

  return (
    <AppContext.Provider value={ctx}>
      <main className="page" key={room} data-dir={direction.current}>
        <Header
          room={room}
          count={counts[room]}
          onSettings={() => setSettings(true)}
          selectable={selectable.map((i) => i.id)}
          onSelectAll={selectAll}
          onDoneSelecting={stopSelect}
        />

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
        {selecting ? (
          <div className="select-bar">
            <button disabled={!selectedItems.length} onClick={gotSelected}>
              Got it
            </button>
            <button disabled={!selectedItems.length} onClick={() => setMoveFor(selectedItems)}>
              Move
            </button>
            <button
              className="select-bar-danger"
              disabled={!selectedItems.length}
              onClick={() => setConfirmDelete(selectedItems)}
            >
              Delete
            </button>
          </div>
        ) : (
          <>
            <div className="toolbar">
              <QuickAdd room={room} />
            </div>
            <TabBar room={room} counts={counts} onChange={goTo} />
          </>
        )}
      </div>

      {menuItem && (
        <ActionSheet title={menuItem.name} actions={menuActions(menuItem)} onClose={() => setMenuItem(null)} />
      )}
      {moveFor && (
        <ActionSheet
          title={`Move ${plural(moveFor.length)} to…`}
          actions={LISTS.map((l) => ({
            label: LIST_INFO[l].label,
            onSelect: () => {
              moveMany(hid, moveFor, l)
              toast(`Moved ${plural(moveFor.length)} to ${LIST_INFO[l].label}`)
              stopSelect()
            },
          }))}
          onClose={() => setMoveFor(null)}
        />
      )}
      {confirmDelete && (
        <ActionSheet
          title={confirmDelete.length === 1 ? `Delete ${confirmDelete[0].name}?` : `Delete ${plural(confirmDelete.length)}?`}
          message="This can’t be undone."
          actions={[
            {
              label: confirmDelete.length === 1 ? 'Delete item' : `Delete ${plural(confirmDelete.length)}`,
              destructive: true,
              onSelect: () => {
                deleteMany(hid, confirmDelete)
                toast(confirmDelete.length === 1 ? `Deleted ${confirmDelete[0].name}` : `Deleted ${plural(confirmDelete.length)}`)
                stopSelect()
              },
            },
          ]}
          onClose={() => setConfirmDelete(null)}
        />
      )}

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
