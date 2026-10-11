import { createContext, useContext } from 'react'
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
  add: (names: string[], opts: AddOptions) => void
  done: (item: Item) => void
  openItem: (id: string) => void
  goTo: (room: RoomId) => void
  toast: (message: string, undo?: () => void) => void
}

export const AppContext = createContext<AppCtx | null>(null)

export function useApp(): AppCtx {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp outside AppContext')
  return ctx
}

export function memberOf(h: Household, uid: string, me: string) {
  const idx = Math.max(0, h.members.indexOf(uid))
  const name = uid === me ? 'You' : (h.memberNames[uid] ?? 'Partner')
  return { idx, name }
}

export function initials(name: string) {
  return name.trim().charAt(0).toLocaleUpperCase() || '?'
}
