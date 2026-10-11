import { useMemo, useState } from 'react'
import { useApp } from '../../app-context'
import type { Meal } from '../../data/meals'
import { emojiFor } from '../../lib/emoji'
import { splitEntry, type Entry } from '../../lib/parse'
import { parseISO, todayISO, weekDays, weekLabel } from '../../lib/time'
import { ChevronRight } from '../Icons'

export const mealEmoji = (name: string) => {
  const e = emojiFor(name, 'grocery')
  return e === '🛒' ? '🍽️' : e
}

/** Ingredient strings → entries for the Grocery list ("2 tomatoes" → Tomatoes ×2). */
export function ingredientEntries(ingredients: string[], known: Set<string>): Entry[] {
  return ingredients.flatMap((i) => splitEntry(i, known))
}

/** "Meals this week": Mon–Sun, tap a day to plan it; ingredients go to Grocery in one tap. */
export function MealPlanner({ meals, onOpenDay }: { meals: Meal[] | null; onOpenDay: (day: string) => void }) {
  const { add, byKey } = useApp()
  const [offset, setOffset] = useState(0)
  const days = useMemo(() => weekDays(offset), [offset])
  const byDay = useMemo(() => new Map((meals ?? []).map((m) => [m.day, m])), [meals])
  const today = todayISO()
  const weekIngredients = days.flatMap((d) => byDay.get(d)?.ingredients ?? [])

  const addWeek = () => add(ingredientEntries(weekIngredients, new Set(byKey.keys())), { list: 'grocery' })

  return (
    <section aria-label="Meals">
      <h2 className="group-label list-label">
        <span>Meals</span>
        <span className="week-nav">
          <button className="week-arrow" aria-label="Previous week" onClick={() => setOffset((o) => o - 1)}>
            <span className="flip">
              <ChevronRight />
            </span>
          </button>
          <span className="week-label">{weekLabel(offset)}</span>
          <button className="week-arrow" aria-label="Next week" onClick={() => setOffset((o) => o + 1)}>
            <ChevronRight />
          </button>
        </span>
      </h2>
      <div className="group">
        {days.map((d) => {
          const m = byDay.get(d)
          const date = parseISO(d)
          return (
            <button key={d} className="meal-row" data-today={d === today || undefined} onClick={() => onOpenDay(d)}>
              <span className="meal-day">
                <span className="meal-dow">{date.toLocaleDateString(undefined, { weekday: 'short' })}</span>
                <span className="meal-date">{date.getDate()}</span>
              </span>
              <span className="meal-text">
                {m?.name ? (
                  <span className="meal-name">{m.name}</span>
                ) : (
                  <span className="meal-empty">{m?.ingredients.length ? 'Ingredients only' : 'Add a meal'}</span>
                )}
                {m && m.ingredients.length > 0 && <span className="meal-ingredients">{m.ingredients.join(', ')}</span>}
              </span>
              {m?.name && (
                <span className="meal-emoji" aria-hidden="true">
                  {mealEmoji(m.name)}
                </span>
              )}
            </button>
          )
        })}
        {weekIngredients.length > 0 && (
          <button className="row row--action meal-add-all" onClick={addWeek}>
            Add {weekIngredients.length === 1 ? 'the ingredient' : `all ${weekIngredients.length} ingredients`} to Grocery
          </button>
        )}
      </div>
    </section>
  )
}
