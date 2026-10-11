import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppContext, type AddOptions, type AppCtx } from '../app-context'
import { addItem, deleteMany, markDone, markDoneMany, moveMany, undoDone, undoDoneMany } from '../data/items'
import { byBoardOrder, createNote, deleteNote, nextColor, notesCol, toNote } from '../data/notes'
import { countdownsCol, toCountdown } from '../data/countdowns'
import { ideasCol, toIdea } from '../data/ideas'
import { mealsCol, toMeal } from '../data/meals'
import { byUse, recipesCol, toRecipe } from '../data/recipes'
import { pingDaysSince, readPingSeen, recentPings, toPing, toPingDay, writePingSeen } from '../data/pings'
import { profilesCol, toProfile } from '../data/profiles'
import { useCollection } from '../hooks/useCollection'
import { useItems } from '../hooks/useItems'
import { notifyItemsAdded, refreshPush } from '../lib/push'
import { useMyPush } from '../data/push'
import { useRoomTheme, type ThemeState } from '../hooks/useTheme'
import { LIST_EMOJI } from '../lib/emoji'
import type { Entry } from '../lib/parse'
import { toISO, WEEK, weekDays } from '../lib/time'
import { isListRoom, LIST_INFO, LISTS, pingInfo } from '../rooms'
import type { Household, Item, ListId, Note, Ping, RoomId } from '../types'
import { ActionSheet } from './ActionSheet'
import { Alert, type AlertAction } from './Alert'
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
import { CountdownSheet } from './us/Countdowns'
import { HeartRain } from './us/HeartRain'
import { HeartsBar } from './us/HeartsBar'
import { HeartsSheet } from './us/HeartsSheet'
import { PingArrival } from './us/PingArrival'
import { MealPlanner } from './us/MealPlanner'
import { MealComposer } from './us/MealComposer'
import { MealSheet } from './us/MealSheet'
import { RecipeSheet } from './us/RecipeSheet'
import { SavedMeals } from './us/SavedMeals'
import { NoteComposer } from './us/NoteComposer'
import { NoteSheet } from './us/NoteSheet'
import { UsRoom } from './us/UsRoom'

/** Ticked items stay in their list (ticked) this long, then move to "Earlier this week". */
const TICKED_FOR = 24 * 60 * 60 * 1000

const byNewest = (a: Item, b: Item) => b.addedAt - a.addedAt
const byDue = (a: Item, b: Item) =>
  a.due && b.due ? a.due.localeCompare(b.due) : a.due ? -1 : b.due ? 1 : byNewest(a, b)
const byDoneNewest = (a: Item, b: Item) => (b.doneAt ?? 0) - (a.doneAt ?? 0)

const FOLD_KEY = 'outof.folded'
function readFolded(): Partial<Record<ListId, boolean>> {
  try {
    return JSON.parse(localStorage.getItem(FOLD_KEY) ?? '{}')
  } catch {
    return {}
  }
}

const plural = (n: number) => (n === 1 ? '1 item' : `${n} items`)

