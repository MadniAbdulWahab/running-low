import { useState } from 'react'
import { useApp } from '../app-context'
import { setPushPref, useMyPush, type PushKind } from '../data/push'
import { disablePush, enablePush, permission, pushConfigured, pushSupport } from '../lib/push'

const KINDS: { kind: PushKind; label: string }[] = [
  { kind: 'items', label: 'Things added to the lists' },
  { kind: 'notes', label: 'New notes' },
  { kind: 'hearts', label: 'Hearts and hugs' },
]

/** Settings → Notifications: turn push on/off and choose what to hear about. */
export function NotificationSettings() {
  const { household, uid, toast } = useApp()
  const mine = useMyPush(household.id, uid)
  const [busy, setBusy] = useState(false)
  if (!pushConfigured) return null

  const support = pushSupport()
  const on = !!mine && permission() === 'granted'

  const turnOn = async () => {
    setBusy(true)
    const result = await enablePush(household.id, uid)
    setBusy(false)
    if (result === 'on') toast('Notifications on')
    else if (result === 'denied') toast('Notifications are blocked in iPhone Settings')
    else toast('Couldn’t turn notifications on. Try again?')
  }

  return (
    <>
      <h3 className="group-label">Notifications</h3>
      <div className="group">
        {support !== 'ok' ? (
          <div className="row row-value">
            {support === 'install' ? 'Available in the Home Screen app' : 'Not available in this browser'}
          </div>
        ) : on ? (
          <>
            {KINDS.map(({ kind, label }) => (
              <label key={kind} className="row">
                <span className="row-label">{label}</span>
                <input
                  type="checkbox"
                  role="switch"
                  className="switch"
                  checked={mine!.prefs[kind]}
                  onChange={(e) => setPushPref(household.id, uid, kind, e.target.checked)}
                />
              </label>
            ))}
            <button
              className="row row--danger"
              onClick={async () => {
                await disablePush(household.id, uid)
                toast('Notifications off')
              }}
            >
              Turn off notifications
            </button>
          </>
        ) : (
          <button className="row row--action" disabled={busy} onClick={turnOn}>
            {busy ? 'Turning on…' : 'Turn on notifications'}
          </button>
        )}
      </div>
      <p className="group-footer">
        {support === 'install'
          ? 'Open Running Low from your Home Screen to turn these on.'
          : permission() === 'denied'
            ? 'Notifications are blocked. Turn them on in iPhone Settings → Notifications → Running Low.'
            : on
              ? 'This phone gets a notification when someone else adds things, leaves a note or sends a heart.'
              : 'Get a notification on this phone when someone else adds things, leaves a note or sends a heart.'}
      </p>
    </>
  )
}
