import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
  type DocumentData,
} from 'firebase/firestore'
import { db } from '../firebase'
import { toMs } from '../hooks/useCollection'
import { report } from '../lib/report'

export interface Idea {
  id: string
  text: string
  /** Set once you've done it together. */
  doneAt: number | null
  createdBy: string
  createdAt: number
}

export const ideasCol = (hid: string) => collection(db, 'households', hid, 'ideas')
const ref = (hid: string, id: string) => doc(db, 'households', hid, 'ideas', id)

export function toIdea(id: string, d: DocumentData): Idea {
  return {
    id,
    text: d.text ?? '',
    doneAt: toMs(d.doneAt),
    createdBy: d.createdBy,
    createdAt: toMs(d.createdAt) ?? Date.now(),
  }
}

export function addIdea(hid: string, uid: string, text: string) {
  setDoc(doc(ideasCol(hid)), { text: text.trim().slice(0, 200), createdBy: uid, createdAt: serverTimestamp() }).catch(
    report,
  )
}

export function markIdeaDone(hid: string, id: string, done: boolean) {
  updateDoc(ref(hid, id), { doneAt: done ? serverTimestamp() : deleteField() }).catch(report)
}

export function deleteIdea(hid: string, id: string) {
  deleteDoc(ref(hid, id)).catch(report)
}
