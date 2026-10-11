import { ROOMS } from '../rooms'
import type { Mode, RoomId, ThemePref } from '../types'

const KEY = 'outof.theme'

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

/** Puts room + mode on <html> and tints the iOS status bar to match. */
export function applyTheme(room: RoomId, mode: Mode) {
  const root = document.documentElement
  root.dataset.room = room
  root.dataset.mode = mode
  root.style.colorScheme = mode
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (!meta) {
    meta = document.createElement('meta')
    meta.name = 'theme-color'
    document.head.appendChild(meta)
  }
  meta.content = ROOMS[room].bg[mode]
}
