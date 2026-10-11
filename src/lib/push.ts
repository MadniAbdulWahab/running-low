import { DEFAULT_PREFS, deletePushDoc, savePushSubscription, type PushKind } from '../data/push'
import { auth, usingEmulators } from '../firebase'
import type { RoomId } from '../types'

const PUSH_URL = import.meta.env.VITE_PUSH_URL as string | undefined
const VAPID_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

/** Notifications need the sender URL + key, and real Firebase (not the emulators). */
export const pushConfigured = Boolean(PUSH_URL && VAPID_KEY) && !usingEmulators

const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent)
const isStandalone = () =>
  (navigator as Navigator & { standalone?: boolean }).standalone === true ||
  window.matchMedia('(display-mode: standalone)').matches

/** 'ok', or why notifications can't be turned on here. */
export function pushSupport(): 'ok' | 'install' | 'unsupported' {
  if (isIOS() && !isStandalone()) return 'install' // iOS only allows push for Home Screen apps
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported'
  return 'ok'
}

export const permission = (): NotificationPermission =>
  'Notification' in window ? Notification.permission : 'denied'

function keyBytes(b64url: string): Uint8Array<ArrayBuffer> {
  const pad = '='.repeat((4 - (b64url.length % 4)) % 4)
  const raw = atob((b64url + pad).replace(/-/g, '+').replace(/_/g, '/'))
  const out = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

async function subscription(create: boolean): Promise<PushSubscription | null> {
  const reg = await navigator.serviceWorker.ready
  const existing = await reg.pushManager.getSubscription()
  if (existing || !create) return existing
  return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_KEY!) })
}

/** Must be called straight from a tap (iOS requires it for the permission prompt). */
export async function enablePush(hid: string, uid: string): Promise<'on' | 'denied' | 'failed'> {
  const result = await Notification.requestPermission()
  if (result !== 'granted') return 'denied'
  try {
    const sub = await subscription(true)
    if (!sub) return 'failed'
    await savePushSubscription(hid, uid, sub.toJSON(), DEFAULT_PREFS)
    return 'on'
  } catch (e) {
    console.error(e)
    return 'failed'
  }
}

export async function disablePush(hid: string, uid: string) {
  try {
    await (await subscription(false))?.unsubscribe()
  } catch {}
  await deletePushDoc(hid, uid)
}

/** On app start: the browser may have rotated the subscription; keep the stored one current. */
export async function refreshPush(hid: string, uid: string, stored: string | undefined) {
  if (!pushConfigured || pushSupport() !== 'ok' || permission() !== 'granted' || !stored) return
  try {
    const sub = await subscription(true)
    if (sub && JSON.stringify(sub.toJSON()) !== stored) await savePushSubscription(hid, uid, sub.toJSON())
  } catch {}
}

/** Fire-and-forget: tell the other phone. Never blocks or breaks the app. */
export async function notify(hid: string, kind: PushKind, title: string, body: string, room: RoomId) {
  if (!pushConfigured) return
  try {
    const token = await auth.currentUser?.getIdToken()
    if (!token) return
    await fetch(`${PUSH_URL}/notify`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ hid, kind, title: title.slice(0, 120), body: body.slice(0, 300), room }),
      keepalive: true,
    })
  } catch {}
}

// Item adds are grouped: one notification for a burst of adds ("Sara added Milk, Eggs +2").
let pending: { hid: string; who: string; room: RoomId; names: string[]; timer: number } | null = null

function flushItems() {
  if (!pending) return
  const { hid, who, room, names, timer } = pending
  window.clearTimeout(timer)
  pending = null
  const shown = names.slice(0, 3).join(', ') + (names.length > 3 ? ` +${names.length - 3}` : '')
  void notify(hid, 'items', `${who} added ${shown}`, '', room)
}

export function notifyItemsAdded(hid: string, who: string, names: string[], room: RoomId) {
  if (!pushConfigured || !names.length) return
  if (pending && pending.hid === hid) {
    for (const n of names) if (!pending.names.includes(n)) pending.names.push(n)
    window.clearTimeout(pending.timer)
    pending.timer = window.setTimeout(flushItems, 6000)
    return
  }
  flushItems()
  pending = { hid, who, room, names: [...names], timer: window.setTimeout(flushItems, 6000) }
}

// iOS suspends the app soon after it's backgrounded: send anything waiting first.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushItems()
  })
  window.addEventListener('pagehide', flushItems)
}
