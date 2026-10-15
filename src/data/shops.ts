import { collection, deleteField, doc, documentId, query, serverTimestamp, setDoc, where, type DocumentData } from 'firebase/firestore'
import { db } from '../firebase'
import { report } from '../lib/report'
import type { ShopLog } from '../lib/shops'
import { toISO } from '../lib/time'
import type { Item } from '../types'

/**
 * "Past shops": groceries ticked off, logged per day at `shops/{YYYY-MM-DD}` =
 * `{ items: { [key]: { name, qty } } }`. Written beside the tick (never in its batch),
 * so a failed log can't hold a tick back.
 */
export const shopsCol = (hid: string) => collection(db, 'households', hid, 'shops')
const shopRef = (hid: string, day: string) => doc(db, 'households', hid, 'shops', day)
export const shopsSince = (hid: string, since: string) => query(shopsCol(hid), where(documentId(), '>=', since))

export function toShop(id: string, d: DocumentData): ShopLog {
  const items: ShopLog['items'] = {}
  if (d.items && typeof d.items === 'object')
    for (const [key, v] of Object.entries(d.items as Record<string, { name?: unknown; qty?: unknown }>))
      if (v && typeof v.name === 'string') items[key] = { name: v.name, qty: typeof v.qty === 'number' ? v.qty : null }
  return { day: id, items }
}

const groceries = (items: Item[]) => items.filter((i) => i.list === 'grocery')

/** Ticked off today: add them to today's shop. */
export function logBought(hid: string, items: Item[]) {
  const got = groceries(items)
  if (!got.length) return
  setDoc(
    shopRef(hid, toISO(new Date())),
    { items: Object.fromEntries(got.map((i) => [i.key, { name: i.name, qty: i.qty }])), updatedAt: serverTimestamp() },
    { merge: true },
  ).catch(report)
}

/** Put back on the list: take them out of the shop they were logged in. */
export function unlogBought(hid: string, items: Item[]) {
  const byDay = new Map<string, Item[]>()
  for (const i of groceries(items)) {
    const day = toISO(new Date(i.doneAt ?? Date.now()))
    byDay.set(day, [...(byDay.get(day) ?? []), i])
  }
  for (const [day, list] of byDay)
    setDoc(
      shopRef(hid, day),
      { items: Object.fromEntries(list.map((i) => [i.key, deleteField()])), updatedAt: serverTimestamp() },
      { merge: true },
    ).catch(report)
}
