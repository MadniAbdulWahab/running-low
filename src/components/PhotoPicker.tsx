import { useRef, useState } from 'react'
import { initials } from '../app-context'
import { compressAvatar } from '../data/profiles'
import { CameraIcon } from './Icons'

/**
 * A big round photo with "Add a photo" / "Change photo" (and Remove). On iPhone the picker
 * offers Take Photo or the photo library. Used on setup and in Settings.
 */
export function PhotoPicker({
  photo,
  name,
  onChange,
  onError,
}: {
  photo: string | null
  name: string
  onChange: (photo: string | null) => void
  onError: (message: string) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      onChange(await compressAvatar(file))
    } catch {
      onError('Couldn’t read that photo. Try another one.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="photo-picker">
      <button
        type="button"
        className="photo-picker-face"
        onClick={() => input.current?.click()}
        aria-label={photo ? 'Change your photo' : 'Add a photo'}
        data-busy={busy || undefined}
      >
        {photo ? (
          <img src={photo} alt="" draggable={false} />
        ) : name.trim() ? (
          <span className="photo-picker-initial">{initials(name)}</span>
        ) : (
          <CameraIcon />
        )}
        <span className="photo-picker-badge" aria-hidden="true">
          <CameraIcon />
        </span>
      </button>
      <span className="photo-picker-actions">
        <button type="button" className="link" onClick={() => input.current?.click()} disabled={busy}>
          {busy ? 'Adding…' : photo ? 'Change photo' : 'Add a photo'}
        </button>
        {photo && !busy && (
          <button type="button" className="link link--quiet" onClick={() => onChange(null)}>
            Remove
          </button>
        )}
      </span>
      <input ref={input} type="file" accept="image/*" hidden onChange={onFile} />
    </div>
  )
}
