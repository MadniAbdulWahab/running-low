import { deleteDoc, doc, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { db } from '../firebase'
import { report } from '../lib/report'

export type PushKind = 'items' | 'notes' | 'hearts'
export type PushPrefs = Record<PushKind, boolean>
export const DEFAULT_PREFS: PushPrefs = { items: true, notes: true, hearts: true }

export interface PushDoc {
  subscription: string
  prefs: PushPrefs
}

const pushRef = (hid: string, uid: string) => doc(db, 'households', hid, 'push', uid)

export async function savePushSubscription(hid: string, uid: string, sub: PushSubscriptionJSON, prefs?: PushPrefs) {
  await setDoc(
    pushRef(hid, uid),
    { subscription: JSON.stringify(sub), ...(prefs ? { prefs } : {}), updatedAt: serverTimestamp() },
    { merge: true },
  )
}

export function setPushPref(hid: string, uid: string, kind: PushKind, on: boolean) {
  updateDoc(pushRef(hid, uid), { [`prefs.${kind}`]: on }).catch(report)
}

export function deletePushDoc(hid: string, uid: string) {
  return deleteDoc(pushRef(hid, uid)).catch(report)
}

/** This person's own push doc (undefined while loading, null when notifications are off). */
export function useMyPush(hid: string, uid: string) {
  const [state, setState] = useState<PushDoc | null | undefined>(undefined)
  useEffect(
    () =>
      onSnapshot(
        pushRef(hid, uid),
        (s) => {
          const d = s.data()
          setState(d ? { subscription: d.subscription, prefs: { ...DEFAULT_PREFS, ...(d.prefs ?? {}) } } : null)
        },
        () => setState(null),
      ),
    [hid, uid],
  )
  return state
}
