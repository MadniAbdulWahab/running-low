import { useRef, useState } from 'react'
import { useApp } from '../../app-context'
import { saveMeal, splitIngredients, type Meal } from '../../data/meals'
import { compressImage } from '../../data/photos'
import { deleteRecipe, setRecipePhoto, updateRecipe, usedRecipe, type Recipe } from '../../data/recipes'
import { usePhoto } from '../../hooks/usePhoto'
import { emojiFor } from '../../lib/emoji'
import { parseISO, toISO } from '../../lib/time'
import { Alert, type AlertAction } from '../Alert'
import { CameraIcon } from '../Icons'
import { PhotoViewer } from '../PhotoViewer'
import { Sheet } from '../Sheet'
import { ingredientEntries } from './MealPlanner'

/** Today and the six days after it, for "Plan it for…". */
function nextDays(): { day: string; label: string; date: number }[] {
  const t = new Date()
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(t.getFullYear(), t.getMonth(), t.getDate() + i)
    const label = i === 0 ? 'Today' : d.toLocaleDateString(undefined, { weekday: 'short' })
    return { day: toISO(d), label, date: d.getDate() }
  })
}

/** A saved meal: edit it, plan it for a day, or send its ingredients to Groceries. */
export function RecipeSheet({ recipe, meals, onClose }: { recipe: Recipe; meals: Meal[] | null; onClose: () => void }) {
  const { household, uid, add, byKey, toast } = useApp()
  const hid = household.id
  const [name, setName] = useState(recipe.name)
  const [ingredients, setIngredients] = useState(recipe.ingredients.join(', '))
  const [alert, setAlert] = useState<{ title: string; message?: string; actions: AlertAction[] } | null>(null)
  const photo = usePhoto(hid, recipe.photoId)
  const [busy, setBusy] = useState(false)
  const [viewing, setViewing] = useState(false)
  // A planned day may still show the old photo; keep it for that day.
  const photoInUse = !!recipe.photoId && (meals ?? []).some((m) => m.photoId === recipe.photoId)

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      setRecipePhoto(hid, recipe, await compressImage(file), photoInUse)
    } catch {
      toast('Couldn’t read that photo')
    } finally {
      setBusy(false)
    }
  }
  const fileInput = <input type="file" accept="image/*" hidden onChange={onFile} />
  const latest = useRef({ name, ingredients })
  latest.current = { name, ingredients }
  const saved = useRef(JSON.stringify([recipe.name, recipe.ingredients]))

  const save = () => {
    const n = latest.current.name.trim() || recipe.name // never save a meal without a name
    const list = splitIngredients(latest.current.ingredients)
    const key = JSON.stringify([n, list])
    if (key === saved.current) return
    saved.current = key
    updateRecipe(hid, recipe.id, n, list)
  }
  const finish = () => {
    save()
    onClose()
  }

  const list = splitIngredients(ingredients)
  const planned = new Map((meals ?? []).filter((m) => m.name).map((m) => [m.day, m.name]))

  const planOn = (day: string, label: string) => {
    const n = name.trim() || recipe.name
    const doIt = () => {
      save()
      saveMeal(hid, uid, day, n, list, recipe.photoId)
      usedRecipe(hid, recipe.id)
      toast(`Planned ${n} for ${label === 'Today' ? 'today' : parseISO(day).toLocaleDateString(undefined, { weekday: 'long' })}`)
    }
    const already = planned.get(day)
    if (already && already.toLocaleLowerCase() !== n.toLocaleLowerCase()) {
      setAlert({
        title: `Replace ${already}?`,
        message: `${label === 'Today' ? 'Today' : parseISO(day).toLocaleDateString(undefined, { weekday: 'long' })} already has a meal planned.`,
        actions: [{ label: 'Cancel', style: 'cancel' }, { label: 'Replace', onSelect: doIt }],
      })
    } else doIt()
  }

  const askDelete = () =>
    setAlert({
      title: `Delete ${recipe.name}?`,
      message: 'It’s removed from Our meals on every phone. Days you’ve already planned keep it.',
      actions: [
        { label: 'Cancel', style: 'cancel' },
        {
          label: 'Delete',
          style: 'destructive',
          onSelect: () => {
            saved.current = 'deleted'
            latest.current = { name: recipe.name, ingredients: recipe.ingredients.join(', ') }
            deleteRecipe(hid, recipe, photoInUse)
            toast(`Deleted ${recipe.name}`)
            onClose()
          },
        },
      ],
    })

  return (
    <Sheet title={recipe.name || 'Meal'} onClose={finish}>
      <h3 className="group-label">Meal</h3>
      <div className="group">
        <label className="row">
          <span className="visually-hidden">Meal name</span>
          <input
            className="row-input"
            value={name}
            maxLength={80}
            placeholder="Meal name"
            autoCapitalize="sentences"
            onChange={(e) => setName(e.target.value)}
            onBlur={save}
          />
        </label>
      </div>

      <h3 className="group-label">Ingredients</h3>
      <div className="group">
        <label className="visually-hidden" htmlFor="recipe-ingredients">
          Ingredients
        </label>
        <textarea
          id="recipe-ingredients"
          className="note-input"
          rows={3}
          value={ingredients}
          placeholder="pasta, 2 tomatoes, basil…"
          onChange={(e) => setIngredients(e.target.value)}
          onBlur={save}
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

      <h3 className="group-label">Photo</h3>
      <div className="group">
        {photo ? (
          <>
            <button className="photo-frame" onClick={() => setViewing(true)} aria-label="View photo">
              <img src={photo} alt={`Photo of ${recipe.name}`} />
            </button>
            <label className="row row--action">
              Replace photo
              {fileInput}
            </label>
            <button className="row row--danger" onClick={() => setRecipePhoto(hid, recipe, null, photoInUse)}>
              Remove photo
            </button>
          </>
        ) : (
          <label className="row row--action">
            <CameraIcon />
            {busy ? 'Shrinking photo…' : 'Add a photo'}
            {fileInput}
          </label>
        )}
      </div>

      <h3 className="group-label">Plan it for</h3>
      <div className="plan-days" role="group" aria-label="Plan it for">
        {nextDays().map((d) => (
          <button
            key={d.day}
            className="plan-day"
            data-planned={planned.has(d.day) || undefined}
            onClick={() => planOn(d.day, d.label)}
            aria-label={`Plan for ${d.label}${planned.has(d.day) ? ` (has ${planned.get(d.day)})` : ''}`}
          >
            <span className="plan-day-label">{d.label}</span>
            <span className="plan-day-date">{d.date}</span>
          </button>
        ))}
      </div>

      <div className="group" style={{ marginTop: 24 }}>
        <button
          className="row row--action"
          disabled={!list.length}
          onClick={() => add(ingredientEntries(list, new Set(byKey.keys())), { list: 'grocery' })}
        >
          Add ingredients to Groceries
        </button>
        <button className="row row--danger" onClick={askDelete}>
          Delete meal
        </button>
      </div>
      {alert && <Alert {...alert} onClose={() => setAlert(null)} />}
      {viewing && photo && (
        <PhotoViewer src={photo} alt={`Photo of ${recipe.name}`} onClose={() => setViewing(false)} />
      )}
    </Sheet>
  )
}
