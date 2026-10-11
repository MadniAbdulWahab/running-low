import type { ListId, RoomId } from './types'

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
    label: 'Grocery',
    count: (n) => (n ? `${n} to pick up` : 'Nothing to pick up'),
    empty: 'Tap a suggestion above or type below when something runs out.',
    recent: 'Recently bought',
    doneVerb: 'Bought',
  },
  household: {
    id: 'household',
    label: 'Household',
    count: (n) => (n ? `${n} to restock` : 'Nothing to restock'),
    empty: 'Soap, bulbs, bin bags: add them here when they run low.',
    recent: 'Recently restocked',
    doneVerb: 'Restocked',
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

export const LISTS: ListId[] = ['grocery', 'household', 'important']
export const ROOM_ORDER: RoomId[] = ['home', ...LISTS]
