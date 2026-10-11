import {
  collection,
  deleteDoc,
  doc,
  documentId,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  type DocumentData,
} from 'firebase/firestore'
import { db } from '../firebase'
import { toMs } from '../hooks/useCollection'
import { report } from '../lib/report'
import { todayISO } from '../lib/time'
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
  // Count it for today (pings themselves are pruned, so they can't be counted later).
  setDoc(doc(daysCol(hid), todayISO()), { [uid]: { [kind]: increment(1) } }, { merge: true }).catch(report)
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

// ── Daily counts: pingDays/{YYYY-MM-DD} = { [uid]: { heart: 18, kiss: 6, … } } ──

export type PingCounts = Partial<Record<PingKind, number>>

export interface PingDay {
  day: string
  /** What each person sent that day. */
  by: Record<string, PingCounts>
}

const daysCol = (hid: string) => collection(db, 'households', hid, 'pingDays')

/** Days from `since` ('YYYY-MM-DD') up to today. */
export const pingDaysSince = (hid: string, since: string) => query(daysCol(hid), where(documentId(), '>=', since))

export function toPingDay(id: string, d: DocumentData): PingDay {
  const by: Record<string, PingCounts> = {}
  for (const [uid, counts] of Object.entries(d)) if (counts && typeof counts === 'object') by[uid] = counts as PingCounts
  return { day: id, by }
}

/** Adds up what `uid` sent over the given days. */
export function countsFor(days: PingDay[], uid: string): PingCounts {
  const out: PingCounts = {}
  for (const d of days)
    for (const [k, n] of Object.entries(d.by[uid] ?? {})) out[k as PingKind] = (out[k as PingKind] ?? 0) + (n ?? 0)
  return out
}

export const totalOf = (c: PingCounts) => Object.values(c).reduce<number>((a, n) => a + (n ?? 0), 0)
