import { useEffect } from 'react'

let locks = 0
let savedY = 0

/**
 * Freezes the page behind a sheet or pop-up. `overflow: hidden` alone doesn't
 * stop iOS Safari scrolling the body, so pin it in place and restore the
 * scroll position afterwards. Counted, so nested pop-ups work.
 */
export function useScrollLock() {
  useEffect(() => {
    const body = document.body.style
    if (locks++ === 0) {
      savedY = window.scrollY
      body.position = 'fixed'
      body.top = `-${savedY}px`
      body.left = '0'
      body.right = '0'
      body.overflow = 'hidden'
    }
    return () => {
      if (--locks === 0) {
        body.position = ''
        body.top = ''
        body.left = ''
        body.right = ''
        body.overflow = ''
        window.scrollTo(0, savedY)
      }
    }
  }, [])
}
