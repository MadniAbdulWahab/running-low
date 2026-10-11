import { useEffect, useRef, useState } from 'react'
import { useApp } from '../../app-context'
import { clearMeal, saveMeal, splitIngredients, type Meal } from '../../data/meals'
import { emojiFor } from '../../lib/emoji'
import { parseISO } from '../../lib/time'
import { Sheet } from '../Sheet'
import { ingredientEntries } from './MealPlanner'

/** Plan one day: the meal and its ingredients. Saves as you type and on close. */
export function MealSheet({ day, meal, onClose }: { day: string; meal?: Meal; onClose: () => void }) {
  const { household, uid, add, byKey } = useApp()
  const hid = household.id
  const [name, setName] = useState(meal?.name ?? '')
  const [ingredients, setIngredients] = useState((meal?.ingredients ?? []).join(', '))
  const editing = useRef(false)
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
    saveMeal(hid, uid, day, n, list)
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
  const title = parseISO(day).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })

  return (
    <Sheet title={title} onClose={finish}>
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
          Add ingredients to Grocery
        </button>
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
