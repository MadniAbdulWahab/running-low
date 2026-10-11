import { collection, deleteDoc, doc, increment, serverTimestamp, setDoc, updateDoc, type DocumentData } from 'firebase/firestore'
import { db } from '../firebase'
import { toMs } from '../hooks/useCollection'
import { report } from '../lib/report'

/**
 * "Our meals": meals you make often, saved with their ingredients so a day in the
 * planner can be filled in one tap. Stored at `recipes/{id}`.
 */
export interface Recipe {
  id: string
  name: string
  /** As typed, one entry per ingredient ("2 tomatoes"). */
  ingredients: string[]
  /** How many times it's been planned; the most used come first. */
  uses: number
  createdAt: number
}

export const recipesCol = (hid: string) => collection(db, 'households', hid, 'recipes')
const recipeRef = (hid: string, id: string) => doc(db, 'households', hid, 'recipes', id)

export function toRecipe(id: string, d: DocumentData): Recipe {
  return {
    id,
    name: d.name ?? '',
    ingredients: Array.isArray(d.ingredients) ? d.ingredients : [],
    uses: typeof d.uses === 'number' ? d.uses : 0,
    createdAt: toMs(d.createdAt) ?? Date.now(),
  }
}

/** Most planned first, then A–Z. */
export const byUse = (a: Recipe, b: Recipe) => b.uses - a.uses || a.name.localeCompare(b.name)

const clean = (name: string, ingredients: string[]) => ({
  name: name.trim().slice(0, 80),
  ingredients: ingredients.map((i) => i.slice(0, 80)).slice(0, 20),
})

/** Saves a new meal and returns its id right away. */
export function createRecipe(hid: string, uid: string, name: string, ingredients: string[] = []): string {
  const ref = doc(recipesCol(hid))
  setDoc(ref, { ...clean(name, ingredients), uses: 0, createdBy: uid, createdAt: serverTimestamp() }).catch(report)
  return ref.id
}

export function updateRecipe(hid: string, id: string, name: string, ingredients: string[]) {
  updateDoc(recipeRef(hid, id), clean(name, ingredients)).catch(report)
}

/** Counts a use, so the meals you plan most rise to the top. */
export function usedRecipe(hid: string, id: string) {
  updateDoc(recipeRef(hid, id), { uses: increment(1) }).catch(report)
}

export function deleteRecipe(hid: string, id: string) {
  deleteDoc(recipeRef(hid, id)).catch(report)
}

/** The saved meal with this name, ignoring case and spaces at the ends. */
export const findRecipe = (recipes: Recipe[], name: string) => {
  const k = name.trim().toLocaleLowerCase()
  return k ? recipes.find((r) => r.name.trim().toLocaleLowerCase() === k) : undefined
}
