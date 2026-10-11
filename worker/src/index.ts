import { buildPushPayload, type PushMessage, type PushSubscription } from '@block65/webcrypto-web-push'
import { createRemoteJWKSet, jwtVerify } from 'jose'

export interface Env {
  PROJECT_ID: string
  ALLOWED_ORIGINS: string
  VAPID_PUBLIC_KEY: string
  VAPID_PRIVATE_KEY: string
  VAPID_SUBJECT: string
}

export type Kind = 'items' | 'notes' | 'hearts'
const KINDS: Kind[] = ['items', 'notes', 'hearts']
// grocery and household are kept for phones still on an older version; the app maps them to Shopping.
const ROOMS = ['home', 'shopping', 'important', 'meals', 'us', 'grocery', 'household']

export interface Notice {
  hid: string
  kind: Kind
  title: string
  body: string
  room: string
}

// Google's public keys for Firebase Auth ID tokens (cached by jose between requests).
const FIREBASE_KEYS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'),
)

/** Validates the JSON the app sends; throws on anything unexpected. */
export function parseNotice(raw: unknown): Notice {
  const o = raw as Record<string, unknown>
  if (!o || typeof o !== 'object') throw new Error('body')
  const hid = String(o.hid ?? '')
  const kind = o.kind as Kind
  const title = String(o.title ?? '').trim()
  const body = String(o.body ?? '').trim()
  const room = String(o.room ?? 'home')
  if (!/^[A-HJ-NP-Z2-9]{8}$/.test(hid)) throw new Error('hid')
  if (!KINDS.includes(kind)) throw new Error('kind')
  if (!title || title.length > 120 || body.length > 300) throw new Error('text')
  if (!ROOMS.includes(room)) throw new Error('room')
  return { hid, kind, title, body, room }
}

function corsHeaders(req: Request, env: Env): Record<string, string> {
  const origin = req.headers.get('origin') ?? ''
  const allowed = env.ALLOWED_ORIGINS.split(',').map((s) => s.trim())
  if (!allowed.includes(origin)) return { vary: 'origin' }
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'authorization, content-type',
    'access-control-max-age': '86400',
    vary: 'origin',
  }
}

const json = (data: unknown, status: number, headers: Record<string, string>) =>
  new Response(JSON.stringify(data), { status, headers: { ...headers, 'content-type': 'application/json' } })

interface FirestoreDoc {
  name: string
  fields?: Record<string, { stringValue?: string; mapValue?: { fields?: Record<string, { booleanValue?: boolean }> } }>
}

/** A push/{uid} doc → its subscription and preferences (null if unusable). */
export function readPushDoc(d: FirestoreDoc): { uid: string; subscription: PushSubscription; prefs: Record<string, boolean> } | null {
  const uid = d.name.split('/').pop() ?? ''
  try {
    const subscription = JSON.parse(d.fields?.subscription?.stringValue ?? '') as PushSubscription
    if (!subscription?.endpoint?.startsWith('https://') || !subscription.keys?.p256dh || !subscription.keys?.auth) return null
    const prefs: Record<string, boolean> = {}
    for (const [k, v] of Object.entries(d.fields?.prefs?.mapValue?.fields ?? {})) prefs[k] = v.booleanValue !== false
    return { uid, subscription, prefs }
  } catch {
    return null
  }
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const cors = corsHeaders(req, env)
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
    if (new URL(req.url).pathname !== '/notify' || req.method !== 'POST') return json({ error: 'not found' }, 404, cors)

    // 1. Who is sending? A valid Firebase ID token for this project.
    const token = req.headers.get('authorization')?.match(/^Bearer\s+(.+)$/)?.[1]
    if (!token) return json({ error: 'missing token' }, 401, cors)
    let uid: string
    try {
      const { payload } = await jwtVerify(token, FIREBASE_KEYS, {
        issuer: `https://securetoken.google.com/${env.PROJECT_ID}`,
        audience: env.PROJECT_ID,
      })
      uid = typeof payload.sub === 'string' ? payload.sub : ''
      if (!uid) throw new Error('sub')
    } catch {
      return json({ error: 'invalid token' }, 401, cors)
    }

    let notice: Notice
    try {
      notice = parseNotice(await req.json())
    } catch {
      return json({ error: 'bad request' }, 400, cors)
    }

    // 2. Read the list's subscriptions *as the sender*, so Firestore's rules decide
    //    (only members of that list can read them). No service account needed.
    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${env.PROJECT_ID}/databases/(default)/documents/households/${notice.hid}/push`,
      { headers: { authorization: `Bearer ${token}` } },
    )
    if (res.status === 401 || res.status === 403) return json({ error: 'not a member' }, 403, cors)
    if (!res.ok) return json({ error: 'could not read subscriptions' }, 502, cors)
    const { documents = [] } = (await res.json()) as { documents?: FirestoreDoc[] }

    // 3. Send to everyone else on the list who wants this kind of notice.
    const targets = documents
      .map(readPushDoc)
      .filter((t): t is NonNullable<typeof t> => !!t && t.uid !== uid && t.prefs[notice.kind] !== false)
    const message: PushMessage = {
      data: { title: notice.title, body: notice.body, room: notice.room, kind: notice.kind },
      options: { ttl: 6 * 60 * 60, urgency: notice.kind === 'hearts' ? 'high' : 'normal' },
    }
    const vapid = { subject: env.VAPID_SUBJECT, publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY }
    const results = await Promise.allSettled(
      targets.map(async (t) => {
        const r = await fetch(t.subscription.endpoint, await buildPushPayload(message, t.subscription, vapid))
        if (!r.ok) console.log('push failed', r.status, new URL(t.subscription.endpoint).host)
        return r.ok
      }),
    )
    const sent = results.filter((r) => r.status === 'fulfilled' && r.value).length
    return json({ sent, of: targets.length }, 200, cors)
  },
}
