import { createPortal } from 'react-dom'

export function PhotoViewer({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  return createPortal(
    <button className="photo-viewer" onClick={onClose} aria-label="Close photo">
      <img src={src} alt={alt} />
    </button>,
    document.body,
  )
}
