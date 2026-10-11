import { useState } from 'react'
import { useApp } from '../../app-context'
import { splitIngredients } from '../../data/meals'
import { compressImage } from '../../data/photos'
import { createRecipe, findRecipe, type Recipe } from '../../data/recipes'
import { ArrowUp, CameraIcon, CloseIcon } from '../Icons'

/**
 * The bottom bar on the Meals tab: type a meal to save it to "Our meals", with a photo if you
 * like (same as adding groceries). "Pasta night: pasta, 2 tomatoes, basil" saves the ingredients too.
 */
export function MealComposer({ recipes }: { recipes: Recipe[] }) {
  const { household, uid, toast } = useApp()
  const [text, setText] = useState('')
  const [photo, setPhoto] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

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
    createRecipe(household.id, uid, name, ingredients, photo)
    setText('')
    setPhoto(null)
    toast(ingredients.length ? `Saved ${name} with ${ingredients.length} ingredients` : `Saved ${name}`)
  }

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      setPhoto(await compressImage(file))
    } catch {
      toast('Couldn’t read that photo')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="toolbar-inner">
      <form className="quick-add" onSubmit={submit}>
        <span className="quick-plus composer-emoji" aria-hidden="true">
          🍲
        </span>
        {photo && (
          <span className="pending-photo">
            <img src={photo} alt="Photo to add" />
            <button type="button" onClick={() => setPhoto(null)} aria-label="Remove photo">
              <CloseIcon />
            </button>
          </span>
        )}
        <input
          className="quick-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={photo ? 'Name this meal' : 'Save a meal…'}
          aria-label="Save a meal"
          autoComplete="off"
          autoCapitalize="sentences"
          enterKeyHint="done"
          maxLength={400}
        />
        {text.trim() ? (
          <button type="submit" className="quick-btn quick-send" aria-label="Save meal">
            <ArrowUp />
          </button>
        ) : (
          <label className="quick-btn" aria-label="Add a meal photo" data-busy={busy || undefined}>
            <CameraIcon />
            <input type="file" accept="image/*" hidden onChange={onFile} />
          </label>
        )}
      </form>
    </div>
  )
}
