import { useEffect, useState } from 'react'
import { applyTheme, darkQuery, readPref, resolveMode, writePref } from '../lib/theme'
import type { Mode, RoomId, ThemePref } from '../types'

export interface ThemeState {
  pref: ThemePref
  setPref: (p: ThemePref) => void
  mode: Mode
}

/** The System / Light / Dark preference, resolved against the iPhone setting. */
export function useThemePref(): ThemeState {
  const [pref, setPrefState] = useState<ThemePref>(readPref)
  const [mode, setMode] = useState<Mode>(() => resolveMode(readPref()))

  useEffect(() => {
    setMode(resolveMode(pref))
    if (pref !== 'system') return
    const q = darkQuery()
    const onChange = () => setMode(resolveMode('system'))
    q.addEventListener('change', onChange)
    return () => q.removeEventListener('change', onChange)
  }, [pref])

  const setPref = (p: ThemePref) => {
    writePref(p)
    setPrefState(p)
  }
  return { pref, setPref, mode }
}

/** Whichever screen is showing decides the room palette. */
export function useRoomTheme(room: RoomId, mode: Mode) {
  useEffect(() => applyTheme(room, mode), [room, mode])
}
