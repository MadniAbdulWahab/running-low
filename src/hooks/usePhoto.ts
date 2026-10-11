import { onSnapshot } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { photoRef } from '../data/photos'

const cache = new Map<string, string>()

export function usePhoto(hid: string, photoId: string | null) {
  const [url, setUrl] = useState(() => (photoId ? (cache.get(photoId) ?? null) : null))

  useEffect(() => {
    if (!photoId) {
      setUrl(null)
      return
    }
    setUrl(cache.get(photoId) ?? null)
    return onSnapshot(
      photoRef(hid, photoId),
      (snap) => {
        const u = (snap.data()?.dataUrl as string | undefined) ?? null
        if (u) cache.set(photoId, u)
        setUrl(u)
      },
      () => {},
    )
  }, [hid, photoId])

  return url
}
