import { signOut } from 'firebase/auth'
import { useState } from 'react'
import { useApp } from '../app-context'
import { formatCode, leaveHousehold, renameHousehold, setMyName } from '../data/household'
import { setMyPhoto } from '../data/profiles'
import { auth } from '../firebase'
import type { ThemeState } from '../hooks/useTheme'
import type { ThemePref } from '../types'
import { Alert } from './Alert'
import { Avatar } from './Avatar'
import { PhotoPicker } from './PhotoPicker'
import { NotificationSettings } from './NotificationSettings'
import { Sheet } from './Sheet'

const PREFS: { id: ThemePref; label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
]

export function SettingsSheet({ onClose, theme }: { onClose: () => void; theme: ThemeState }) {
  const { household, uid, toast, photos } = useApp()
  const [homeName, setHomeName] = useState(household.name)
  const [myName, setMyNameDraft] = useState(household.memberNames[uid] ?? '')
  const code = formatCode(household.id)
  const waiting = household.members.length < 2
  const [confirmLeave, setConfirmLeave] = useState(false)
  const alone = household.members.length <= 1

  const leave = async () => {
    try {
      await leaveHousehold(household, uid)
      // The app switches to "Start a new list / Join with a code" on its own.
    } catch {
      toast('Couldn’t leave the list. Check your connection and try again.')
    }
  }

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
      <PhotoPicker
        photo={photos[uid] ?? null}
        name={myName}
        onChange={(p) => {
          setMyPhoto(household.id, uid, p)
          toast(p ? 'Photo updated' : 'Photo removed')
        }}
        onError={toast}
      />
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
        {household.members.map((m) => (
          <div key={m} className="row row--tall">
            <Avatar uid={m} />
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

      <NotificationSettings />

      <div className="group" style={{ marginTop: 28 }}>
        <button className="row row--danger row--center" onClick={() => setConfirmLeave(true)}>
          Leave this list
        </button>
        <button className="row row--danger row--center" onClick={() => signOut(auth)}>
          Sign out
        </button>
      </div>
      <p className="group-footer" style={{ textAlign: 'center' }}>
        Works offline. Changes sync when you’re back online.
      </p>
      {confirmLeave && (
        <Alert
          title={`Leave ${household.name}?`}
          message={
            alone
              ? 'You’re the only one on it, so its lists, notes and meals will be gone for good. You can start or join another list straight after.'
              : 'You’ll stop seeing its lists, notes and meals here. Everything stays for anyone else on it, and you can start or join another list straight after.'
          }
          actions={[
            { label: 'Cancel', style: 'cancel' },
            { label: 'Leave', style: 'destructive', onSelect: leave },
          ]}
          onClose={() => setConfirmLeave(false)}
        />
      )}
    </Sheet>
  )
}