interface AlertData {
  title: string
  message?: string
  actions: AlertAction[]
}

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
  const [alert, setAlert] = useState<AlertData | null>(null)
  const [moveFor, setMoveFor] = useState<Item[] | null>(null)
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [minute, setMinute] = useState(() => Math.floor(Date.now() / 60_000))
  const direction = useRef<'forward' | 'back'>('forward')
  const [openNoteId, setOpenNoteId] = useState<string | null>(null)
  const [rain, setRain] = useState<string | null>(null)
  const endRain = useCallback(() => setRain(null), [])
  const [arrival, setArrival] = useState<Ping | null>(null)
  const endArrival = useCallback(() => setArrival(null), [])

  // Us tab: shared notes and hearts, kept live like the items.
  const notesLive = useCollection(`notes/${hid}`, () => notesCol(hid), toNote)
  const notes = useMemo(() => (notesLive ? [...notesLive].sort(byBoardOrder) : null), [notesLive])
  const pingsLive = useCollection(`pings/${hid}`, () => recentPings(hid), toPing)
  const pings = useMemo(() => pingsLive ?? [], [pingsLive])
  // Hearts counted per day; the last 7 days cover "today" and "this week".
  const weekAgo = toISO(new Date(Date.now() - 6 * 86_400_000))
  const pingDays = useCollection(`pingDays/${hid}/${weekAgo}`, () => pingDaysSince(hid, weekAgo), toPingDay)
  const [heartsOpen, setHeartsOpen] = useState(false)
  const meals = useCollection(`meals/${hid}`, () => mealsCol(hid), toMeal)
  const profiles = useCollection(`profiles/${hid}`, () => profilesCol(hid), toProfile)
  const photos = useMemo(
    () => Object.fromEntries((profiles ?? []).filter((p) => p.photo).map((p) => [p.uid, p.photo!])),
    [profiles],
  )
  const [mealDay, setMealDay] = useState<string | null>(null)
  const recipesLive = useCollection(`recipes/${hid}`, () => recipesCol(hid), toRecipe)
  const recipes = useMemo(() => (recipesLive ? [...recipesLive].sort(byUse) : null), [recipesLive])
  const [recipeId, setRecipeId] = useState<string | null>(null)
  const openRecipe = recipeId ? recipes?.find((r) => r.id === recipeId) : undefined
  const myPush = useMyPush(hid, uid)
  const pushChecked = useRef(false)
  useEffect(() => {
    if (myPush === undefined || pushChecked.current) return
    pushChecked.current = true
    void refreshPush(hid, uid, myPush?.subscription)
  }, [myPush, hid, uid])
  const countdowns = useCollection(`countdowns/${hid}`, () => countdownsCol(hid), toCountdown)
  const ideas = useCollection(`ideas/${hid}`, () => ideasCol(hid), toIdea)
  const [countdownId, setCountdownId] = useState<string | null>(null)
  // Home sections can be folded down to one line; remembered on this phone.
  const [folded, setFolded] = useState(readFolded)
  const toggleFold = (l: ListId) =>
    setFolded((prev) => {
      const next = { ...prev, [l]: !prev[l] }
      try {
        localStorage.setItem(FOLD_KEY, JSON.stringify(next))
      } catch {}
      return next
    })

  // Keep "2m ago" labels fresh, and let ticked items age out of the lists.
  useEffect(() => {
    const t = window.setInterval(() => setMinute(Math.floor(Date.now() / 60_000)), 60_000)
    return () => window.clearInterval(t)
  }, [])

  const toast = useCallback((message: string, undo?: () => void) => {
    setToastData({ id: Date.now(), message, undo })
  }, [])
  const clearToast = useCallback(() => setToastData(null), [])
  const closeAlert = useCallback(() => setAlert(null), [])

  useEffect(() => {
    const onError = (e: Event) => toast((e as CustomEvent<string>).detail)
    window.addEventListener('outof:error', onError)
    return () => window.removeEventListener('outof:error', onError)
  }, [toast])

  const byKey = useMemo(() => new Map(items.map((i) => [i.key, i])), [items])

  const { needed, rows, recent, counts } = useMemo(() => {
    const now = minute * 60_000
    const needed = { grocery: [], important: [] } as Record<ListId, Item[]>
    const ticked = { grocery: [], important: [] } as Record<ListId, Item[]>
    const recent: Item[] = []
    for (const i of items) {
      if (!needed[i.list]) continue
      if (i.status === 'needed') needed[i.list].push(i)
      else if (i.doneAt && now - i.doneAt < TICKED_FOR) ticked[i.list].push(i)
      else if (i.doneAt && now - i.doneAt < WEEK) recent.push(i)
    }
    const rows = {} as Record<ListId, Item[]>
    for (const l of LISTS) {
      needed[l].sort(l === 'important' ? byDue : byNewest)
      rows[l] = [...needed[l], ...ticked[l].sort(byDoneNewest)]
    }
    recent.sort(byDoneNewest)
    const counts = {
      home: needed.grocery.length + needed.important.length,
      grocery: needed.grocery.length,
      important: needed.important.length,
    }
    return { needed, rows, recent, counts }
  }, [items, minute])

  // Everything shown in the list on this screen can be selected.
  const visible = useMemo(
    () => (room === 'home' ? LISTS.flatMap((l) => rows[l]) : isListRoom(room) ? rows[room] : []),
    [room, rows],
  )
  const selectedItems = useMemo(() => visible.filter((i) => selected.has(i.id)), [visible, selected])

  const stopSelect = useCallback(() => {
    setSelecting(false)
    setSelected(new Set())
  }, [])
  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])
  const allSelected = visible.length > 0 && selectedItems.length === visible.length
  const selectAll = () => setSelected(allSelected ? new Set() : new Set(visible.map((i) => i.id)))

  // Nothing left to select (e.g. the other phone cleared the list): leave select mode.
  useEffect(() => {
    if (selecting && visible.length === 0) stopSelect()
  }, [selecting, visible.length, stopSelect])

  const goTo = useCallback(
    (r: RoomId) => {
      stopSelect()
      direction.current = r === 'home' ? 'back' : 'forward'
      setRoom(r)
      window.scrollTo({ top: 0 })
    },
    [setRoom, stopSelect],
  )

  const confirmDelete = useCallback(
    (list: Item[], after?: () => void) => {
      const one = list.length === 1
      setAlert({
        title: one ? `Delete ${list[0].name}?` : `Delete ${plural(list.length)}?`,
        message: one
          ? 'It’ll be removed from the list on every phone.'
          : 'They’ll be removed from the list on every phone.',
        actions: [
          { label: 'Cancel', style: 'cancel' },
          {
            label: 'Delete',
            style: 'destructive',
            onSelect: () => {
              deleteMany(hid, list)
              toast(one ? `Deleted ${list[0].name}` : `Deleted ${plural(list.length)}`)
              after?.()
            },
          },
        ],
      })
    },
    [hid, toast],
  )

  const ctx = useMemo<AppCtx>(() => {
    const add = (entries: (string | Entry)[], opts: AddOptions) => {
      const added: string[] = []
      const addedTo: ListId[] = []
      const already: string[] = []
      for (const e of entries) {
        const { name, qty } = typeof e === 'string' ? { name: e, qty: undefined } : e
        const existing = byKey.get(name.toLocaleLowerCase())
        if (existing?.status === 'needed' && !opts.photo) {
          already.push(existing.name)
          continue
        }
        const list = opts.list ?? existing?.list ?? opts.fallback ?? 'grocery'
        addItem(hid, uid, name, list, existing, opts.photo, qty)
        addedTo.push(list)
        added.push((existing?.name ?? name) + (qty && qty > 1 ? ` ×${qty}` : ''))
      }
      notifyItemsAdded(hid, household.memberNames[uid] ?? 'Someone', added, addedTo[0] ?? 'home')
      const parts: string[] = []
      if (added.length === 1) parts.push(`Added ${added[0]}`)
      else if (added.length > 1) parts.push(`Added ${added.length} items`)
      if (already.length)
        parts.push(`${already.join(', ')} ${already.length === 1 ? 'is' : 'are'} already on the list`)
      if (parts.length) toast(parts.join('. '))
    }
    const done = (item: Item) => markDone(hid, uid, item)
    const askUntick = (item: Item) =>
      setAlert({
        title: `Put ${item.name} back on the list?`,
        message: 'It’ll show as still needed again.',
        actions: [
          { label: 'Cancel', style: 'cancel' },
          { label: 'Put back', onSelect: () => undoDone(hid, item) },
        ],
      })
    return {
      uid,
      household,
      photos,
      items,
      byKey,
      add,
      done,
      askUntick,
      openItem: setOpenId,
      goTo,
      toast,
      selecting,
      selected,
      toggleSelect,
      askDelete: (item: Item) => confirmDelete([item]),
    }
  }, [hid, uid, household, photos, items, byKey, goTo, toast, selecting, selected, toggleSelect, confirmDelete])

  // A heart from someone else that this phone hasn't celebrated yet: shower + banner, once.
  useEffect(() => {
    const incoming = pings.find((p) => p.from !== uid)
    if (!incoming) return
    const seen = readPingSeen(uid)
    if (incoming.createdAt <= seen) return
    writePingSeen(uid, incoming.createdAt)
    if (Date.now() - incoming.createdAt > 3 * 24 * 60 * 60 * 1000) return
    setRain(pingInfo(incoming.kind).emoji)
    setArrival(incoming)
  }, [pings, uid])

  const askDeleteNote = (note: Note) =>
    setAlert({
      title: 'Delete this note?',
      message: 'It’ll be removed for everyone on the list.',
      actions: [
        { label: 'Cancel', style: 'cancel' },
        {
          label: 'Delete',
          style: 'destructive',
          onSelect: () => {
            setOpenNoteId(null)
            deleteNote(hid, note.id)
            toast('Note deleted')
          },
        },
      ],
    })
  const newNote = () => setOpenNoteId(createNote(hid, uid, { color: nextColor(notes ?? []) }))
  const openNote = openNoteId && notes ? notes.find((n) => n.id === openNoteId) : undefined

  const gotSelected = () => {
    const sel = selectedItems.filter((i) => i.status === 'needed')
    if (sel.length) {
      markDoneMany(hid, uid, sel)
      toast(`Got ${plural(sel.length)}`, () => undoDoneMany(hid, sel))
    }
    stopSelect()
  }

  const openItem = openId ? items.find((i) => i.id === openId) : undefined
  const thisWeek = weekDays(0)
  const headerCount =
    room === 'us'
      ? (notes?.length ?? 0)
      : room === 'meals'
        ? (meals ?? []).filter((m) => m.name && thisWeek.includes(m.day)).length
        : counts[room]

  const listLabel = (
    <h2 className="group-label list-label">
      <span>On the list</span>
      {visible.length > 0 && (
        <button
          className="select-toggle"
          aria-pressed={selecting}
          onClick={() => (selecting ? stopSelect() : setSelecting(true))}
        >
          {selecting ? 'Unselect' : 'Select'}
        </button>
      )}
    </h2>
  )

  return (
    <AppContext.Provider value={ctx}>
      <main className="page" key={room} data-dir={direction.current}>
        <Header room={room} count={headerCount} onSettings={() => setSettings(true)} />

        {room === 'us' ? (
          <UsRoom
            notes={notes}
            onOpenNote={setOpenNoteId}
            onNewNote={newNote}
            onAskDeleteNote={askDeleteNote}
            countdowns={countdowns}
            ideas={ideas}
            onOpenCountdown={setCountdownId}
          />
        ) : room === 'meals' ? (
          <>
            <MealPlanner meals={meals} onOpenDay={setMealDay} />
            <SavedMeals recipes={recipes} onOpen={setRecipeId} />
          </>
        ) : room === 'home' ? (
          <>
            <ListCards needed={needed} meals={meals} notes={notes} countdowns={countdowns} />
            {!selecting && <HeartsBar pings={pings} days={pingDays} onOpen={() => setHeartsOpen(true)} />}
            {loaded === null ? null : visible.length === 0 ? (
              <EmptyArt
                emojis={['🥛', '🧻', '📌']}
                title="Nothing’s running low"
                text="Tap something below or type it in when it runs out."
              />
            ) : (
              <>
                {listLabel}
                {LISTS.filter((l) => rows[l].length).map((l) => {
                  const isFolded = !!folded[l] && !selecting
                  return (
                    <section key={l} data-list={l}>
                      {isFolded ? (
                        <FoldedCard
                          label={LIST_INFO[l].label}
                          items={needed[l]}
                          ticked={rows[l].length - needed[l].length}
                          onOpen={() => toggleFold(l)}
                        />
                      ) : (
                        <>
                          <button className="section-head" aria-expanded="true" onClick={() => toggleFold(l)}>
                            {LIST_INFO[l].label}
                            <span className="section-count">{needed[l].length}</span>
                            <ChevronRight />
                          </button>
                          <div className="group">
                            {rows[l].map((i) => (
                              <ItemRow key={i.id} item={i} />
                            ))}
                          </div>
                        </>
                      )}
                    </section>
                  )
                })}
              </>
            )}
            {/* On Home, quick add is for getting started; it goes once something is on the list. */}
            {!selecting && counts.home === 0 && <QuickPicks room="home" />}
          </>
        ) : (
          <div data-list={room}>
            {!selecting && <QuickPicks room={room} neededCount={needed[room].length} />}
            {listLabel}
            {loaded === null ? null : rows[room].length ? (
              <div className="group">
                {rows[room].map((i) => (
                  <ItemRow key={i.id} item={i} />
                ))}
              </div>
            ) : (
              <EmptyArt
                emojis={[LIST_EMOJI[room]]}
                title={room === 'grocery' ? 'All stocked up' : 'All sorted'}
                text={LIST_INFO[room].empty}
              />
            )}
          </div>
        )}

        {loaded !== null && !selecting && isListRoom(room) && (
          <Recent items={room === 'home' ? recent : recent.filter((i) => i.list === room)} />
        )}
      </main>

      <div className="dock">
        <Toast toast={toastData} onDone={clearToast} />
        {selecting ? (
          <div className="select-bar">
            <button onClick={stopSelect}>Cancel</button>
            <button onClick={selectAll}>{allSelected ? 'Select none' : 'Select all'}</button>
            <button disabled={!selectedItems.some((i) => i.status === 'needed')} onClick={gotSelected}>
              Got it
            </button>
            <button disabled={!selectedItems.length} onClick={() => setMoveFor(selectedItems)}>
              Move
            </button>
            <button
              className="select-bar-danger"
              disabled={!selectedItems.length}
              onClick={() => confirmDelete(selectedItems, stopSelect)}
            >
              Delete
            </button>
          </div>
        ) : (
          <>
            <div className="toolbar">
              {room === 'us' ? (
                <NoteComposer notes={notes ?? []} />
              ) : room === 'meals' ? (
                <MealComposer recipes={recipes ?? []} />
              ) : (
                <QuickAdd room={room} />
              )}
            </div>
            <TabBar room={room} counts={counts} onChange={goTo} />
          </>
        )}
      </div>

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
      {alert && <Alert {...alert} onClose={closeAlert} />}
      {openNote && (
        <NoteSheet
          key={openNote.id}
          note={openNote}
          onClose={() => setOpenNoteId(null)}
          onAskDelete={() => askDeleteNote(openNote)}
        />
      )}
      {mealDay && (
        <MealSheet
          key={mealDay}
          day={mealDay}
          meal={meals?.find((m) => m.day === mealDay)}
          recipes={recipes ?? []}
          onClose={() => setMealDay(null)}
        />
      )}
      {openRecipe && (
        <RecipeSheet key={openRecipe.id} recipe={openRecipe} meals={meals} onClose={() => setRecipeId(null)} />
      )}
      {countdownId && (
        <CountdownSheet
          key={countdownId}
          countdown={countdowns?.find((c) => c.id === countdownId)}
          onClose={() => setCountdownId(null)}
        />
      )}
      {heartsOpen && <HeartsSheet pings={pings} days={pingDays} onClose={() => setHeartsOpen(false)} />}
      {rain && <HeartRain emoji={rain} onDone={endRain} />}
      {arrival && <PingArrival key={arrival.id} ping={arrival} onDone={endArrival} />}
      {openItem && <ItemSheet key={openItem.id} item={openItem} onClose={() => setOpenId(null)} />}
      {settings && <SettingsSheet theme={theme} onClose={() => setSettings(false)} />}
    </AppContext.Provider>
  )
}

