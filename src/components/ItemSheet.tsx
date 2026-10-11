import { useState } from 'react'
import { memberOf, useApp } from '../app-context'
import { deleteItem, moveItem, setDue, setItemPhoto } from '../data/items'
import { compressImage } from '../data/photos'
import { usePhoto } from '../hooks/usePhoto'
import { ago } from '../lib/time'
import { LISTS, ROOMS } from '../rooms'
import type { Item } from '../types'
import { CameraIcon } from './Icons'
import { PhotoViewer } from './PhotoViewer'
import { Sheet } from './Sheet'

export function ItemSheet({ item, onClose }: { item: Item; onClose: () => void }) {
  const { household, uid, done, add, toast } = useApp()
  const hid = household.id
  const photo = usePhoto(hid, item.photoId)
  const [viewing, setViewing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)
  const who = memberOf(household, item.addedBy, uid)

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      setItemPhoto(hid, item, await compressImage(file))
    } catch {
      toast('Couldn’t read that photo')
    } finally {
      setBusy(false)
    }
  }

  const fileInput = <input type="file" accept="image/*" hidden onChange={onFile} />

  return (
    <Sheet label={item.name} onClose={onClose} palette={item.list}>
      <h2 className="sheet-title">{item.name}</h2>
      <p className="sheet-meta">
        <i className="who-dot" data-p={who.idx} />
        Added by {who.name === 'You' ? 'you' : who.name} · {ago(item.addedAt)}
        {item.count > 1 && ` · ${item.count} times so far`}
      </p>

      <div className="photo-block">
        {photo ? (
          <>
            <button className="photo-frame" onClick={() => setViewing(true)}>
              <img src={photo} alt={`Photo of ${item.name}`} />
            </button>
            <div className="photo-actions">
              <label className="btn btn--quiet">
                Replace
                {fileInput}
              </label>
              <button className="btn btn--quiet" onClick={() => setItemPhoto(hid, item, null)}>
                Remove photo
              </button>
            </div>
          </>
        ) : (
          <label className="photo-empty" data-busy={busy || undefined}>
            <CameraIcon />
            <span>
              {busy ? 'Shrinking photo…' : 'Add a photo'}
              <small>So you grab the right brand</small>
            </span>
            {fileInput}
          </label>
        )}
      </div>

      <div className="field">
        <span className="field-label">Room</span>
        <div className="segmented">
          {LISTS.map((l) => (
            <button
              key={l}
              data-palette={l}
              aria-pressed={item.list === l}
              onClick={() => item.list !== l && moveItem(hid, item, l)}
            >
              {ROOMS[l].label}
            </button>
          ))}
        </div>
      </div>

      {item.list === 'important' && (
        <label className="field">
          <span className="field-label">Due date</span>
          <span className="due-row">
            <input
              type="date"
              className="input"
              value={item.due ?? ''}
              onChange={(e) => setDue(hid, item, e.target.value || null)}
            />
            {item.due && (
              <button type="button" className="btn btn--quiet" onClick={() => setDue(hid, item, null)}>
                Clear
              </button>
            )}
          </span>
        </label>
      )}

      <div className="sheet-actions">
        {item.status === 'needed' ? (
          <button
            className="btn btn--primary"
            onClick={() => {
              done(item)
              onClose()
            }}
          >
            Got it
          </button>
        ) : (
          <button
            className="btn btn--primary"
            onClick={() => {
              add([item.name], { list: item.list })
              onClose()
            }}
          >
            Add to the list again
          </button>
        )}
        <button
          className="btn btn--danger"
          onClick={() => {
            if (!confirmDelete) return setConfirmDelete(true)
            deleteItem(hid, item)
            toast(`Deleted ${item.name}`)
            onClose()
          }}
        >
          {confirmDelete ? 'Tap again to delete for good' : 'Delete'}
        </button>
      </div>

      {viewing && photo && (
        <PhotoViewer src={photo} alt={`Photo of ${item.name}`} onClose={() => setViewing(false)} />
      )}
    </Sheet>
  )
}
