import { collection, deleteDoc, doc, serverTimestamp, setDoc, type DocumentData } from 'firebase/firestore'
import { db } from '../firebase'
import { toMs } from '../hooks/useCollection'
import { report } from '../lib/report'

export interface Meal {
  /** 'YYYY-MM-DD', also the doc id: one meal per day. */
  day: string
  name: string
  /** As typed, one entry per ingredient ("2 tomatoes"). */
  ingredients: string[]
  updatedBy: string
  updatedAt: number
}

export const mealsCol = (hid: string) => collection(db, 'households', hid, 'meals')
const mealRef = (hid: string, day: string) => doc(db, 'households', hid, 'meals', day)

export function toMeal(id: string, d: DocumentData): Meal {
  return {
    day: id,
    name: d.name ?? '',
    ingredients: Array.isArray(d.ingredients) ? d.ingredients : [],
    updatedBy: d.updatedBy,
    updatedAt: toMs(d.updatedAt) ?? Date.now(),
  }
}

/** "pasta, 2 tomatoes\nbasil" → ['pasta', '2 tomatoes', 'basil'] */
export function splitIngredients(text: string): string[] {
  return text
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20)
}

export function saveMeal(hid: string, uid: string, day: string, name: string, ingredients: string[]) {
  if (!name.trim() && !ingredients.length) {
    deleteDoc(mealRef(hid, day)).catch(report)
    return
  }
  setDoc(mealRef(hid, day), {
    day,
    name: name.trim().slice(0, 80),
    ingredients: ingredients.map((i) => i.slice(0, 80)).slice(0, 20),
    updatedBy: uid,
    updatedAt: serverTimestamp(),
  }).catch(report)
}

export function clearMeal(hid: string, day: string) {
  deleteDoc(mealRef(hid, day)).catch(report)
}
