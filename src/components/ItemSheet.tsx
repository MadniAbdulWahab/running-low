import { useEffect, useRef, useState } from 'react'
import { memberOf, useApp } from '../app-context'
import { moveItem, setDue, setItemPhoto, setNote, setQty } from '../data/items'
import { compressImage } from '../data/photos'
import { usePhoto } from '../hooks/usePhoto'
import { ago } from '../lib/time'
import { LIST_INFO, LISTS } from '../rooms'
import type { Item } from '../types'
import { CameraIcon } from './Icons'
import { PhotoViewer } from './PhotoViewer'
import { Sheet } from './Sheet'

export function ItemSheet({ item, onClose }: { item: Item; onClose: () => void }) {
  const { household, uid, done, askUntick, askDelete, toast } = useApp()
  const hid = household.id
  const photo = usePhoto(hid, item.photoId)
  const [viewing, setViewing] = useState(false)
  const [busy, setBusy] = useState(false)
  const who = memberOf(household, item.addedBy, uid)
  const qty = item.qty ?? 1

  // The note saves as you type (debounced) and on leaving the field.
  const [note, setNoteDraft] = useState(item.note ?? '')
  const editing = useRef(false)
  const saved = useRef(item.note ?? '')
  useEffect(() => {
    // Take updates from the other phone, but never while typing.
    if (!editing.current) {
      setNoteDraft(item.note ?? '')
      saved.current = item.note ?? ''
    }
  }, [item.note])
  const saveNote = (value: string) => {
    if (value.trim() === saved.current.trim()) return
    saved.current = value
    setNote(hid, item, value)
  }
  useEffect(() => {
    if (!editing.current) return
    const t = window.setTimeout(() => saveNote(note), 700)
    return () => window.clearTimeout(t)
  }, [note])
  // Closing the sheet mid-sentence still saves what was typed.
  const latest = useRef(note)
  latest.current = note
  useEffect(() => () => saveNote(latest.current), [])

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
    <Sheet title={item.name} onClose={onClose} list={item.list}>
      <p className="sheet-meta">
        <i className="who-dot" data-p={who.idx} />
        Added by {who.name === 'You' ? 'you' : who.name} · {ago(item.addedAt)}
        {item.count > 1 && ` · ${item.count} times so far`}
      </p>

      <h3 className="group-label">Quantity</h3>
      <div className="group">
        <div className="row">
          <span className="row-label">How many</span>
          <span className="stepper">
            <button aria-label="One fewer" disabled={qty <= 1} onClick={() => setQty(hid, item, qty - 1)}>
              −
            </button>
            <span className="stepper-value" aria-live="polite">
              {qty}
            </span>
            <button aria-label="One more" disabled={qty >= 99} onClick={() => setQty(hid, item, qty + 1)}>
              +
            </button>
          </span>
        </div>
      </div>

      <h3 className="group-label">Note</h3>
      <div className="group">
        <label className="visually-hidden" htmlFor="item-note">
          Note
        </label>
        <textarea
          id="item-note"
          className="note-input"
          rows={3}
          maxLength={500}
          value={note}
          placeholder="Brand, size, anything to remember…"
          onFocus={() => (editing.current = true)}
          onChange={(e) => setNoteDraft(e.target.value)}
          onBlur={() => {
            editing.current = false
            saveNote(note)
          }}
        />
      </div>

      <h3 className="group-label">Photo</h3>
      <div className="group">
        {photo ? (
          <>
            <button className="photo-frame" onClick={() => setViewing(true)} aria-label="View photo">
              <img src={photo} alt={`Photo of ${item.name}`} />
            </button>
            <label className="row row--action">
              Replace photo
              {fileInput}
            </label>
            <button className="row row--danger" onClick={() => setItemPhoto(hid, item, null)}>
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
      {!photo && <p className="group-footer">Handy for remembering the exact brand.</p>}

      <h3 className="group-label">List</h3>
      <div className="group">
        <div className="row row--segmented">
          <div className="segmented">
            {LISTS.map((l) => (
              <button
                key={l}
                aria-pressed={item.list === l}
                onClick={() => item.list !== l && moveItem(hid, item, l)}
              >
                {LIST_INFO[l].label}
              </button>
            ))}
          </div>
        </div>
        {item.list === 'important' && (
          <label className="row">
            <span className="row-label">Due date</span>
            <input
              type="date"
              className="row-date"
              value={item.due ?? ''}
              onChange={(e) => setDue(hid, item, e.target.value || null)}
            />
          </label>
        )}
        {item.list === 'important' && item.due && (
          <button className="row row--action" onClick={() => setDue(hid, item, null)}>
            Clear due date
          </button>
        )}
      </div>

      <div className="group" style={{ marginTop: 28 }}>
        {item.status === 'needed' ? (
          <button
            className="row row--action"
            onClick={() => {
              done(item)
              onClose()
            }}
          >
            Mark as got
          </button>
        ) : (
          <button className="row row--action" onClick={() => askUntick(item)}>
            Put back on the list
          </button>
        )}
        <button className="row row--danger" onClick={() => askDelete(item)}>
          Delete
        </button>
      </div>

      {viewing && photo && (
        <PhotoViewer src={photo} alt={`Photo of ${item.name}`} onClose={() => setViewing(false)} />
      )}
    </Sheet>
  )
}
