import { signOut } from 'firebase/auth'
import { useState } from 'react'
import { initials, useApp } from '../app-context'
import { formatCode, renameHousehold, setMyName } from '../data/household'
import { auth } from '../firebase'
import type { ThemeState } from '../hooks/useTheme'
import type { ThemePref } from '../types'
import { Sheet } from './Sheet'

const PREFS: { id: ThemePref; label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
]

export function SettingsSheet({ onClose, theme }: { onClose: () => void; theme: ThemeState }) {
  const { household, uid, toast } = useApp()
  const [homeName, setHomeName] = useState(household.name)
  const [myName, setMyNameDraft] = useState(household.memberNames[uid] ?? '')
  const code = formatCode(household.id)
  const waiting = household.members.length < 2

  const share = async () => {
    const text =
      `Join our shared list in Running Low. ` +
      `Open it in Safari, tap Share → Add to Home Screen, then open it from your Home Screen, ` +
      `make an account, choose “Join with a code” and enter ${code}.`
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Running Low', text, url: location.origin })
      } catch {}
      return
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${location.origin}`)
      toast('Invite copied')
    } catch {
      toast(`Your code is ${code}`)
    }
  }

  const saveHome = () => {
    const v = homeName.trim()
    if (v && v !== household.name) renameHousehold(household, v.slice(0, 60))
    else setHomeName(household.name)
  }
  const saveMe = () => {
    const v = myName.trim()
    if (v && v !== household.memberNames[uid]) setMyName(household, uid, v.slice(0, 60))
    else setMyNameDraft(household.memberNames[uid] ?? '')
  }

  return (
    <Sheet label="Settings" onClose={onClose}>
      <h2 className="sheet-title">Settings</h2>

      <label className="field">
        <span className="field-label">Household</span>
        <input
          className="input"
          value={homeName}
          maxLength={60}
          onChange={(e) => setHomeName(e.target.value)}
          onBlur={saveHome}
          enterKeyHint="done"
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        />
      </label>

      <div className="field">
        <span className="field-label">Who’s in</span>
        <ul className="members">
          {household.members.map((m, i) => (
            <li key={m}>
              <span className="avatar" data-p={i}>
                {initials(household.memberNames[m] ?? '?')}
              </span>
              {household.memberNames[m] ?? 'Someone'}
              {m === uid && <span className="members-you">you</span>}
            </li>
          ))}
          {waiting && (
            <li className="members-waiting">
              <span className="avatar avatar--empty">+</span>
              Waiting for your partner
            </li>
          )}
        </ul>
      </div>

      <div className="invite">
        <span className="field-label">Invite code</span>
        <div className="invite-row">
          <span className="invite-code">{code}</span>
          <button className="btn btn--primary btn--small" onClick={share}>
            Share
          </button>
        </div>
        <p className="hint">
          {waiting
            ? 'Your partner adds the app to their Home Screen, makes an account, then enters this code.'
            : 'You’re both in. The code stops working once two people have joined.'}
        </p>
      </div>

      <label className="field">
        <span className="field-label">Your name</span>
        <input
          className="input"
          value={myName}
          maxLength={60}
          onChange={(e) => setMyNameDraft(e.target.value)}
          onBlur={saveMe}
          enterKeyHint="done"
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        />
      </label>

      <div className="field">
        <span className="field-label">Appearance</span>
        <div className="segmented">
          {PREFS.map((p) => (
            <button key={p.id} aria-pressed={theme.pref === p.id} onClick={() => theme.setPref(p.id)}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="sheet-actions">
        <button className="btn btn--quiet" onClick={() => signOut(auth)}>
          Sign out
        </button>
      </div>
      <p className="hint hint--center">Works offline. Changes sync when you’re back online.</p>
    </Sheet>
  )
}
