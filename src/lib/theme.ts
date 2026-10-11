import type { Mode, RoomId, ThemePref } from '../types'

const KEY = 'outof.theme'
const BAR: Record<Mode, string> = { light: '#F2F2F7', dark: '#000000' }

export function readPref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'light' || v === 'dark' || v === 'system') return v
  } catch {}
  return 'system'
}

export function writePref(p: ThemePref) {
  try {
    localStorage.setItem(KEY, p)
  } catch {}
}

export const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)')

export function resolveMode(p: ThemePref): Mode {
  if (p === 'system') return darkQuery().matches ? 'dark' : 'light'
  return p
}

/** Puts mode (and the open list, for its colour) on <html> and tints the iOS status bar. */
export function applyTheme(room: RoomId, mode: Mode) {
  const root = document.documentElement
  root.dataset.mode = mode
  // Only the three lists colour the page; Home and Us use the brand.
  if (room === 'home' || room === 'us') delete root.dataset.list
  else root.dataset.list = room
  root.style.colorScheme = mode
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (!meta) {
    meta = document.createElement('meta')
    meta.name = 'theme-color'
    document.head.appendChild(meta)
  }
  meta.content = BAR[mode]
}
