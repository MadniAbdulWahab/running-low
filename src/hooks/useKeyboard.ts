import { useEffect } from 'react'

/**
 * iOS doesn't shrink the layout viewport when the keyboard opens, so the
 * bottom dock would hide behind it. Track the covered height as --kb.
 */
export function useKeyboard() {
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const root = document.documentElement
    const update = () => {
      const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
      root.style.setProperty('--kb', `${Math.round(kb)}px`)
      root.toggleAttribute('data-kb', kb > 80)
    }
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    update()
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])
}
