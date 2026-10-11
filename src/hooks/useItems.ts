import { onSnapshot, type DocumentData, type Timestamp } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { itemsCol } from '../data/items'
import { report } from '../lib/report'
import type { Item } from '../types'

const ms = (t: unknown): number | null =>
  t && typeof (t as Timestamp).toMillis === 'function' ? (t as Timestamp).toMillis() : null

function toItem(id: string, d: DocumentData): Item {
  return {
    id,
    name: d.name,
    key: d.key,
    list: d.list,
    status: d.status,
    addedBy: d.addedBy,
    addedAt: ms(d.addedAt) ?? Date.now(),
    doneBy: d.doneBy ?? null,
    doneAt: ms(d.doneAt),
    count: d.count ?? 1,
    lastUsed: ms(d.lastUsed) ?? ms(d.addedAt) ?? Date.now(),
    photoId: d.photoId ?? null,
    due: d.due ?? null,
  }
}

export function useItems(hid: string) {
  const [items, setItems] = useState<Item[] | null>(null)
  useEffect(
    () =>
      onSnapshot(
        itemsCol(hid),
        (snap) =>
          setItems(snap.docs.map((d) => toItem(d.id, d.data({ serverTimestamps: 'estimate' })))),
        report,
      ),
    [hid],
  )
  return items
}
