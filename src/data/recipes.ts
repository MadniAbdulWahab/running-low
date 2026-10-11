import { collection, deleteDoc, doc, increment, serverTimestamp, setDoc, updateDoc, type DocumentData } from 'firebase/firestore'
import { db } from '../firebase'
import { toMs } from '../hooks/useCollection'
import { report } from '../lib/report'
import { newPhotoDoc, photoRef } from './photos'

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
  /** A photo of the meal (in `photos/`), like grocery items have. */
  photoId: string | null
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
    photoId: typeof d.photoId === 'string' ? d.photoId : null,
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
export function createRecipe(
  hid: string,
  uid: string,
  name: string,
  ingredients: string[] = [],
  photo: string | null = null,
): string {
  const ref = doc(recipesCol(hid))
  const photoId = photo ? newPhotoDoc(hid, `meal:${ref.id}`, photo) : null
  setDoc(ref, {
    ...clean(name, ingredients),
    uses: 0,
    ...(photoId ? { photoId } : {}),
    createdBy: uid,
    createdAt: serverTimestamp(),
  }).catch(report)
  return ref.id
}

/**
 * Adds, replaces or (with null) removes a saved meal's photo. The old photo is kept while a
 * planned day still shows it.
 */
export function setRecipePhoto(hid: string, recipe: Recipe, dataUrl: string | null, inUse: boolean) {
  const photoId = dataUrl ? newPhotoDoc(hid, `meal:${recipe.id}`, dataUrl) : null
  updateDoc(recipeRef(hid, recipe.id), { photoId }).catch(report)
  if (recipe.photoId && !inUse) deleteDoc(photoRef(hid, recipe.photoId)).catch(report)
}

export function updateRecipe(hid: string, id: string, name: string, ingredients: string[]) {
  updateDoc(recipeRef(hid, id), clean(name, ingredients)).catch(report)
}

/** Counts a use, so the meals you plan most rise to the top. */
export function usedRecipe(hid: string, id: string) {
  updateDoc(recipeRef(hid, id), { uses: increment(1) }).catch(report)
}

/** Deletes a saved meal, and its photo unless a planned day still shows it. */
export function deleteRecipe(hid: string, recipe: Recipe, photoInUse: boolean) {
  deleteDoc(recipeRef(hid, recipe.id)).catch(report)
  if (recipe.photoId && !photoInUse) deleteDoc(photoRef(hid, recipe.photoId)).catch(report)
}

/** The saved meal with this name, ignoring case and spaces at the ends. */
export const findRecipe = (recipes: Recipe[], name: string) => {
  const k = name.trim().toLocaleLowerCase()
  return k ? recipes.find((r) => r.name.trim().toLocaleLowerCase() === k) : undefined
}
