import { collection, deleteDoc, doc, increment, serverTimestamp, setDoc, updateDoc, type DocumentData } from 'firebase/firestore'
import { db } from '../firebase'
import { toMs } from '../hooks/useCollection'
import { report } from '../lib/report'
import type { Entry } from '../lib/parse'
import { newPhotoDoc, photoRef } from './photos'

/**
 * Grocery templates: groceries bought together ("Weekly shop"), saved so they can go on the
 * list in one go. Stored at `templates/{id}`, like Our meals.
 */
export interface Template {
  id: string
  name: string
  /** As typed, one entry per item ("2 milk"). */
  items: string[]
  /** How many times it's been added; the most used come first. */
  uses: number
  photoId: string | null
  createdAt: number
}

/** Most items a template holds. */
export const TEMPLATE_MAX = 60

export const templatesCol = (hid: string) => collection(db, 'households', hid, 'templates')
const templateRef = (hid: string, id: string) => doc(db, 'households', hid, 'templates', id)

export function toTemplate(id: string, d: DocumentData): Template {
  return {
    id,
    name: d.name ?? '',
    items: Array.isArray(d.items) ? d.items : [],
    uses: typeof d.uses === 'number' ? d.uses : 0,
    photoId: typeof d.photoId === 'string' ? d.photoId : null,
    createdAt: toMs(d.createdAt) ?? Date.now(),
  }
}

/** Most used first, then A–Z. */
export const templatesByUse = (a: Template, b: Template) => b.uses - a.uses || a.name.localeCompare(b.name)

/** { name: 'Milk', qty: 2 } → "2 Milk", the way it's typed. */
export const entryLine = (e: Entry) => (e.qty && e.qty > 1 ? `${e.qty} ${e.name}` : e.name)

const clean = (name: string, items: string[]) => ({
  name: name.trim().slice(0, 60),
  items: items.map((i) => i.slice(0, 80)).slice(0, TEMPLATE_MAX),
})

/** Saves a new template and returns its id right away. */
export function createTemplate(hid: string, uid: string, name: string, items: string[] = []): string {
  const ref = doc(templatesCol(hid))
  setDoc(ref, { ...clean(name, items), uses: 0, createdBy: uid, createdAt: serverTimestamp() }).catch(report)
  return ref.id
}

export function updateTemplate(hid: string, id: string, name: string, items: string[]) {
  updateDoc(templateRef(hid, id), clean(name, items)).catch(report)
}

/** Adds, replaces or (with null) removes a template's photo. */
export function setTemplatePhoto(hid: string, template: Template, dataUrl: string | null) {
  const photoId = dataUrl ? newPhotoDoc(hid, `template:${template.id}`, dataUrl) : null
  updateDoc(templateRef(hid, template.id), { photoId }).catch(report)
  if (template.photoId) deleteDoc(photoRef(hid, template.photoId)).catch(report)
}

/** Counts a use, so the templates added most rise to the top. */
export function usedTemplate(hid: string, id: string) {
  updateDoc(templateRef(hid, id), { uses: increment(1) }).catch(report)
}

export function deleteTemplate(hid: string, template: Template) {
  deleteDoc(templateRef(hid, template.id)).catch(report)
  if (template.photoId) deleteDoc(photoRef(hid, template.photoId)).catch(report)
}
