import { describe, expect, it } from 'vitest'
import { pastShops, shopDayLabel, type ShopLog } from '../src/lib/shops'
import type { Item } from '../src/types'

const NOW = new Date(2026, 9, 16, 18, 0).getTime() // Fri 16 Oct 2026, 6pm local
const at = (day: number, hour = 12) => new Date(2026, 9, day, hour).getTime()

function item(name: string, over: Partial<Item> = {}): Item {
  const key = name.toLocaleLowerCase()
  return {
    id: 'i_' + key,
    name,
    key,
    list: 'grocery',
    status: 'done',
    addedBy: 'a',
    addedAt: at(1),
    doneBy: 'a',
    doneAt: at(16),
    count: 1,
    lastUsed: at(1),
    photoId: null,
    due: null,
    note: null,
    qty: null,
    ...over,
  }
}

describe('pastShops', () => {
  it('merges the log with groceries still marked as bought, once each, newest day first', () => {
    const logs: ShopLog[] = [
      { day: '2026-10-16', items: { milk: { name: 'Milk', qty: 2 } } },
      { day: '2026-10-12', items: { eggs: { name: 'Eggs', qty: null }, bread: { name: 'Bread', qty: null } } },
    ]
    const items = [
      item('Milk', { qty: 3 }), // logged today already: the log wins
      item('Apples'), // ticked today by a phone without the log
      item('Tea', { doneAt: at(14) }),
    ]
    const shops = pastShops(logs, items, NOW)
    expect(shops.map((s) => s.day)).toEqual(['2026-10-16', '2026-10-14', '2026-10-12'])
    expect(shops[0].items).toEqual([
      { key: 'apples', name: 'Apples', qty: null },
      { key: 'milk', name: 'Milk', qty: 2 },
    ])
    expect(shops[2].items.map((i) => i.name)).toEqual(['Bread', 'Eggs'])
  })

  it('leaves out items still needed, Important items, empty days and anything over 28 days old', () => {
    const logs: ShopLog[] = [
      { day: '2026-10-15', items: {} },
      { day: '2026-09-18', items: { old: { name: 'Old', qty: null } } },
      { day: '2026-09-19', items: { kept: { name: 'Kept', qty: null } } },
    ]
    const items = [
      item('Milk', { status: 'needed', doneAt: null }),
      item('Passport', { list: 'important' }),
      item('Rice', { doneAt: new Date(2026, 8, 10).getTime() }),
    ]
    expect(pastShops(logs, items, NOW)).toEqual([
      { day: '2026-09-19', items: [{ key: 'kept', name: 'Kept', qty: null }] },
    ])
  })
})

describe('shopDayLabel', () => {
  it('says Today and Yesterday, then the weekday, then the date', () => {
    expect(shopDayLabel('2026-10-16', NOW)).toBe('Today')
    expect(shopDayLabel('2026-10-15', NOW)).toBe('Yesterday')
    expect(shopDayLabel('2026-10-12', NOW)).toBe(new Date(2026, 9, 12).toLocaleDateString(undefined, { weekday: 'long' }))
    expect(shopDayLabel('2026-10-01', NOW)).toBe(
      new Date(2026, 9, 1).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }),
    )
  })
})
