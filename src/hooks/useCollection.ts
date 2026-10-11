import { onSnapshot, type DocumentData, type Query, type Timestamp } from 'firebase/firestore'
import { useEffect, useRef, useState } from 'react'
import { report } from '../lib/report'

/** Firestore timestamp → millis (null while a server timestamp is still pending without an estimate). */
export const toMs = (t: unknown): number | null =>
  t && typeof (t as Timestamp).toMillis === 'function' ? (t as Timestamp).toMillis() : null

/**
 * Live list of documents for a query, like useItems but generic.
 * `key` identifies the query (the Query object itself is new on every render).
 * Returns null until the first snapshot arrives.
 */
export function useCollection<T>(
  key: string | null,
  makeQuery: () => Query,
  map: (id: string, d: DocumentData) => T,
): T[] | null {
  const [data, setData] = useState<T[] | null>(null)
  const latest = useRef({ makeQuery, map })
  latest.current = { makeQuery, map }

  useEffect(() => {
    if (!key) {
      setData(null)
      return
    }
    return onSnapshot(
      latest.current.makeQuery(),
      (snap) =>
        setData(snap.docs.map((d) => latest.current.map(d.id, d.data({ serverTimestamps: 'estimate' })))),
      report,
    )
  }, [key])

  return data
}
