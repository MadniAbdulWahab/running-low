import { createPortal } from 'react-dom'
import { useScrollLock } from '../hooks/useScrollLock'

export function PhotoViewer({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  useScrollLock()
  return createPortal(
    <button className="photo-viewer" onClick={onClose} aria-label="Close photo">
      <img src={src} alt={alt} />
    </button>,
    document.body,
  )
}
