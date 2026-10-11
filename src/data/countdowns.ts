import { collection, deleteDoc, doc, serverTimestamp, setDoc, updateDoc, type DocumentData } from 'firebase/firestore'
import { db } from '../firebase'
import { report } from '../lib/report'
import { parseISO, toISO } from '../lib/time'

export interface Countdown {
  id: string
  title: string
  /** 'YYYY-MM-DD'; for yearly ones only the month and day matter. */
  date: string
  emoji: string
  yearly: boolean
  createdBy: string
}

export const countdownsCol = (hid: string) => collection(db, 'households', hid, 'countdowns')
const ref = (hid: string, id: string) => doc(db, 'households', hid, 'countdowns', id)

export function toCountdown(id: string, d: DocumentData): Countdown {
  return { id, title: d.title ?? '', date: d.date, emoji: d.emoji || '🎉', yearly: !!d.yearly, createdBy: d.createdBy }
}

const DAY = 86_400_000
const startOfToday = () => {
  const t = new Date()
  return new Date(t.getFullYear(), t.getMonth(), t.getDate())
}

/** The next date it happens (this year or next for yearly ones). */
export function nextDate(c: Countdown): Date {
  const d = parseISO(c.date)
  if (!c.yearly) return d
  const today = startOfToday()
  const thisYear = new Date(today.getFullYear(), d.getMonth(), d.getDate())
  return thisYear < today ? new Date(today.getFullYear() + 1, d.getMonth(), d.getDate()) : thisYear
}

/** Whole days from today (negative once a one-off date has passed). */
export const daysTo = (c: Countdown) => Math.round((nextDate(c).getTime() - startOfToday().getTime()) / DAY)

/** Soonest first; past one-offs at the end. */
export const bySoonest = (a: Countdown, b: Countdown) => {
  const da = daysTo(a)
  const db_ = daysTo(b)
  if (da < 0 !== db_ < 0) return da < 0 ? 1 : -1
  return da < 0 ? db_ - da : da - db_
}

export function saveCountdown(
  hid: string,
  uid: string,
  c: { id?: string; title: string; date: string; emoji: string; yearly: boolean },
) {
  const r = c.id ? ref(hid, c.id) : doc(countdownsCol(hid))
  const data = { title: c.title.trim().slice(0, 60), date: c.date, emoji: c.emoji.slice(0, 8), yearly: c.yearly }
  ;(c.id
    ? updateDoc(r, data)
    : setDoc(r, { ...data, createdBy: uid, createdAt: serverTimestamp() })
  ).catch(report)
}

export function deleteCountdown(hid: string, id: string) {
  deleteDoc(ref(hid, id)).catch(report)
}

export const defaultCountdownDate = () => {
  const t = startOfToday()
  return toISO(new Date(t.getFullYear(), t.getMonth(), t.getDate() + 7))
}
