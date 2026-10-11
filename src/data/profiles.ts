import { collection, deleteDoc, deleteField, doc, getDoc, serverTimestamp, setDoc, type DocumentData } from 'firebase/firestore'
import { db } from '../firebase'
import { report } from '../lib/report'
import { lensModel } from '../lib/exif'
import { userRef } from './household'

/**
 * Profile photos: one doc per person on the list (`profiles/{uid}`), written by its owner and
 * seen by everyone on the list. A copy also sits on your own `users/{uid}` doc, so it's still
 * there if you leave and start or join another list.
 */
export const profilesCol = (hid: string) => collection(db, 'households', hid, 'profiles')
export const profileRef = (hid: string, uid: string) => doc(db, 'households', hid, 'profiles', uid)

export interface Profile {
  uid: string
  photo: string | null
}

export function toProfile(id: string, d: DocumentData): Profile {
  return { uid: id, photo: typeof d.photo === 'string' ? d.photo : null }
}

/** Sets (or, with null, removes) your photo on the list and on your own account. */
export function setMyPhoto(hid: string, uid: string, photo: string | null) {
  if (photo) setDoc(profileRef(hid, uid), { photo, updatedAt: serverTimestamp() }).catch(report)
  else deleteDoc(profileRef(hid, uid)).catch(report)
  setDoc(userRef(uid), { photo: photo ?? deleteField() }, { merge: true }).catch(report)
}

/** The photo saved on your account (e.g. from a list you left), if any. */
export async function readMyPhoto(uid: string): Promise<string | null> {
  try {
    const d = (await getDoc(userRef(uid))).data()
    return typeof d?.photo === 'string' ? d.photo : null
  } catch {
    return null
  }
}

/**
 * Crops the middle square of a photo and shrinks it to a small JPEG (usually 15–40 KB).
 * `mirror` flips it left to right, like the front camera's preview.
 */
export async function compressAvatar(file: Blob, { mirror = false } = {}): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    const side = Math.min(img.naturalWidth, img.naturalHeight)
    const sx = (img.naturalWidth - side) / 2
    const sy = (img.naturalHeight - side) / 2
    let size = 320
    let quality = 0.8
    let out = ''
    for (let i = 0; i < 4; i++) {
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = Math.min(size, side)
      const ctx = canvas.getContext('2d')!
      // JPEG has no transparency: give see-through images a white background, not black.
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      if (mirror) {
        ctx.translate(canvas.width, 0)
        ctx.scale(-1, 1)
      }
      ctx.drawImage(img, sx, sy, side, side, 0, 0, canvas.width, canvas.height)
      out = canvas.toDataURL('image/jpeg', quality)
      if (out.length < 80_000) break
      size = Math.round(size * 0.8)
      quality = Math.max(0.5, quality - 0.1)
    }
    return out
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** The same photo, flipped left to right. */
export async function flipPhoto(dataUrl: string): Promise<string> {
  const blob = await (await fetch(dataUrl)).blob()
  return compressAvatar(blob, { mirror: true })
}

/**
 * A selfie taken just now with the front camera. iPhone saves those un-mirrored, so they look
 * flipped next to the preview you saw; we mirror them back. Older selfies from the library
 * are left as they are, since that's how they look in Photos too.
 */
export async function isFreshSelfie(file: File): Promise<boolean> {
  if (Date.now() - file.lastModified > 2 * 60_000) return false
  return /front/i.test((await lensModel(file)) ?? '')
}
