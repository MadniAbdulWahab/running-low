import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  increment,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../firebase'
import { report } from '../lib/report'
import type { Item, ListId } from '../types'
import { newPhotoDoc, photoRef } from './photos'

export const itemsCol = (hid: string) => collection(db, 'households', hid, 'items')
export const itemId = (key: string) => 'i_' + encodeURIComponent(key)
const itemRef = (hid: string, id: string) => doc(db, 'households', hid, 'items', id)

/**
 * One doc per item name: adding something we've had before flips it back to
 * "needed" and bumps its count, which is what powers the frequent items.
 * Never awaited — offline writes only resolve once the server confirms.
 */
export function addItem(
  hid: string,
  uid: string,
  name: string,
  list: ListId,
  existing?: Item,
  photoDataUrl?: string,
) {
  const key = name.toLocaleLowerCase()
  const data: Record<string, unknown> = {
    name: existing?.name ?? name,
    key,
    list,
    status: 'needed',
    addedBy: uid,
    addedAt: serverTimestamp(),
    doneBy: null,
    doneAt: null,
    count: increment(1),
    lastUsed: serverTimestamp(),
  }
  if (existing?.status === 'done' && existing.due) data.due = deleteField()
  if (photoDataUrl) {
    data.photoId = newPhotoDoc(hid, key, photoDataUrl)
    if (existing?.photoId) deleteDoc(photoRef(hid, existing.photoId)).catch(report)
  }
  setDoc(itemRef(hid, itemId(key)), data, { merge: true }).catch(report)
}

export function markDone(hid: string, uid: string, item: Item) {
  updateDoc(itemRef(hid, item.id), {
    status: 'done',
    doneBy: uid,
    doneAt: serverTimestamp(),
  }).catch(report)
}

export function undoDone(hid: string, item: Item) {
  updateDoc(itemRef(hid, item.id), { status: 'needed', doneBy: null, doneAt: null }).catch(report)
}

export function moveItem(hid: string, item: Item, list: ListId) {
  const patch: Record<string, unknown> = { list }
  if (list !== 'important' && item.due) patch.due = deleteField()
  updateDoc(itemRef(hid, item.id), patch).catch(report)
}

export function setDue(hid: string, item: Item, due: string | null) {
  updateDoc(itemRef(hid, item.id), { due: due ?? deleteField() }).catch(report)
}

export function setItemPhoto(hid: string, item: Item, dataUrl: string | null) {
  const photoId = dataUrl ? newPhotoDoc(hid, item.key, dataUrl) : null
  updateDoc(itemRef(hid, item.id), { photoId }).catch(report)
  if (item.photoId) deleteDoc(photoRef(hid, item.photoId)).catch(report)
}

export function deleteItem(hid: string, item: Item) {
  deleteDoc(itemRef(hid, item.id)).catch(report)
  if (item.photoId) deleteDoc(photoRef(hid, item.photoId)).catch(report)
}
