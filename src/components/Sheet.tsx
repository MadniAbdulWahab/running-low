import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useScrollLock } from '../hooks/useScrollLock'
import type { ListId } from '../types'

interface Props {
  title: string
  onClose: () => void
  list?: ListId
  children: ReactNode
}

const CLOSE_AT = 110 // px dragged down before letting go closes the sheet
const TYPING = 'input, textarea, select, [contenteditable="true"]'

/**
 * iOS-style sheet. The page behind is frozen; the sheet itself follows your
 * finger: drag down from anywhere (once its content is scrolled to the top)
 * to close. Tap outside, press Escape or tap Done also close it.
 */
export function Sheet({ title, onClose, list, children }: Props) {
  useScrollLock()
  const panel = useRef<HTMLDivElement>(null)
  const close = useRef(onClose)
  close.current = onClose

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close.current()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Shared drag logic for touch (anywhere on the sheet) and mouse (the handle).
  const drag = useRef<{ y: number; dy: number; active: boolean; t: number } | null>(null)
  const move = (dy: number) => {
    const el = panel.current
    if (!el) return
    el.style.transition = 'none'
    el.style.transform = `translateY(${Math.max(0, dy)}px)`
  }
  const release = () => {
    const d = drag.current
    drag.current = null
    const el = panel.current
    if (!d || !el) return
    el.style.transition = ''
    el.style.transform = ''
    const fast = d.dy > 40 && d.dy / Math.max(1, Date.now() - d.t) > 0.6
    if (d.active && (d.dy > CLOSE_AT || fast)) close.current()
  }

  useEffect(() => {
    const el = panel.current
    if (!el) return
    const onStart = (e: TouchEvent) => {
      if ((e.target as Element).closest(TYPING)) return
      drag.current = { y: e.touches[0].clientY, dy: 0, active: false, t: Date.now() }
    }
    const onMove = (e: TouchEvent) => {
      const d = drag.current
      if (!d) return
      const dy = e.touches[0].clientY - d.y
      // Only take over when pulling down from the top; otherwise let the content scroll.
      if (!d.active && (dy <= 0 || el.scrollTop > 0)) return
      d.active = true
      d.dy = dy
      e.preventDefault()
      move(dy)
    }
    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', release)
    el.addEventListener('touchcancel', release)
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', release)
      el.removeEventListener('touchcancel', release)
    }
  }, [])

  const onHandleDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return // touch is handled above
    drag.current = { y: e.clientY, dy: 0, active: true, t: Date.now() }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onHandleMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d || e.pointerType === 'touch') return
    d.dy = e.clientY - d.y
    move(d.dy)
  }

  return createPortal(
    <div className="sheet-layer" data-list={list}>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} ref={panel}>
        <div
          className="sheet-handle"
          onPointerDown={onHandleDown}
          onPointerMove={onHandleMove}
          onPointerUp={release}
          onPointerCancel={release}
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
