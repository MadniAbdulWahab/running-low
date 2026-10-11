import { useEffect } from 'react'

export interface ToastData {
  id: number
  message: string
  undo?: () => void
}

export function Toast({ toast, onDone }: { toast: ToastData | null; onDone: () => void }) {
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(onDone, toast.undo ? 5000 : 3000)
    return () => window.clearTimeout(t)
  }, [toast, onDone])

  if (!toast) return null
  return (
    <div className="toast" key={toast.id} role="status" aria-live="polite">
      <span>{toast.message}</span>
      {toast.undo && (
        <button
          className="toast-undo"
          onClick={() => {
            toast.undo?.()
            onDone()
          }}
        >
          Undo
        </button>
      )}
    </div>
  )
}
