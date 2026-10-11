import type { User } from 'firebase/auth'
import { useCallback, useState } from 'react'
import { Backdrop } from './components/Backdrop'
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

function readRoom(): RoomId {
  try {
    const r = localStorage.getItem(ROOM_KEY) as RoomId | null
    if (r && ROOM_ORDER.includes(r)) return r
  } catch {}
  return 'home'
}

/** Sign-in, setup and loading screens all live in the Kitchen. */
function Kitchen({ theme, children }: { theme: ThemeState; children?: React.ReactNode }) {
  useRoomTheme('home', theme.mode)
  return (
    <>
      <Backdrop room="home" />
      {children}
    </>
  )
}

export default function App() {
  const theme = useThemePref()
  const { user, loading } = useAuth()
  useKeyboard()

  if (!configured) {
    return (
      <Kitchen theme={theme}>
        <main className="intro">
          <h1 className="intro-title">Almost ready</h1>
          <p className="intro-lede">
            Add your Firebase web config to <code>.env.local</code> (see <code>.env.example</code>), or set{' '}
            <code>VITE_USE_EMULATORS=true</code> to run against the local emulators.
          </p>
        </main>
      </Kitchen>
    )
  }
  if (loading) return <Kitchen theme={theme} />
  if (!user)
    return (
      <Kitchen theme={theme}>
        <SignIn />
      </Kitchen>
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

  if (loading) return <Kitchen theme={theme} />
  if (!household)
    return (
      <Kitchen theme={theme}>
        <HouseholdSetup user={user} />
      </Kitchen>
    )
  return <RoomShell uid={user.uid} household={household} room={room} setRoom={setRoom} theme={theme} />
}
