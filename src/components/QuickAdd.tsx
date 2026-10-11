import { useMemo, useState } from 'react'
import { useApp, type AddOptions } from '../app-context'
import { compressImage } from '../data/photos'
import { cleanName, normalizeKey, splitEntry } from '../lib/parse'
import { LIST_INFO, LISTS } from '../rooms'
import type { Item, ListId, RoomId } from '../types'
import { ArrowUp, CameraIcon, CloseIcon, PlusCircle } from './Icons'

export function QuickAdd({ room }: { room: RoomId }) {
  const { items, byKey, add, toast } = useApp()
  const [text, setText] = useState('')
  const [photo, setPhoto] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [focused, setFocused] = useState(false)
  const [picked, setPicked] = useState<ListId>('grocery')
  const [chipTouched, setChipTouched] = useState(false)
  const known = useMemo(() => new Set(byKey.keys()), [byKey])

  // On the home screen, guess the list from history as you type, until the chip is tapped.
  const chip: ListId = chipTouched ? picked : (byKey.get(normalizeKey(text))?.list ?? picked)

  const suggestions = useMemo(() => {
    const q = normalizeKey(text)
    if (!q || photo) return []
    const starts = (i: Item) => Number(i.key.startsWith(q))
    return items
      .filter((i) => i.status !== 'needed' && i.key.includes(q) && (room === 'home' || i.list === room))
      .sort((a, b) => starts(b) - starts(a) || b.count - a.count)
      .slice(0, 4)
  }, [text, items, room, photo])

  const target = (): AddOptions =>
    room === 'home' ? (chipTouched ? { list: chip } : { fallback: chip }) : { list: room }

  const reset = () => {
    setText('')
    setPhoto(null)
    setChipTouched(false)
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (photo) {
      const time = new Date().toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
      add([cleanName(text) || `Photo, ${time}`], { ...target(), photo })
    } else {
      const names = splitEntry(text, known)
      if (!names.length) return
      add(names, target())
    }
    reset()
  }

  const pick = (item: Item) => {
    add([item.name], { list: room === 'home' ? item.list : room })
    reset()
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

  const cycleChip = () => {
    setPicked(LISTS[(LISTS.indexOf(chip) + 1) % LISTS.length])
    setChipTouched(true)
  }

  const canAdd = Boolean(text.trim() || photo)
  const placeholder = photo ? 'What is it? (optional)' : room === 'home' ? 'New item' : `Add to ${LIST_INFO[room].label}`

  return (
    <div className="toolbar-inner">
      {focused && suggestions.length > 0 && (
        <ul className="suggest" aria-label="Suggestions">
          {suggestions.map((s) => (
            <li key={s.id} data-list={s.list}>
              <button
                type="button"
                // Keep the keyboard up while tapping a suggestion.
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => pick(s)}
              >
                <i />
                {s.name}
                <span className="suggest-list">{LIST_INFO[s.list].label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <form className="quick-add" onSubmit={submit}>
        {room === 'home' ? (
          <button
            type="button"
            className="list-chip"
            data-list={chip}
            onPointerDown={(e) => e.preventDefault()}
            onClick={cycleChip}
            aria-label={`Adding to ${LIST_INFO[chip].label}. Tap to change.`}
          >
            <i />
            {LIST_INFO[chip].label}
          </button>
        ) : (
          <span className="quick-plus">
            <PlusCircle />
          </span>
        )}
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
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          aria-label="Add something"
          autoComplete="off"
          autoCapitalize="sentences"
          enterKeyHint="done"
          maxLength={300}
        />
        {canAdd ? (
          <button type="submit" className="quick-btn quick-send" aria-label="Add">
            <ArrowUp />
          </button>
        ) : (
          <label className="quick-btn" aria-label="Add with a photo" data-busy={busy || undefined}>
            <CameraIcon />
            <input type="file" accept="image/*" hidden onChange={onFile} />
          </label>
        )}
      </form>
    </div>
  )
}
