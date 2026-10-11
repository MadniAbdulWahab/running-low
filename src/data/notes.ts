import {
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
  type DocumentData,
} from 'firebase/firestore'
import { db } from '../firebase'
import { toMs } from '../hooks/useCollection'
import { report } from '../lib/report'
import { NOTE_COLORS } from '../rooms'
import type { ChecklistEntry, Note, NoteColor } from '../types'

export const notesCol = (hid: string) => collection(db, 'households', hid, 'notes')
const noteRef = (hid: string, id: string) => doc(db, 'households', hid, 'notes', id)

export function toNote(id: string, d: DocumentData): Note {
  return {
    id,
    text: d.text ?? '',
    color: NOTE_COLORS.includes(d.color) ? d.color : 'peach',
    pinned: !!d.pinned,
    checklist: Array.isArray(d.checklist) ? d.checklist : [],
    createdBy: d.createdBy,
    createdAt: toMs(d.createdAt) ?? Date.now(),
    updatedBy: d.updatedBy ?? d.createdBy,
    updatedAt: toMs(d.updatedAt) ?? toMs(d.createdAt) ?? Date.now(),
  }
}

/** Pinned first, then most recently changed. */
export const byBoardOrder = (a: Note, b: Note) =>
  Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt

/** Creates a note right away (fire-and-forget) and returns its id. */
export function createNote(
  hid: string,
  uid: string,
  init: { text?: string; color?: NoteColor; checklist?: ChecklistEntry[] } = {},
): string {
  const ref = doc(notesCol(hid))
  setDoc(ref, {
    text: init.text ?? '',
    color: init.color ?? 'peach',
    pinned: false,
    checklist: init.checklist ?? [],
    createdBy: uid,
    createdAt: serverTimestamp(),
    updatedBy: uid,
    updatedAt: serverTimestamp(),
  }).catch(report)
  return ref.id
}

export function updateNote(
  hid: string,
  uid: string,
  id: string,
  patch: Partial<Pick<Note, 'text' | 'color' | 'pinned' | 'checklist'>>,
) {
  updateDoc(noteRef(hid, id), { ...patch, updatedBy: uid, updatedAt: serverTimestamp() }).catch(report)
}

export function deleteNote(hid: string, id: string) {
  deleteDoc(noteRef(hid, id)).catch(report)
}

/** The next colour after the most recent note's, so new notes vary. */
export function nextColor(notes: Note[]): NoteColor {
  const last = [...notes].sort((a, b) => b.createdAt - a.createdAt)[0]
  if (!last) return 'peach'
  return NOTE_COLORS[(NOTE_COLORS.indexOf(last.color) + 1) % NOTE_COLORS.length]
}
