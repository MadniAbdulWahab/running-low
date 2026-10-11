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
    <main className="auth-screen">
      <header className="auth-brand">
        <img className="auth-logo" src="/maskable-icon-512x512.png?v=basket" alt="" />
        <h1 className="large-title">Running Low</h1>
        <p className="auth-tagline">Keep your home stocked, together.</p>
      </header>

      <form className="auth-form" onSubmit={submit} aria-label={mode === 'up' ? 'Create an account' : 'Sign in'} aria-busy={busy}>
        <h2 className="auth-title">{mode === 'up' ? 'Create your account' : 'Welcome back'}</h2>
        <div className="auth-fields">
          <label className="auth-field">
            <span className="auth-field-name">Email</span>
            <input
              className="auth-input"
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              inputMode="email"
              enterKeyHint="next"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="auth-field">
            <span className="auth-field-name">Password</span>
            <input
              className="auth-input"
              type="password"
              autoComplete={mode === 'up' ? 'new-password' : 'current-password'}
              placeholder={mode === 'up' ? 'At least 6 characters' : 'Enter your password'}
              enterKeyHint="done"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
        </div>
        {mode === 'in' ? (
          <div className="auth-recovery">
            <button type="button" className="auth-link" onClick={reset} disabled={busy}>
              Forgot password?
            </button>
          </div>
        ) : (
          <p className="auth-password-note">Use at least 6 characters.</p>
        )}
        {error && <p className="auth-feedback form-error" role="alert">{error}</p>}
        {note && <p className="auth-feedback form-note" role="status">{note}</p>}
        <button type="submit" className="btn auth-submit" disabled={busy}>
          {busy ? 'One moment…' : mode === 'up' ? 'Create account' : 'Sign in'}
        </button>
      </form>

      <footer className="auth-footer">
        <p>{mode === 'in' ? 'New to Running Low?' : 'Already have an account?'}</p>
        <button
          type="button"
          className="auth-secondary"
          disabled={busy}
          onClick={() => {
            setMode(mode === 'in' ? 'up' : 'in')
            setError('')
            setNote('')
          }}
        >
          {mode === 'in' ? 'Create an account' : 'Sign in instead'}
        </button>
      </footer>

      {needsInstall() && (
        <aside className="auth-install">
          <strong>Add to your Home Screen</strong>
          <p>In Safari, tap Share → Add to Home Screen. Open Running Low from there before signing in.</p>
        </aside>
      )}
    </main>
  )
}
