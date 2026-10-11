import { collection, doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { report } from '../lib/report'

// Photos live in Firestore as small JPEG data URLs (Firebase Storage needs the paid plan).
export const photoRef = (hid: string, id: string) => doc(db, 'households', hid, 'photos', id)

/** Creates the photo doc (fire-and-forget) and returns its id right away. */
export function newPhotoDoc(hid: string, itemKey: string, dataUrl: string): string {
  const ref = doc(collection(db, 'households', hid, 'photos'))
  setDoc(ref, { itemKey, dataUrl, createdAt: serverTimestamp() }).catch(report)
  return ref.id
}

/** Shrinks a camera photo to ~640px JPEG, usually 40–80 KB. */
export async function compressImage(file: Blob): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    let max = 640
    let quality = 0.6
    let out = ''
    for (let i = 0; i < 4; i++) {
      const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.naturalWidth * scale)
      canvas.height = Math.round(img.naturalHeight * scale)
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      out = canvas.toDataURL('image/jpeg', quality)
      if (out.length < 150_000) break
      max = Math.round(max * 0.75)
      quality = Math.max(0.35, quality - 0.1)
    }
    return out
  } finally {
    URL.revokeObjectURL(url)
  }
}