/** A folded Home section: its heading, with the first few items still needed underneath. */
function FoldedCard({
  label,
  items,
  ticked,
  onOpen,
}: {
  label: string
  items: Item[]
  ticked: number
  onOpen: () => void
}) {
  const SHOW = 3
  const names = items.slice(0, SHOW).map((i) => `${i.name} ×${i.qty ?? 1}`)
  const more = items.length - names.length
  // Same heading as an open section (keeps the list's identity), with the names as its subtitle.
  return (
    <button className="folded-head" aria-expanded="false" onClick={onOpen}>
      <span className="folded-row">
        <span className="folded-title">{label}</span>
        <span className="section-count">{items.length}</span>
        <span className="folded-show">
          Show all
          <ChevronRight />
        </span>
      </span>
      <span className="folded-names">
        {names.length ? (
          <>
            {names.join(', ')}
            {more > 0 && <span className="folded-more"> +{more} more</span>}
          </>
        ) : (
          <span className="folded-more">All got · {plural(ticked)} ticked</span>
        )}
      </span>
    </button>
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

function Recent({ items }: { items: Item[] }) {
  const [open, setOpen] = useState(false)
  if (!items.length) return null
  return (
    <section>
      <h2 className="group-label">
        <span>Earlier this week · {items.length}</span>
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
