import { arrayRemove, arrayUnion, deleteField, doc, serverTimestamp, updateDoc, writeBatch } from 'firebase/firestore'
import { FirebaseError } from 'firebase/app'
import { db } from '../firebase'
import { report } from '../lib/report'
import type { Household } from '../types'

// No I, O, 0 or 1, so codes survive being read aloud or typed from a screenshot.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export const CODE_RE = /^[A-HJ-NP-Z2-9]{8}$/

export function newCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('')
}

export const formatCode = (code: string) => `${code.slice(0, 4)}-${code.slice(4)}`

export function parseCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
}

export const householdRef = (hid: string) => doc(db, 'households', hid)
export const userRef = (uid: string) => doc(db, 'users', uid)

export async function createHousehold(uid: string, myName: string, name: string): Promise<string> {
  for (let attempt = 0; ; attempt++) {
    const code = newCode()
    const batch = writeBatch(db)
    batch.set(householdRef(code), {
      name,
      members: [uid],
      memberNames: { [uid]: myName },
      createdAt: serverTimestamp(),
    })
    batch.set(userRef(uid), { householdId: code }, { merge: true })
    try {
      await batch.commit()
      return code
    } catch (e) {
      // A taken code looks like permission-denied (it would be an update); just pick another.
      if (attempt < 2 && e instanceof FirebaseError && e.code === 'permission-denied') continue
      throw e
    }
  }
}

export async function joinHousehold(uid: string, myName: string, code: string): Promise<void> {
  const batch = writeBatch(db)
  batch.update(householdRef(code), { members: arrayUnion(uid), [`memberNames.${uid}`]: myName })
  batch.set(userRef(uid), { householdId: code }, { merge: true })
  await batch.commit()
}

/**
 * Leave the list: take yourself (your name and photo) off it, stop its notifications on
 * this phone, and forget it, so you can start or join another. Your account keeps its photo.
 * Everything else stays for anyone still on it, and their invite code works again.
 */
export async function leaveHousehold(h: Household, uid: string): Promise<void> {
  const batch = writeBatch(db)
  batch.update(householdRef(h.id), { members: arrayRemove(uid), [`memberNames.${uid}`]: deleteField() })
  batch.delete(doc(db, 'households', h.id, 'push', uid))
  batch.delete(doc(db, 'households', h.id, 'profiles', uid))
  batch.update(userRef(uid), { householdId: deleteField() })
  await batch.commit()
}

export function renameHousehold(h: Household, name: string) {
  updateDoc(householdRef(h.id), { name }).catch(report)
}

export function setMyName(h: Household, uid: string, name: string) {
  updateDoc(householdRef(h.id), { [`memberNames.${uid}`]: name }).catch(report)
}
