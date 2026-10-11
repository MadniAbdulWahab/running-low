import { buildPushPayload } from '@block65/webcrypto-web-push'
import { describe, expect, it } from 'vitest'
import worker, { parseNotice, readPushDoc, type Env } from '../src/index'

const env: Env = {
  PROJECT_ID: 'running-low',
  ALLOWED_ORIGINS: 'https://running-low.web.app',
  VAPID_PUBLIC_KEY: 'unused',
  VAPID_PRIVATE_KEY: 'unused',
  VAPID_SUBJECT: 'https://running-low.web.app',
}
const call = (init: RequestInit & { path?: string; origin?: string } = {}) =>
  worker.fetch(
    new Request(`https://push.example${init.path ?? '/notify'}`, {
      ...init,
      headers: { origin: init.origin ?? 'https://running-low.web.app', ...(init.headers as Record<string, string>) },
    }),
    env,
  )

describe('push worker: requests', () => {
  it('answers CORS preflight only for the app', async () => {
    const ok = await call({ method: 'OPTIONS' })
    expect(ok.status).toBe(204)
    expect(ok.headers.get('access-control-allow-origin')).toBe('https://running-low.web.app')
    const other = await call({ method: 'OPTIONS', origin: 'https://evil.example' })
    expect(other.headers.get('access-control-allow-origin')).toBeNull()
  })

  it('rejects other paths and methods', async () => {
    expect((await call({ method: 'GET' })).status).toBe(404)
    expect((await call({ method: 'POST', path: '/elsewhere' })).status).toBe(404)
  })

  it('rejects a missing or forged Firebase token', async () => {
    expect((await call({ method: 'POST', body: '{}' })).status).toBe(401)
    const forged = await call({ method: 'POST', body: '{}', headers: { authorization: 'Bearer not.a.jwt' } })
    expect(forged.status).toBe(401)
  })
})

describe('push worker: input', () => {
  const good = { hid: 'ABCD2345', kind: 'hearts', title: 'Sara sent a heart ❤️', body: '', room: 'us' }

  it('accepts a well-formed notice', () => {
    expect(parseNotice(good)).toEqual(good)
  })

  it('rejects bad list codes, kinds, rooms and oversized text', () => {
    expect(() => parseNotice({ ...good, hid: 'abcd2345' })).toThrow()
    expect(() => parseNotice({ ...good, kind: 'spam' })).toThrow()
    expect(() => parseNotice({ ...good, room: 'garage' })).toThrow()
    expect(() => parseNotice({ ...good, title: '' })).toThrow()
    expect(() => parseNotice({ ...good, title: 'x'.repeat(121) })).toThrow()
    expect(() => parseNotice(null)).toThrow()
  })

  it('reads push docs from the Firestore REST format', () => {
    const sub = { endpoint: 'https://web.push.apple.com/abc', expirationTime: null, keys: { p256dh: 'p', auth: 'a' } }
    const doc = {
      name: 'projects/running-low/databases/(default)/documents/households/ABCD2345/push/uid123',
      fields: {
        subscription: { stringValue: JSON.stringify(sub) },
        prefs: { mapValue: { fields: { items: { booleanValue: false }, hearts: { booleanValue: true } } } },
      },
    }
    expect(readPushDoc(doc)).toEqual({ uid: 'uid123', subscription: sub, prefs: { items: false, hearts: true } })
    const http = { ...doc, fields: { subscription: { stringValue: JSON.stringify({ ...sub, endpoint: 'http://x' }) } } }
    expect(readPushDoc(http)).toBeNull()
    expect(readPushDoc({ name: 'x/uid', fields: { subscription: { stringValue: 'not json' } } })).toBeNull()
  })
})

describe('push worker: payload', () => {
  const b64url = (buf: ArrayBuffer | Uint8Array) => Buffer.from(buf as ArrayBuffer).toString('base64url')

  it('builds an encrypted, VAPID-signed request for a real-looking subscription', async () => {
    // A fresh VAPID key pair and a fake browser subscription, both made here.
    const vapidPair = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
      'sign',
      'verify',
    ])) as CryptoKeyPair
    const vapidJwk = await crypto.subtle.exportKey('jwk', vapidPair.privateKey)
    const vapidPub = await crypto.subtle.exportKey('raw', vapidPair.publicKey)
    const browser = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, [
      'deriveBits',
    ])) as CryptoKeyPair
    const p256dh = b64url(await crypto.subtle.exportKey('raw', browser.publicKey))
    const auth = b64url(crypto.getRandomValues(new Uint8Array(16)))

    const payload = await buildPushPayload(
      { data: { title: 'Sara added Milk', body: '' }, options: { ttl: 60 } },
      { endpoint: 'https://web.push.apple.com/test', expirationTime: null, keys: { p256dh, auth } },
      { subject: 'https://running-low.web.app', publicKey: b64url(vapidPub), privateKey: vapidJwk.d },
    )
    expect(payload.method.toUpperCase()).toBe('POST')
    expect(payload.headers['content-encoding']).toBe('aes128gcm')
    expect(payload.headers.authorization).toMatch(/^vapid t=.+, k=/)
    expect(payload.body.byteLength).toBeGreaterThan(4000)
  })
})
