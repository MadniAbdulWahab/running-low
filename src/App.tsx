import type { User } from 'firebase/auth'
import { useCallback, useEffect, useState } from 'react'
import { HouseholdSetup } from './components/HouseholdSetup'
import { RoomShell } from './components/RoomShell'
import { SignIn } from './components/SignIn'
import { configured } from './firebase'
import { useAuth } from './hooks/useAuth'
import { useHousehold } from './hooks/useHousehold'
import { useKeyboard } from './hooks/useKeyboard'
import { useRoomTheme, useThemePref, type ThemeState } from './hooks/useTheme'
import { ROOM_ORDER } from './rooms'
import type { RoomId } from './types'

const ROOM_KEY = 'outof.room'

/** A known tab, or null. Grocery and Household were once tabs of their own; they live in Shopping now. */
function asRoom(r: unknown): RoomId | null {
  if (r === 'grocery' || r === 'household') return 'shopping'
  return ROOM_ORDER.includes(r as RoomId) ? (r as RoomId) : null
}

function readRoom(): RoomId {
  // Opened from a notification: /?room=us
  const fromUrl = asRoom(new URLSearchParams(location.search).get('room'))
  if (fromUrl) {
    history.replaceState(null, '', location.pathname)
    return fromUrl
  }
  try {
    const r = asRoom(localStorage.getItem(ROOM_KEY))
    if (r) return r
  } catch {}
  return 'home'
}

/** Sign-in, setup and loading screens use the home colours. */
function Plain({ theme, children }: { theme: ThemeState; children?: React.ReactNode }) {
  useRoomTheme('home', theme.mode)
  return <>{children}</>
}

export default function App() {
  const theme = useThemePref()
  const { user, loading } = useAuth()
  useKeyboard()

  if (!configured) {
    return (
      <Plain theme={theme}>
        <main className="intro">
          <h1 className="large-title">Almost ready</h1>
          <p className="intro-lede">
            Add your Firebase web config to <code>.env.local</code> (see <code>.env.example</code>), or set{' '}
            <code>VITE_USE_EMULATORS=true</code> to run against the local emulators.
          </p>
        </main>
      </Plain>
    )
  }
  if (loading) return <Plain theme={theme} />
  if (!user)
    return (
      <Plain theme={theme}>
        <SignIn />
      </Plain>
    )
  return <SignedIn key={user.uid} user={user} theme={theme} />
}

function SignedIn({ user, theme }: { user: User; theme: ThemeState }) {
  const { loading, household } = useHousehold(user.uid)
  const [room, setRoomState] = useState<RoomId>(readRoom)
  const setRoom = useCallback((r: RoomId) => {
    setRoomState(r)
    try {
      localStorage.setItem(ROOM_KEY, r)
    } catch {}
  }, [])

  // A notification tapped while the app is already open asks to switch tab.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const onMessage = (e: MessageEvent) => {
      const r = asRoom(e.data?.room)
      if (e.data?.type === 'open-room' && r) setRoom(r)
    }
    navigator.serviceWorker.addEventListener('message', onMessage)
    return () => navigator.serviceWorker.removeEventListener('message', onMessage)
  }, [setRoom])

  if (loading) return <Plain theme={theme} />
  if (!household)
    return (
      <Plain theme={theme}>
        <HouseholdSetup user={user} />
      </Plain>
    )
  return <RoomShell uid={user.uid} household={household} room={room} setRoom={setRoom} theme={theme} />
}
