import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { ListId } from '../types'

interface Props {
  title: string
  onClose: () => void
  list?: ListId
  children: ReactNode
}

/** iOS-style sheet: tap outside, press Escape, tap Done or drag the handle down to close. */
export function Sheet({ title, onClose, list, children }: Props) {
  const panel = useRef<HTMLDivElement>(null)
  const drag = useRef<{ y: number; dy: number } | null>(null)
  const close = useRef(onClose)
  close.current = onClose

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close.current()
    window.addEventListener('keydown', onKey)
    document.documentElement.classList.add('sheet-open')
    return () => {
      window.removeEventListener('keydown', onKey)
      document.documentElement.classList.remove('sheet-open')
    }
  }, [])

  const onDown = (e: React.PointerEvent) => {
    drag.current = { y: e.clientY, dy: 0 }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current || !panel.current) return
    drag.current.dy = Math.max(0, e.clientY - drag.current.y)
    panel.current.style.transition = 'none'
    panel.current.style.transform = `translateY(${drag.current.dy}px)`
  }
  const onUp = () => {
    const d = drag.current
    drag.current = null
    if (!d || !panel.current) return
    panel.current.style.transition = ''
    panel.current.style.transform = ''
    if (d.dy > 90) close.current()
  }

  return createPortal(
    <div className="sheet-layer" data-list={list}>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} ref={panel}>
        <div
          className="sheet-handle"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        >
          <span className="sheet-grabber" />
        </div>
        <div className="sheet-bar">
          <h2 className="sheet-title">{title}</h2>
          <button className="sheet-done" onClick={onClose}>
            Done
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}
