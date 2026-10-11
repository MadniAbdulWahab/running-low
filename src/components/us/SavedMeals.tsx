import type { Recipe } from '../../data/recipes'
import { ChevronRight } from '../Icons'
import { mealEmoji } from './MealPlanner'

/** "Our meals": the saved list on the Meals tab. Tap one to edit it, plan it or shop for it. */
export function SavedMeals({ recipes, onOpen }: { recipes: Recipe[] | null; onOpen: (id: string) => void }) {
  if (recipes === null) return null
  return (
    <section aria-label="Our meals">
      <h2 className="group-label">
        <span>Our meals{recipes.length ? ` · ${recipes.length}` : ''}</span>
      </h2>
      {recipes.length ? (
        <div className="group">
          {recipes.map((r) => (
            <button key={r.id} className="meal-row recipe-row" onClick={() => onOpen(r.id)}>
              <span className="recipe-emoji" aria-hidden="true">
                {mealEmoji(r.name)}
              </span>
              <span className="meal-text">
                <span className="meal-name">{r.name}</span>
                {r.ingredients.length ? (
                  <span className="meal-ingredients">{r.ingredients.join(', ')}</span>
                ) : (
                  <span className="meal-ingredients recipe-hint">Tap to add ingredients</span>
                )}
              </span>
              <ChevronRight />
            </button>
          ))}
        </div>
      ) : (
        <div className="empty empty--card recipe-empty">
          <span className="empty-art" aria-hidden="true">
            <span className="sticker sticker--inline">🍝</span>
            <span className="sticker sticker--inline">🥗</span>
            <span className="sticker sticker--inline">🍛</span>
          </span>
          <strong>Save the meals you make</strong>
          Type one below. Then plan it for any day in a tap, ingredients and all.
        </div>
      )}
    </section>
  )
}
