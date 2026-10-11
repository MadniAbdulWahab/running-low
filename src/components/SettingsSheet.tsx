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
  const blurOnEnter = (e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && e.currentTarget.blur()

  return (
    <Sheet title="Settings" onClose={onClose}>
      <h3 className="group-label">List name</h3>
      <div className="group">
        <label className="row">
          <span className="visually-hidden">List name</span>
          <input
            className="row-input"
            value={homeName}
            maxLength={60}
            onChange={(e) => setHomeName(e.target.value)}
            onBlur={saveHome}
            enterKeyHint="done"
            onKeyDown={blurOnEnter}
          />
        </label>
      </div>

      <h3 className="group-label">Members</h3>
      <div className="group">
        {household.members.map((m, i) => (
          <div key={m} className="row row--tall">
            <span className="avatar" data-p={i}>
              {initials(household.memberNames[m] ?? '?')}
            </span>
            {household.memberNames[m] ?? 'Someone'}
            {m === uid && <span className="you-tag">You</span>}
          </div>
        ))}
        {waiting && (
          <div className="row row--tall row-value">
            <span className="avatar avatar--empty">+</span>
            Waiting for someone to join
          </div>
        )}
      </div>

      <h3 className="group-label">Invite code</h3>
      <div className="group">
        <div className="row row--tall">
          <span className="invite-code">{code}</span>
          <button className="share-btn" onClick={share}>
            Share
          </button>
        </div>
      </div>
      <p className="group-footer">
        {waiting
          ? 'Share this code. They add the app to their Home Screen, make an account, then enter it.'
          : 'Everyone’s in. The code stops working once two people have joined.'}
      </p>

      <h3 className="group-label">Your name</h3>
      <div className="group">
        <label className="row">
          <span className="visually-hidden">Your name</span>
          <input
            className="row-input"
            value={myName}
            maxLength={60}
            onChange={(e) => setMyNameDraft(e.target.value)}
            onBlur={saveMe}
            enterKeyHint="done"
            onKeyDown={blurOnEnter}
          />
        </label>
      </div>

      <h3 className="group-label">Appearance</h3>
      <div className="group">
        <div className="row row--segmented">
          <div className="segmented">
            {PREFS.map((p) => (
              <button key={p.id} aria-pressed={theme.pref === p.id} onClick={() => theme.setPref(p.id)}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="group" style={{ marginTop: 28 }}>
        <button className="row row--danger row--center" onClick={() => signOut(auth)}>
          Sign out
        </button>
      </div>
      <p className="group-footer" style={{ textAlign: 'center' }}>
        Works offline. Changes sync when you’re back online.
      </p>
    </Sheet>
  )
}
