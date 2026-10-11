import { useEffect, useRef, useState } from 'react'
import { useApp } from '../../app-context'
import { clearMeal, saveMeal, splitIngredients, type Meal } from '../../data/meals'
import { createRecipe, findRecipe, usedRecipe, type Recipe } from '../../data/recipes'
import { emojiFor } from '../../lib/emoji'
import { parseISO } from '../../lib/time'
import { Sheet } from '../Sheet'
import { ingredientEntries, mealEmoji } from './MealPlanner'

/** Plan one day: the meal and its ingredients. Saves as you type and on close. */
export function MealSheet({
  day,
  meal,
  recipes,
  onClose,
}: {
  day: string
  meal?: Meal
  recipes: Recipe[]
  onClose: () => void
}) {
  const { household, uid, add, byKey, toast } = useApp()
  const hid = household.id
  const [name, setName] = useState(meal?.name ?? '')
  const [ingredients, setIngredients] = useState((meal?.ingredients ?? []).join(', '))
  const editing = useRef(false)
  // The photo comes from the saved meal it was filled from.
  const photoId = useRef(meal?.photoId ?? null)
  const saved = useRef(JSON.stringify([meal?.name ?? '', meal?.ingredients ?? []]))

  // Take changes from the other phone, but never while typing here.
  useEffect(() => {
    if (editing.current) return
    setName(meal?.name ?? '')
    setIngredients((meal?.ingredients ?? []).join(', '))
    saved.current = JSON.stringify([meal?.name ?? '', meal?.ingredients ?? []])
  }, [meal?.name, meal?.ingredients])

  const save = (n: string, ing: string) => {
    const list = splitIngredients(ing)
    const key = JSON.stringify([n.trim(), list])
    if (key === saved.current) return
    saved.current = key
    saveMeal(hid, uid, day, n, list, photoId.current)
  }
  useEffect(() => {
    if (!editing.current) return
    const t = window.setTimeout(() => save(name, ingredients), 600)
    return () => window.clearTimeout(t)
  }, [name, ingredients])
  const latest = useRef({ name, ingredients })
  latest.current = { name, ingredients }
  const finish = () => {
    save(latest.current.name, latest.current.ingredients)
    onClose()
  }

  const list = splitIngredients(ingredients)
  const savedRecipe = findRecipe(recipes, name)

  // A saved meal fills in the name and ingredients in one tap.
  const fillFrom = (r: Recipe) => {
    const ing = r.ingredients.join(', ')
    photoId.current = r.photoId
    saved.current = '' // a new photo is a change even if the words match
    setName(r.name)
    setIngredients(ing)
    save(r.name, ing)
    usedRecipe(hid, r.id)
  }
  const title = parseISO(day).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })

  return (
    <Sheet title={title} onClose={finish}>
      {recipes.length > 0 && (
        <>
          <h3 className="group-label">From our meals</h3>
          <div className="recipe-picks" role="group" aria-label="From our meals">
            {recipes.map((r) => (
              <button
                key={r.id}
                className="recipe-pick"
                aria-pressed={savedRecipe?.id === r.id}
                onClick={() => fillFrom(r)}
              >
                <span aria-hidden="true">{mealEmoji(r.name)}</span>
                {r.name}
              </button>
            ))}
          </div>
        </>
      )}
      <h3 className="group-label">Meal</h3>
      <div className="group">
        <label className="row">
          <span className="visually-hidden">Meal</span>
          <input
            className="row-input"
            value={name}
            maxLength={80}
            placeholder="What’s for dinner?"
            autoCapitalize="sentences"
            onFocus={() => (editing.current = true)}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => {
              editing.current = false
              save(name, ingredients)
            }}
          />
        </label>
      </div>

      <h3 className="group-label">Ingredients</h3>
      <div className="group">
        <label className="visually-hidden" htmlFor="meal-ingredients">
          Ingredients
        </label>
        <textarea
          id="meal-ingredients"
          className="note-input"
          rows={3}
          value={ingredients}
          placeholder="pasta, 2 tomatoes, basil…"
          onFocus={() => (editing.current = true)}
          onChange={(e) => setIngredients(e.target.value)}
          onBlur={() => {
            editing.current = false
            save(name, ingredients)
          }}
        />
      </div>
      {list.length > 0 && (
        <div className="meal-chips" aria-label="Ingredients">
          {list.map((i, n) => (
            <span key={n} className="meal-chip">
              <span aria-hidden="true">{emojiFor(i, 'grocery')}</span>
              {i}
            </span>
          ))}
        </div>
      )}
      <p className="group-footer">Separate with commas. Put a number first for a quantity, like “2 tomatoes”.</p>

      <div className="group" style={{ marginTop: 24 }}>
        <button
          className="row row--action"
          disabled={!list.length}
          onClick={() => add(ingredientEntries(list, new Set(byKey.keys())), { list: 'grocery' })}
        >
          Add ingredients to Groceries
        </button>
        {name.trim() && !savedRecipe && (
          <button
            className="row row--action"
            onClick={() => {
              createRecipe(hid, uid, name, list)
              toast(`Saved ${name.trim()} to Our meals`)
            }}
          >
            Save to Our meals
          </button>
        )}
        {meal && (
          <button
            className="row row--danger"
            onClick={() => {
              saved.current = JSON.stringify(['', []])
              latest.current = { name: '', ingredients: '' }
              clearMeal(hid, day)
              onClose()
            }}
          >
            Clear this day
          </button>
        )}
      </div>
    </Sheet>
  )
}
