export type ListId = 'grocery' | 'household' | 'important'
export type RoomId = 'home' | ListId
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
}
