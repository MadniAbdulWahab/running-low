import { useState } from 'react'
import { useApp } from '../../app-context'
import { splitIngredients } from '../../data/meals'
import { createRecipe, findRecipe, type Recipe } from '../../data/recipes'
import { ArrowUp } from '../Icons'

/**
 * The bottom bar on the Meals tab: type a meal to save it to "Our meals".
 * "Pasta night: pasta, 2 tomatoes, basil" saves the ingredients too.
 */
export function MealComposer({ recipes }: { recipes: Recipe[] }) {
  const { household, uid, toast } = useApp()
  const [text, setText] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const [rawName, ...rest] = text.split(':')
    const name = rawName.trim()
    if (!name) return
    const existing = findRecipe(recipes, name)
    if (existing) {
      toast(`${existing.name} is already in Our meals`)
      return
    }
    const ingredients = splitIngredients(rest.join(':'))
    createRecipe(household.id, uid, name, ingredients)
    setText('')
    toast(ingredients.length ? `Saved ${name} with ${ingredients.length} ingredients` : `Saved ${name}`)
  }

  return (
    <div className="toolbar-inner">
      <form className="quick-add" onSubmit={submit}>
        <span className="quick-plus composer-emoji" aria-hidden="true">
          🍲
        </span>
        <input
          className="quick-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Save a meal…"
          aria-label="Save a meal"
          autoComplete="off"
          autoCapitalize="sentences"
          enterKeyHint="done"
          maxLength={400}
        />
        {text.trim() && (
          <button type="submit" className="quick-btn quick-send" aria-label="Save meal">
            <ArrowUp />
          </button>
        )}
      </form>
    </div>
  )
}
