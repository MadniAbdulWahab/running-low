import { FirebaseError } from 'firebase/app'
import { signOut, type User } from 'firebase/auth'
import { useState } from 'react'
import { CODE_RE, createHousehold, formatCode, joinHousehold, parseCode } from '../data/household'
import { auth } from '../firebase'
import { friendlyError } from './SignIn'

export function HouseholdSetup({ user }: { user: User }) {
  const [name, setName] = useState(user.displayName ?? '')
  const [homeName, setHomeName] = useState('Our home')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState<'create' | 'join' | null>(null)
  const [error, setError] = useState('')
  const [slow, setSlow] = useState(false)

  const run = async (kind: 'create' | 'join', fn: () => Promise<unknown>) => {
    setError('')
    if (!name.trim()) return setError('Add your name first, so everyone on the list knows who added what.')
    setBusy(kind)
    const t = window.setTimeout(() => setSlow(true), 5000)
    try {
      await fn()
    } catch (e) {
      if (kind === 'join' && e instanceof FirebaseError) {
        setError(
          e.code === 'not-found' || e.code === 'permission-denied'
            ? 'That code didn’t work. Check it, or the list may already be full.'
            : friendlyError(e),
        )
      } else setError(friendlyError(e))
    } finally {
      window.clearTimeout(t)
      setSlow(false)
      setBusy(null)
    }
  }

  const me = name.trim().slice(0, 60)
  const parsed = parseCode(code)

  return (
    <main className="intro">
      <h1 className="large-title">Set up your list</h1>
      <p className="intro-lede">Start a new list, or join one with a code.</p>

      <h2 className="group-label">About you</h2>
      <div className="group">
        <label className="row">
          <span className="row-key">Your name</span>
          <input
            className="row-input"
            value={name}
            maxLength={60}
            autoComplete="given-name"
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Sam"
          />
        </label>
      </div>
      <p className="group-footer">Shown next to the things you add.</p>

      <h2 className="group-label">Start a new list</h2>
      <div className="group">
        <label className="row">
          <span className="row-key">List name</span>
          <input
            className="row-input"
            value={homeName}
            maxLength={60}
            onChange={(e) => setHomeName(e.target.value)}
          />
        </label>
      </div>
      <button
        className="btn"
        disabled={busy !== null}
        onClick={() => run('create', () => createHousehold(user.uid, me, homeName.trim().slice(0, 60) || 'Our home'))}
      >
        {busy === 'create' ? 'Creating…' : 'Start our list'}
      </button>

      <h2 className="group-label" style={{ marginTop: 36 }}>
        Join a shared list
      </h2>
      <div className="group">
        <label className="row">
          <span className="row-key">Code</span>
          <input
            className="row-input row-input--code"
            value={parsed.length > 4 ? formatCode(parsed) : parsed}
            onChange={(e) => setCode(e.target.value)}
            placeholder="XXXX-XXXX"
            autoCapitalize="characters"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </label>
      </div>
      <button
        className="btn btn--plain"
        disabled={busy !== null || !CODE_RE.test(parsed)}
        onClick={() => run('join', () => joinHousehold(user.uid, me, parsed))}
      >
        {busy === 'join' ? 'Joining…' : 'Join with a code'}
      </button>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {slow && <p className="form-note">Waiting for a connection…</p>}

      <p className="intro-foot">
        Signed in as {user.email} ·{' '}
        <button className="link" onClick={() => signOut(auth)}>
          Sign out
        </button>
      </p>
    </main>
  )
}
