import { FirebaseError } from 'firebase/app'
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from 'firebase/auth'
import { useState } from 'react'
import { auth } from '../firebase'

const MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'That email and password don’t match.',
  'auth/wrong-password': 'That email and password don’t match.',
  'auth/user-not-found': 'No account with that email yet. Create one below.',
  'auth/email-already-in-use': 'There’s already an account with that email. Sign in instead.',
  'auth/weak-password': 'Use at least 6 characters for the password.',
  'auth/invalid-email': 'That doesn’t look like an email address.',
  'auth/network-request-failed': 'No connection. Try again when you’re online.',
  'auth/too-many-requests': 'Too many tries. Wait a minute and try again.',
}

export function friendlyError(e: unknown): string {
  if (e instanceof FirebaseError) return MESSAGES[e.code] ?? `Something went wrong (${e.code}).`
  return 'Something went wrong. Try again?'
}

function needsInstall() {
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent)
  const standalone =
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches
  return ios && !standalone
}

export function SignIn() {
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setNote('')
    setBusy(true)
    try {
      if (mode === 'up') await createUserWithEmailAndPassword(auth, email.trim(), password)
      else await signInWithEmailAndPassword(auth, email.trim(), password)
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  const reset = async () => {
    setError('')
    if (!email.trim()) return setError('Type your email first, then tap “Forgot password”.')
    try {
      await sendPasswordResetEmail(auth, email.trim())
      setNote('Check your email for a reset link.')
    } catch (err) {
      setError(friendlyError(err))
    }
  }

  return (
    <main className="intro">
      <img className="intro-icon" src="/pwa-192x192.png" alt="" />
      <h1 className="large-title">Running Low</h1>
      <p className="intro-lede">Add what’s running low. It updates instantly for everyone you share it with.</p>

      {needsInstall() && (
        <p className="notice">
          <strong>Install it first:</strong> tap Share, then “Add to Home Screen”, and open it from there.
          The installed app keeps its own sign-in, separate from Safari.
        </p>
      )}

      <form onSubmit={submit}>
        <h2 className="group-label">{mode === 'up' ? 'Create an account' : 'Sign in'}</h2>
        <div className="group">
          <label className="row">
            <span className="row-key">Email</span>
            <input
              className="row-input"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="row">
            <span className="row-key">Password</span>
            <input
              className="row-input"
              type="password"
              autoComplete={mode === 'up' ? 'new-password' : 'current-password'}
              placeholder={mode === 'up' ? 'At least 6 characters' : 'Required'}
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        {note && <p className="form-note">{note}</p>}
        <button className="btn" disabled={busy}>
          {busy ? 'One moment…' : mode === 'up' ? 'Create account' : 'Sign in'}
        </button>
        <div className="form-links">
          <button
            type="button"
            className="link"
            onClick={() => {
              setMode(mode === 'in' ? 'up' : 'in')
              setError('')
            }}
          >
            {mode === 'in' ? 'New here? Create an account' : 'Have an account? Sign in'}
          </button>
          {mode === 'in' && (
            <button type="button" className="link" onClick={reset}>
              Forgot password
            </button>
          )}
        </div>
      </form>
    </main>
  )
}
