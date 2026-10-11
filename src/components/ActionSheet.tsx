import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useScrollLock } from '../hooks/useScrollLock'

export interface SheetAction {
  label: string
  onSelect: () => void
  destructive?: boolean
}

/** iOS-style action sheet: a stack of choices plus a separate Cancel button. */
export function ActionSheet({
  title,
  message,
  actions,
  onClose,
}: {
  title?: string
  message?: string
  actions: SheetAction[]
  onClose: () => void
}) {
  useScrollLock()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div className="action-layer">
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="action-sheet" role="dialog" aria-modal="true" aria-label={title ?? 'Actions'}>
        <div className="action-group">
          {(title || message) && (
            <div className="action-head">
              {title && <strong>{title}</strong>}
              {message && <span>{message}</span>}
            </div>
          )}
          {actions.map((a) => (
            <button
              key={a.label}
              className="action-btn"
              data-destructive={a.destructive || undefined}
              onClick={() => {
                onClose()
                a.onSelect()
              }}
            >
              {a.label}
            </button>
          ))}
        </div>
        <button className="action-btn action-cancel" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>,
    document.body,
  )
}
