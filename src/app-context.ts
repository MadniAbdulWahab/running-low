import { createContext, useContext } from 'react'
import type { Entry } from './lib/parse'
import type { Household, Item, ListId, RoomId } from './types'

export interface AddOptions {
  /** Force every item into this list. */
  list?: ListId
  /** List for items we've never seen before (when `list` isn't forced). */
  fallback?: ListId
  photo?: string
}

export interface AppCtx {
  uid: string
  household: Household
  items: Item[]
  byKey: Map<string, Item>
  /** Names, or { name, qty } from "2 milk"-style input. */
  add: (entries: (string | Entry)[], opts: AddOptions) => void
  /** Tick an item off (it stays in the list, ticked). */
  done: (item: Item) => void
  /** Untick, after asking. */
  askUntick: (item: Item) => void
  openItem: (id: string) => void
  goTo: (room: RoomId) => void
  toast: (message: string, undo?: () => void) => void
  /** Multi-select mode: rows show selection circles and tapping toggles them. */
  selecting: boolean
  selected: Set<string>
  toggleSelect: (id: string) => void
  /** Press and hold: asks to delete the item. */
  askDelete: (item: Item) => void
}

export const AppContext = createContext<AppCtx | null>(null)

export function useApp(): AppCtx {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp outside AppContext')
  return ctx
}

export function memberOf(h: Household, uid: string, me: string) {
  const idx = Math.max(0, h.members.indexOf(uid))
  const name = uid === me ? 'You' : (h.memberNames[uid] ?? 'Someone')
  return { idx, name }
}

export function initials(name: string) {
  return name.trim().charAt(0).toLocaleUpperCase() || '?'
}
