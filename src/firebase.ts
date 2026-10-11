import { initializeApp } from 'firebase/app'
import {
  browserLocalPersistence,
  connectAuthEmulator,
  indexedDBLocalPersistence,
  initializeAuth,
} from 'firebase/auth'
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'

const env = import.meta.env
export const usingEmulators = env.VITE_USE_EMULATORS === 'true'

const config = usingEmulators
  ? { apiKey: 'demo-key', authDomain: 'demo-outof.firebaseapp.com', projectId: 'demo-outof', appId: 'demo' }
  : {
      apiKey: env.VITE_FIREBASE_API_KEY as string | undefined,
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
      projectId: env.VITE_FIREBASE_PROJECT_ID as string | undefined,
      appId: env.VITE_FIREBASE_APP_ID as string | undefined,
    }

export const configured = Boolean(config.apiKey && config.projectId)

const app = initializeApp(
  configured ? config : { apiKey: 'missing', projectId: 'missing', appId: 'missing' },
)

// No popup/redirect resolver: email + password only, which stays reliable
// inside iOS Home Screen apps (and keeps the bundle smaller).
export const auth = initializeAuth(app, {
  persistence: [indexedDBLocalPersistence, browserLocalPersistence],
})

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
})

if (usingEmulators) {
  // location.hostname so a phone on the same Wi-Fi can reach the emulators too.
  const host = location.hostname
  connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true })
  connectFirestoreEmulator(db, host, 8080)
}
