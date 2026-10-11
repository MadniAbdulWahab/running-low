import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useScrollLock } from '../hooks/useScrollLock'

export interface AlertAction {
  label: string
  onSelect?: () => void
  style?: 'default' | 'cancel' | 'destructive'
}

/** iOS-style centred alert: title, message and side-by-side buttons. */
export function Alert({
  title,
  message,
  actions,
  onClose,
}: {
  title: string
  message?: string
  actions: AlertAction[]
  onClose: () => void
}) {
  useScrollLock()
  const first = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    first.current?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div className="alert-layer">
      <div className="alert-backdrop" onClick={onClose} />
      <div className="alert" role="alertdialog" aria-modal="true" aria-label={title}>
        <div className="alert-text">
          <strong>{title}</strong>
          {message && <span>{message}</span>}
        </div>
        <div className="alert-actions" data-stacked={actions.length > 2 || undefined}>
          {actions.map((a, i) => (
            <button
              key={a.label}
              ref={i === 0 ? first : undefined}
              className="alert-btn"
              data-style={a.style ?? 'default'}
              onClick={() => {
                onClose()
                a.onSelect?.()
              }}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  )
}
