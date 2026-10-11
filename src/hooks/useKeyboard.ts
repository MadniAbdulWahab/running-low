import { useEffect } from 'react'

const isTyping = () => {
  const el = document.activeElement
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || (el as HTMLElement).isContentEditable)
}

/**
 * iOS doesn't shrink the layout viewport when the keyboard opens, so the
 * bottom dock would hide behind it. Lift the dock by the covered height (--kb),
 * but only while something is focused for typing and the gap is keyboard-sized:
 * the visual viewport also shifts a little while scrolling or bouncing, and
 * reacting to that made the tab bar drift.
 */
export function useKeyboard() {
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const root = document.documentElement
    let frame = 0
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const covered = window.innerHeight - vv.height - vv.offsetTop
        const kb = isTyping() && covered > 120 ? Math.round(covered) : 0
        root.style.setProperty('--kb', `${kb}px`)
        root.toggleAttribute('data-kb', kb > 0)
      })
    }
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    document.addEventListener('focusin', update)
    document.addEventListener('focusout', update)
    update()
    return () => {
      cancelAnimationFrame(frame)
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
      document.removeEventListener('focusin', update)
      document.removeEventListener('focusout', update)
    }
  }, [])
}
