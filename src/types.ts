export type ListId = 'grocery' | 'household' | 'important'
/** Tabs that show items: Home (everything), Shopping (Grocery + Household) and Important. */
export type ListRoom = 'home' | 'shopping' | 'important'
export type RoomId = ListRoom | 'meals' | 'us'
export type ThemePref = 'system' | 'light' | 'dark'
export type Mode = 'light' | 'dark'

export interface Household {
  id: string
  name: string
  members: string[]
  memberNames: Record<string, string>
}

export interface Item {
  id: string
  name: string
  key: string
  list: ListId
  status: 'needed' | 'done'
  addedBy: string
  addedAt: number
  doneBy: string | null
  doneAt: number | null
  count: number
  lastUsed: number
  photoId: string | null
  due: string | null
  note: string | null
  /** How many are needed; null means just one / not specified. */
  qty: number | null
}

export type NoteColor = 'peach' | 'mint' | 'sky' | 'lilac' | 'lemon' | 'rose'

export interface ChecklistEntry {
  t: string
  done: boolean
}

export interface Note {
  id: string
  text: string
  color: NoteColor
  pinned: boolean
  checklist: ChecklistEntry[]
  createdBy: string
  createdAt: number
  updatedBy: string
  updatedAt: number
}

export type PingKind = 'heart' | 'hug' | 'kiss' | 'coffee'

export interface Ping {
  id: string
  from: string
  kind: PingKind
  createdAt: number
}
