import type { ListId, Mode, RoomId } from './types'

export interface Room {
  id: RoomId
  label: string
  title: string
  count: (n: number) => string
  empty: string
  recent: string
  bg: Record<Mode, string>
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

export const ROOMS: Record<RoomId, Room> = {
  home: {
    id: 'home',
    label: 'Home',
    title: 'Kitchen',
    count: (n) => (n ? `${plural(n, 'thing', 'things')} we’re out of` : 'Nothing missing. Nice.'),
    empty: 'We’re stocked up. Add something the moment it runs out.',
    recent: 'Recently bought',
    bg: { light: '#F4EEE3', dark: '#1D1916' },
  },
  grocery: {
    id: 'grocery',
    label: 'Grocery',
    title: 'Fridge',
    count: (n) => (n ? `${plural(n, 'thing', 'things')} to pick up` : 'The fridge is full'),
    empty: 'Nothing to pick up. Tap a magnet when something runs out.',
    recent: 'Recently bought',
    bg: { light: '#EEF2F0', dark: '#131A18' },
  },
  household: {
    id: 'household',
    label: 'Household',
    title: 'Pantry',
    count: (n) => (n ? `${plural(n, 'thing', 'things')} to restock` : 'The shelves are stocked'),
    empty: 'The shelves are stocked. Soap, bulbs and bin bags go here.',
    recent: 'Recently restocked',
    bg: { light: '#F1E8DA', dark: '#1B1612' },
  },
  important: {
    id: 'important',
    label: 'Important',
    title: 'Desk',
    count: (n) => (n ? `${plural(n, 'thing', 'things')} to sort out` : 'The desk is clear'),
    empty: 'The desk is clear. Renewals, refills and anything with a deadline go here.',
    recent: 'Recently sorted',
    bg: { light: '#F7F5F0', dark: '#12151C' },
  },
}

export const LISTS: ListId[] = ['grocery', 'household', 'important']
export const ROOM_ORDER: RoomId[] = ['home', 'grocery', 'household', 'important']
