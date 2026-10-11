import {
  collection,
  deleteDoc,
  doc,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type DocumentData,
} from 'firebase/firestore'
import { db } from '../firebase'
import { toMs } from '../hooks/useCollection'
import { report } from '../lib/report'
import type { Ping, PingKind } from '../types'

const KEEP = 100
const pingsCol = (hid: string) => collection(db, 'households', hid, 'pings')

/** The latest hearts/hugs, newest first. */
export const recentPings = (hid: string) => query(pingsCol(hid), orderBy('createdAt', 'desc'), limit(KEEP + 10))

export function toPing(id: string, d: DocumentData): Ping {
  return { id, from: d.from, kind: d.kind, createdAt: toMs(d.createdAt) ?? Date.now() }
}

export function sendPing(hid: string, uid: string, kind: PingKind, existing: Ping[]) {
  setDoc(doc(pingsCol(hid)), { from: uid, kind, createdAt: serverTimestamp() }).catch(report)
  // Keep the collection small: drop anything beyond the newest KEEP.
  for (const p of existing.slice(KEEP)) deleteDoc(doc(pingsCol(hid), p.id)).catch(() => {})
}

const SEEN_KEY = 'outof.pingSeen'

/** When this phone last showed an incoming heart (so each one celebrates once). */
export function readPingSeen(uid: string): number {
  try {
    return Number(localStorage.getItem(`${SEEN_KEY}.${uid}`)) || 0
  } catch {
    return 0
  }
}
export function writePingSeen(uid: string, t: number) {
  try {
    localStorage.setItem(`${SEEN_KEY}.${uid}`, String(t))
  } catch {}
}
