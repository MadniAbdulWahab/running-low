import type { ListId, ListRoom, NoteColor, PingKind, RoomId } from './types'

export interface ListInfo {
  id: ListId
  label: string
  count: (n: number) => string
  empty: string
  recent: string
  doneVerb: string
}

export const LIST_INFO: Record<ListId, ListInfo> = {
  grocery: {
    id: 'grocery',
    label: 'Groceries',
    count: (n) => (n ? `${n} to pick up` : 'Nothing to pick up'),
    empty: 'Food, toiletries, cleaning bits: tap Quick add or type below when something runs out.',
    recent: 'Recently bought',
    doneVerb: 'Bought',
  },
  important: {
    id: 'important',
    label: 'Important',
    count: (n) => (n ? `${n} to sort out` : 'Nothing to sort out'),
    empty: 'Renewals, refills and anything with a deadline go here.',
    recent: 'Recently sorted',
    doneVerb: 'Sorted',
  },
}

export const LISTS: ListId[] = ['grocery', 'important']
export const ROOM_ORDER: RoomId[] = ['home', 'grocery', 'important', 'meals', 'us']

export const ROOM_LABEL: Record<RoomId, string> = {
  home: 'Home',
  grocery: 'Groceries',
  important: 'Important',
  meals: 'Meals',
  us: 'Us',
}

export const isListRoom = (r: RoomId): r is ListRoom => r === 'home' || r === 'grocery' || r === 'important'

/** The list a tab shows; Home shows them all. */
export const singleList = (r: ListRoom): ListId | null => (r === 'home' ? null : r)

export const NOTE_COLORS: NoteColor[] = ['peach', 'mint', 'sky', 'lilac', 'lemon', 'rose']

export const PINGS: { kind: PingKind; emoji: string; label: string; verb: string }[] = [
  { kind: 'heart', emoji: '❤️', label: 'Heart', verb: 'sent a heart' },
  { kind: 'hug', emoji: '🤗', label: 'Hug', verb: 'sent a hug' },
  { kind: 'kiss', emoji: '😘', label: 'Kiss', verb: 'sent a kiss' },
  { kind: 'miss', emoji: '🥺', label: 'Miss you', verb: 'misses you' },
  { kind: 'rose', emoji: '🌹', label: 'Rose', verb: 'sent a rose' },
  { kind: 'think', emoji: '💭', label: 'Thinking of you', verb: 'is thinking of you' },
  { kind: 'coffee', emoji: '☕', label: 'Coffee', verb: 'fancies a coffee' },
  { kind: 'food', emoji: '🍕', label: 'Hungry', verb: 'is hungry' },
  { kind: 'home', emoji: '🚗', label: 'On the way home', verb: 'is on the way home' },
  { kind: 'sleep', emoji: '😴', label: 'Sleepy', verb: 'is sleepy' },
  { kind: 'cheer', emoji: '💪', label: 'Cheering you on', verb: 'is cheering you on' },
  { kind: 'laugh', emoji: '😂', label: 'Haha', verb: 'is laughing' },
]
export const pingInfo = (k: PingKind) => PINGS.find((p) => p.kind === k) ?? PINGS[0]
