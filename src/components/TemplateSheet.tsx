import { useRef, useState } from 'react'
import { useApp } from '../app-context'
import { splitIngredients } from '../data/meals'
import { compressImage } from '../data/photos'
import {
  deleteTemplate,
  setTemplatePhoto,
  TEMPLATE_MAX,
  updateTemplate,
  usedTemplate,
  type Template,
} from '../data/templates'
import { usePhoto } from '../hooks/usePhoto'
import { Alert, type AlertAction } from './Alert'
import { CameraIcon } from './Icons'
import { PhotoViewer } from './PhotoViewer'
import { PickList } from './PickList'
import { Sheet } from './Sheet'
import { ingredientEntries } from './us/MealPlanner'

/**
 * A grocery template: tick what's needed and add it to Groceries in one go,
 * or edit its name, items and photo. A brand-new one left without items is discarded on close.
 */
export function TemplateSheet({ template, fresh, onClose }: { template: Template; fresh: boolean; onClose: () => void }) {
  const { household, byKey, toast } = useApp()
  const hid = household.id
  const [name, setName] = useState(fresh ? '' : template.name)
  const [text, setText] = useState(template.items.join(', '))
  const [alert, setAlert] = useState<{ title: string; message?: string; actions: AlertAction[] } | null>(null)
  const photo = usePhoto(hid, template.photoId)
  const [busy, setBusy] = useState(false)
  const [viewing, setViewing] = useState(false)

  const lines = splitIngredients(text, TEMPLATE_MAX)
  const entries = ingredientEntries(lines, new Set(byKey.keys()))

  const latest = useRef({ name, text })
  latest.current = { name, text }
  const saved = useRef(JSON.stringify([template.name, template.items]))
  const gone = useRef(false)

  const save = () => {
    if (gone.current) return
    const n = latest.current.name.trim() || template.name // never save a template without a name
    const list = splitIngredients(latest.current.text, TEMPLATE_MAX)
    const key = JSON.stringify([n, list])
    if (key === saved.current) return
    saved.current = key
    updateTemplate(hid, template.id, n, list)
  }
  const finish = () => {
    if (fresh && !splitIngredients(latest.current.text).length) {
      gone.current = true
      deleteTemplate(hid, template)
    } else save()
    onClose()
  }

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      setTemplatePhoto(hid, template, await compressImage(file))
    } catch {
      toast('Couldn’t read that photo')
    } finally {
      setBusy(false)
    }
  }
  const fileInput = <input type="file" accept="image/*" hidden onChange={onFile} />

  const askDelete = () =>
    setAlert({
      title: `Delete ${template.name}?`,
      message: 'It’s removed from Templates on every phone. Nothing on the list changes.',
      actions: [
        { label: 'Cancel', style: 'cancel' },
        {
          label: 'Delete',
          style: 'destructive',
          onSelect: () => {
            gone.current = true
            deleteTemplate(hid, template)
            toast(`Deleted ${template.name}`)
            onClose()
          },
        },
      ],
    })

  const title = name.trim() || template.name || 'Template'

  return (
    <Sheet title={fresh && !name.trim() ? 'New template' : title} list="grocery" onClose={finish}>
      {entries.length > 0 && (
        <>
          <h3 className="group-label">Add to Groceries</h3>
          <PickList
            entries={entries}
            label={(n) => `Add ${n === 1 ? '1 item' : `${n} items`} to Groceries`}
            onAdded={() => {
              save()
              usedTemplate(hid, template.id)
            }}
          />
          <p className="group-footer">Untick anything you don’t need this time.</p>
        </>
      )}

      <h3 className="group-label">Name</h3>
      <div className="group">
        <label className="row">
          <span className="visually-hidden">Template name</span>
          <input
            className="row-input"
            value={name}
            maxLength={60}
            placeholder="Weekly shop"
            autoCapitalize="sentences"
            autoFocus={fresh}
            onChange={(e) => setName(e.target.value)}
            onBlur={save}
          />
        </label>
      </div>

      <h3 className="group-label">Items</h3>
      <div className="group">
        <label className="visually-hidden" htmlFor="template-items">
          Items
        </label>
        <textarea
          id="template-items"
          className="note-input"
          rows={4}
          value={text}
          placeholder="2 milk, eggs, bread, dish soap…"
          onChange={(e) => setText(e.target.value)}
          onBlur={save}
        />
      </div>
      <p className="group-footer">Separate with commas. Put a number first for a quantity, like “2 milk”.</p>

      <h3 className="group-label">Photo</h3>
      <div className="group">
        {photo ? (
          <>
            <button className="photo-frame" onClick={() => setViewing(true)} aria-label="View photo">
              <img src={photo} alt={`Photo of ${template.name}`} />
            </button>
            <label className="row row--action">
              Replace photo
              {fileInput}
            </label>
            <button className="row row--danger" onClick={() => setTemplatePhoto(hid, template, null)}>
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

      <div className="group" style={{ marginTop: 24 }}>
        <button className="row row--danger" onClick={askDelete}>
          Delete template
        </button>
      </div>
      {alert && <Alert {...alert} onClose={() => setAlert(null)} />}
      {viewing && photo && (
        <PhotoViewer src={photo} alt={`Photo of ${template.name}`} onClose={() => setViewing(false)} />
      )}
    </Sheet>
  )
}
