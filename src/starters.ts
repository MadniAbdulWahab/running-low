import type { Item, ListId } from './types'

// Shown as quick-add shortcuts until real history replaces them.
const STARTERS: Record<ListId, string[]> = {
  grocery: ['Milk', 'Eggs', 'Bread', 'Coffee', 'Butter', 'Bananas', 'Cheese', 'Yogurt'],
  household: [
    'Toilet paper',
    'Dish soap',
    'Laundry detergent',
    'Bin bags',
    'Paper towels',
    'Sponges',
    'Light bulbs',
    'Batteries',
  ],
  important: ['Medication', 'Contact lenses', 'Passport renewal', 'Car insurance', 'Birthday gift', 'Phone bill'],
}

export interface Frequent {
  name: string
  key: string
  item?: Item
}

export function frequentFor(list: ListId, items: Item[], byKey: Map<string, Item>, max = 8): Frequent[] {
  const out: Frequent[] = items
    .filter((i) => i.list === list)
    .sort((a, b) => b.count - a.count || b.lastUsed - a.lastUsed)
    .slice(0, max)
    .map((item) => ({ name: item.name, key: item.key, item }))
  for (const name of STARTERS[list]) {
    if (out.length >= max) break
    const key = name.toLocaleLowerCase()
    if (!byKey.has(key)) out.push({ name, key })
  }
  return out
}
