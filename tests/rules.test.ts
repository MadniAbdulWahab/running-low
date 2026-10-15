import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  arrayRemove,
  arrayUnion,
  deleteField,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  collection,
  setDoc,
  updateDoc,
} from 'firebase/firestore'

const CODE = 'ABCD2345'
let env: RulesTestEnvironment

const as = (uid: string) => env.authenticatedContext(uid).firestore()
const anon = () => env.unauthenticatedContext().firestore()

const household = (members: string[]) => ({
  name: 'Our home',
  members,
  memberNames: Object.fromEntries(members.map((m) => [m, m.toUpperCase()])),
})

const item = {
  name: 'Milk',
  key: 'milk',
  list: 'grocery',
  status: 'needed',
  addedBy: 'alice',
  count: 1,
}

async function seed(members: string[]) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'households', CODE), household(members))
  })
}

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-outof',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  })
})

afterAll(async () => {
  await env?.cleanup()
})

beforeEach(async () => {
  await env.clearFirestore()
})

describe('users', () => {
  it('lets you read and write only your own user doc', async () => {
    await assertSucceeds(setDoc(doc(as('alice'), 'users/alice'), { householdId: CODE }))
    await assertSucceeds(getDoc(doc(as('alice'), 'users/alice')))
    await assertFails(getDoc(doc(as('bob'), 'users/alice')))
    await assertFails(setDoc(doc(as('bob'), 'users/alice'), { householdId: 'X' }))
    await assertFails(getDoc(doc(anon(), 'users/alice')))
  })
})

describe('households: create', () => {
  it('allows creating with only yourself as member', async () => {
    await assertSucceeds(setDoc(doc(as('alice'), 'households', CODE), household(['alice'])))
  })

  it('rejects adding someone else, extra keys, or a bad code', async () => {
    await assertFails(setDoc(doc(as('alice'), 'households', CODE), household(['alice', 'bob'])))
    await assertFails(
      setDoc(doc(as('alice'), 'households', CODE), { ...household(['alice']), admin: true }),
    )
    await assertFails(setDoc(doc(as('alice'), 'households', 'abcd1234'), household(['alice'])))
    await assertFails(setDoc(doc(anon(), 'households', CODE), household(['alice'])))
  })

  it('cannot overwrite an existing household by "creating" over it', async () => {
    await seed(['alice'])
    await assertFails(setDoc(doc(as('mallory'), 'households', CODE), household(['mallory'])))
  })
})

describe('households: read', () => {
  it('only members can get it, nobody can list', async () => {
    await seed(['alice'])
    await assertSucceeds(getDoc(doc(as('alice'), 'households', CODE)))
    await assertFails(getDoc(doc(as('bob'), 'households', CODE)))
    await assertFails(getDocs(collection(as('alice'), 'households')))
  })
})

describe('households: join', () => {
  it('a second person can join with the code', async () => {
    await seed(['alice'])
    await assertSucceeds(
      updateDoc(doc(as('bob'), 'households', CODE), {
        members: arrayUnion('bob'),
        'memberNames.bob': 'Bob',
      }),
    )
    await assertSucceeds(getDoc(doc(as('bob'), 'households', CODE)))
  })

  it('a third person cannot join', async () => {
    await seed(['alice', 'bob'])
    await assertFails(
      updateDoc(doc(as('carol'), 'households', CODE), {
        members: arrayUnion('carol'),
        'memberNames.carol': 'Carol',
      }),
    )
  })

  it('a joiner cannot rename the household or others, or add someone else', async () => {
    await seed(['alice'])
    await assertFails(
      updateDoc(doc(as('bob'), 'households', CODE), {
        members: arrayUnion('bob'),
        'memberNames.bob': 'Bob',
        name: 'Mine now',
      }),
    )
    await assertFails(
      updateDoc(doc(as('bob'), 'households', CODE), {
        members: arrayUnion('bob'),
        'memberNames.alice': 'Nope',
      }),
    )
    await assertFails(
      updateDoc(doc(as('bob'), 'households', CODE), {
        members: arrayUnion('carol'),
        'memberNames.carol': 'Carol',
      }),
    )
  })

  it('joining a code that does not exist fails', async () => {
    await assertFails(
      updateDoc(doc(as('bob'), 'households', 'ZZZZ9999'), {
        members: arrayUnion('bob'),
        'memberNames.bob': 'Bob',
      }),
    )
  })
})

describe('households: leaving', () => {
  it('a member can leave (removing only themselves), freeing the spot', async () => {
    await seed(['alice', 'bob'])
    const ref = (who: string) => doc(as(who), 'households', CODE)
    // Can't remove someone else, or leave while renaming the list.
    await assertFails(updateDoc(ref('alice'), { members: arrayRemove('bob'), 'memberNames.bob': deleteField() }))
    await assertFails(
      updateDoc(ref('bob'), { members: arrayRemove('bob'), 'memberNames.bob': deleteField(), name: 'Mine' }),
    )
    // Keeping your name while leaving isn't allowed either.
    await assertFails(updateDoc(ref('bob'), { members: arrayRemove('bob') }))
    await assertSucceeds(updateDoc(ref('bob'), { members: arrayRemove('bob'), 'memberNames.bob': deleteField() }))
    await assertFails(getDoc(ref('bob')))
    // Someone new can now join with the code.
    await assertSucceeds(updateDoc(ref('carol'), { members: arrayUnion('carol'), 'memberNames.carol': 'Carol' }))
  })
})

describe('households: member edits', () => {
  it('a member can rename the household and themselves but not remove members', async () => {
    await seed(['alice', 'bob'])
    await assertSucceeds(updateDoc(doc(as('alice'), 'households', CODE), { name: 'Flat 4' }))
    await assertSucceeds(
      updateDoc(doc(as('alice'), 'households', CODE), { 'memberNames.alice': 'Ali' }),
    )
    await assertFails(
      updateDoc(doc(as('alice'), 'households', CODE), { 'memberNames.bob': 'Bobby' }),
    )
    await assertFails(updateDoc(doc(as('alice'), 'households', CODE), { members: ['alice'] }))
    await assertFails(deleteDoc(doc(as('alice'), 'households', CODE)))
  })
})

describe('notes and pings', () => {
  const note = {
    text: 'Pick up the dry cleaning',
    color: 'mint',
    pinned: false,
    checklist: [{ t: 'Shirts', done: false }],
    createdBy: 'alice',
    updatedBy: 'alice',
  }

  it('members can write notes; outsiders cannot read or write', async () => {
    await seed(['alice', 'bob'])
    const path = `households/${CODE}/notes/n1`
    await assertSucceeds(setDoc(doc(as('alice'), path), note))
    await assertSucceeds(getDoc(doc(as('bob'), path)))
    await assertSucceeds(updateDoc(doc(as('bob'), path), { pinned: true, updatedBy: 'bob' }))
    await assertFails(getDoc(doc(as('carol'), path)))
    await assertFails(setDoc(doc(as('carol'), `households/${CODE}/notes/n2`), { ...note, createdBy: 'carol', updatedBy: 'carol' }))
    await assertSucceeds(deleteDoc(doc(as('bob'), path)))
  })

  it('rejects malformed notes and impersonation', async () => {
    await seed(['alice', 'bob'])
    const path = `households/${CODE}/notes/n1`
    await assertFails(setDoc(doc(as('alice'), path), { ...note, color: 'neon' }))
    await assertFails(setDoc(doc(as('alice'), path), { ...note, text: 'x'.repeat(5001) }))
    await assertFails(setDoc(doc(as('alice'), path), { ...note, checklist: Array(31).fill({ t: 'a', done: false }) }))
    await assertFails(setDoc(doc(as('alice'), path), { ...note, createdBy: 'bob' }))
    await assertSucceeds(setDoc(doc(as('alice'), path), note))
    await assertFails(updateDoc(doc(as('bob'), path), { text: 'hi', updatedBy: 'alice' }))
  })

  it('pings are sent as yourself, never edited', async () => {
    await seed(['alice', 'bob'])
    const path = `households/${CODE}/pings/p1`
    await assertSucceeds(setDoc(doc(as('alice'), path), { from: 'alice', kind: 'heart' }))
    await assertFails(setDoc(doc(as('alice'), `households/${CODE}/pings/p2`), { from: 'bob', kind: 'heart' }))
    await assertFails(setDoc(doc(as('alice'), `households/${CODE}/pings/p3`), { from: 'alice', kind: 'slap' }))
    await assertSucceeds(setDoc(doc(as('alice'), `households/${CODE}/pings/p4`), { from: 'alice', kind: 'rose' }))
    await assertFails(updateDoc(doc(as('alice'), path), { kind: 'hug' }))
    await assertSucceeds(getDoc(doc(as('bob'), path)))
    await assertFails(getDoc(doc(as('carol'), path)))
    await assertSucceeds(deleteDoc(doc(as('bob'), path)))
  })
})

describe('push subscriptions', () => {
  it('each person writes only their own; members can read both', async () => {
    await seed(['alice', 'bob'])
    const mine = `households/${CODE}/push/alice`
    const data = { subscription: '{"endpoint":"https://web.push.apple.com/x"}', prefs: { items: true } }
    await assertSucceeds(setDoc(doc(as('alice'), mine), data))
    await assertSucceeds(getDoc(doc(as('bob'), mine)))
    await assertFails(setDoc(doc(as('bob'), mine), data))
    await assertFails(deleteDoc(doc(as('bob'), mine)))
    await assertFails(getDoc(doc(as('carol'), mine)))
    await assertFails(setDoc(doc(as('alice'), mine), { ...data, subscription: 'x'.repeat(2001) }))
    await assertSucceeds(deleteDoc(doc(as('alice'), mine)))
  })
})

describe('saved meals (Our meals)', () => {
  it('members save, edit and delete meals; bad ones and outsiders are refused', async () => {
    await seed(['alice', 'bob'])
    const path = `households/${CODE}/recipes/r1`
    const r = { name: 'Pasta night', ingredients: ['pasta', '2 tomatoes'], uses: 0, createdBy: 'alice' }
    await assertSucceeds(setDoc(doc(as('alice'), path), r))
    await assertSucceeds(updateDoc(doc(as('bob'), path), { uses: increment(1) }))
    await assertSucceeds(getDoc(doc(as('bob'), path)))
    await assertFails(setDoc(doc(as('alice'), path), { ...r, name: '' }))
    await assertFails(setDoc(doc(as('alice'), path), { ...r, ingredients: Array(21).fill('x') }))
    await assertFails(setDoc(doc(as('alice'), path), { ...r, uses: 'lots' }))
    await assertFails(getDoc(doc(as('carol'), path)))
    await assertFails(setDoc(doc(as('carol'), `households/${CODE}/recipes/r2`), r))
    await assertSucceeds(deleteDoc(doc(as('bob'), path)))
  })
})

describe('grocery templates', () => {
  it('members save, edit and delete templates; bad ones and outsiders are refused', async () => {
    await seed(['alice', 'bob'])
    const path = `households/${CODE}/templates/t1`
    const t = { name: 'Weekly shop', items: ['2 milk', 'eggs'], uses: 0, createdBy: 'alice' }
    await assertSucceeds(setDoc(doc(as('alice'), path), t))
    await assertSucceeds(updateDoc(doc(as('bob'), path), { uses: increment(1), photoId: 'p1' }))
    await assertSucceeds(updateDoc(doc(as('bob'), path), { photoId: null }))
    await assertSucceeds(getDoc(doc(as('bob'), path)))
    await assertFails(setDoc(doc(as('alice'), path), { ...t, name: '' }))
    await assertFails(setDoc(doc(as('alice'), path), { ...t, name: 'x'.repeat(61) }))
    await assertFails(setDoc(doc(as('alice'), path), { ...t, items: Array(61).fill('x') }))
    await assertFails(setDoc(doc(as('alice'), path), { ...t, uses: 'lots' }))
    await assertFails(getDoc(doc(as('carol'), path)))
    await assertFails(setDoc(doc(as('carol'), `households/${CODE}/templates/t2`), t))
    await assertSucceeds(deleteDoc(doc(as('bob'), path)))
  })
})

describe('past shops', () => {
  it('members log groceries per day; bad days, shapes and outsiders are refused', async () => {
    await seed(['alice', 'bob'])
    const path = `households/${CODE}/shops/2026-10-16`
    const milk = { items: { milk: { name: 'Milk', qty: 2 } } }
    await assertSucceeds(setDoc(doc(as('alice'), path), milk, { merge: true }))
    await assertSucceeds(setDoc(doc(as('bob'), path), { items: { eggs: { name: 'Eggs', qty: null } } }, { merge: true }))
    await assertSucceeds(setDoc(doc(as('bob'), path), { items: { milk: deleteField() } }, { merge: true }))
    const snap = await getDoc(doc(as('alice'), path))
    expect(Object.keys(snap.data()!.items)).toEqual(['eggs'])
    await assertFails(setDoc(doc(as('alice'), `households/${CODE}/shops/today`), milk))
    await assertFails(setDoc(doc(as('alice'), `households/${CODE}/shops/2026-10-15`), { ...milk, extra: 1 }))
    await assertFails(setDoc(doc(as('alice'), `households/${CODE}/shops/2026-10-15`), { items: ['milk'] }))
    const many = Object.fromEntries(Array.from({ length: 301 }, (_, i) => [`k${i}`, { name: 'x', qty: null }]))
    await assertFails(setDoc(doc(as('alice'), `households/${CODE}/shops/2026-10-15`), { items: many }))
    await assertFails(getDoc(doc(as('carol'), path)))
    await assertFails(setDoc(doc(as('carol'), path), milk, { merge: true }))
  })
})

describe('heart counts per day', () => {
  it('each person bumps only their own counts; outsiders see nothing', async () => {
    await seed(['alice', 'bob'])
    const day = `households/${CODE}/pingDays/2026-10-11`
    await assertSucceeds(setDoc(doc(as('alice'), day), { alice: { heart: increment(1) } }, { merge: true }))
    await assertSucceeds(setDoc(doc(as('bob'), day), { bob: { kiss: increment(1) } }, { merge: true }))
    await assertSucceeds(setDoc(doc(as('alice'), day), { alice: { heart: increment(1) } }, { merge: true }))
    const snap = await getDoc(doc(as('bob'), day))
    expect(snap.data()).toEqual({ alice: { heart: 2 }, bob: { kiss: 1 } })
    // Not someone else's counts, not a made-up day id, not outsiders, never deleted.
    await assertFails(setDoc(doc(as('alice'), day), { bob: { kiss: increment(5) } }, { merge: true }))
    await assertFails(setDoc(doc(as('alice'), `households/${CODE}/pingDays/today`), { alice: { heart: 1 } }))
    await assertFails(getDoc(doc(as('carol'), day)))
    await assertFails(setDoc(doc(as('carol'), day), { carol: { heart: 1 } }, { merge: true }))
    await assertFails(deleteDoc(doc(as('alice'), day)))
  })
})

describe('profile photos', () => {
  it('each person sets only their own photo; members see both', async () => {
    await seed(['alice', 'bob'])
    const mine = `households/${CODE}/profiles/alice`
    const photo = { photo: 'data:image/jpeg;base64,/9j/4AAQ' }
    await assertSucceeds(setDoc(doc(as('alice'), mine), photo))
    await assertSucceeds(getDoc(doc(as('bob'), mine)))
    await assertFails(getDoc(doc(as('carol'), mine)))
    await assertFails(setDoc(doc(as('bob'), mine), photo))
    await assertFails(deleteDoc(doc(as('bob'), mine)))
    await assertFails(setDoc(doc(as('alice'), mine), { photo: 'https://example.com/me.jpg' }))
    await assertFails(setDoc(doc(as('alice'), mine), { photo: 'data:image/jpeg;base64,' + 'A'.repeat(200_000) }))
    await assertFails(setDoc(doc(as('alice'), mine), { ...photo, extra: true }))
    await assertSucceeds(deleteDoc(doc(as('alice'), mine)))
  })
})

describe('countdowns and date jar', () => {
  it('members manage countdowns; bad dates and outsiders are rejected', async () => {
    await seed(['alice', 'bob'])
    const path = `households/${CODE}/countdowns/c1`
    const c = { title: 'Paris trip', date: '2026-12-01', emoji: '✈️', yearly: false, createdBy: 'alice' }
    await assertSucceeds(setDoc(doc(as('alice'), path), c))
    await assertSucceeds(updateDoc(doc(as('bob'), path), { yearly: true }))
    await assertFails(setDoc(doc(as('alice'), path), { ...c, date: 'next friday' }))
    await assertFails(setDoc(doc(as('alice'), path), { ...c, title: '' }))
    await assertFails(getDoc(doc(as('carol'), path)))
  })

  it('members fill the date jar; outsiders cannot', async () => {
    await seed(['alice', 'bob'])
    const path = `households/${CODE}/ideas/i1`
    await assertSucceeds(setDoc(doc(as('alice'), path), { text: 'Picnic', createdBy: 'alice' }))
    await assertFails(setDoc(doc(as('alice'), path), { text: 'x'.repeat(201), createdBy: 'alice' }))
    await assertFails(setDoc(doc(as('carol'), `households/${CODE}/ideas/i2`), { text: 'Mine', createdBy: 'carol' }))
    await assertSucceeds(deleteDoc(doc(as('bob'), path)))
  })
})

describe('meals', () => {
  const meal = { day: '2026-10-12', name: 'Pasta night', ingredients: ['pasta', '2 tomatoes'], updatedBy: 'alice' }
  it('members plan meals by date; outsiders and bad shapes are rejected', async () => {
    await seed(['alice', 'bob'])
    const path = `households/${CODE}/meals/2026-10-12`
    await assertSucceeds(setDoc(doc(as('alice'), path), meal))
    await assertSucceeds(getDoc(doc(as('bob'), path)))
    await assertFails(getDoc(doc(as('carol'), path)))
    await assertFails(setDoc(doc(as('alice'), `households/${CODE}/meals/monday`), { ...meal, day: 'monday' }))
    await assertFails(setDoc(doc(as('alice'), path), { ...meal, day: '2026-10-13' }))
    await assertFails(setDoc(doc(as('alice'), path), { ...meal, ingredients: Array(21).fill('x') }))
    await assertFails(setDoc(doc(as('alice'), path), { ...meal, updatedBy: 'bob' }))
    await assertSucceeds(deleteDoc(doc(as('bob'), path)))
  })
})

describe('items and photos', () => {
  it('members can read and write items; outsiders cannot', async () => {
    await seed(['alice', 'bob'])
    const path = `households/${CODE}/items/i_milk`
    await assertSucceeds(setDoc(doc(as('alice'), path), item))
    await assertSucceeds(getDoc(doc(as('bob'), path)))
    await assertSucceeds(getDocs(collection(as('bob'), `households/${CODE}/items`)))
    await assertSucceeds(updateDoc(doc(as('bob'), path), { status: 'done' }))
    await assertFails(getDoc(doc(as('carol'), path)))
    await assertFails(setDoc(doc(as('carol'), path), item))
    await assertFails(getDocs(collection(as('carol'), `households/${CODE}/items`)))
    await assertSucceeds(deleteDoc(doc(as('alice'), path)))
  })

  it('rejects malformed items', async () => {
    await seed(['alice'])
    const path = `households/${CODE}/items/i_milk`
    await assertFails(setDoc(doc(as('alice'), path), { ...item, list: 'garage' }))
    await assertFails(setDoc(doc(as('alice'), path), { ...item, status: 'maybe' }))
    await assertFails(setDoc(doc(as('alice'), path), { ...item, name: '' }))
    await assertSucceeds(setDoc(doc(as('alice'), path), { ...item, note: '2 litres, the blue one' }))
    await assertFails(setDoc(doc(as('alice'), path), { ...item, note: 'x'.repeat(501) }))
    await assertFails(setDoc(doc(as('alice'), path), { ...item, note: 42 }))
    await assertSucceeds(setDoc(doc(as('alice'), path), { ...item, qty: 12 }))
    await assertFails(setDoc(doc(as('alice'), path), { ...item, qty: 0 }))
    await assertFails(setDoc(doc(as('alice'), path), { ...item, qty: 100 }))
    await assertFails(setDoc(doc(as('alice'), path), { ...item, qty: 1.5 }))
  })

  it('photos must be image data URLs under the size cap', async () => {
    await seed(['alice'])
    const path = `households/${CODE}/photos/p1`
    await assertSucceeds(
      setDoc(doc(as('alice'), path), { itemKey: 'milk', dataUrl: 'data:image/jpeg;base64,AAAA' }),
    )
    await assertFails(setDoc(doc(as('alice'), path), { itemKey: 'milk', dataUrl: 'hello' }))
    await assertFails(
      setDoc(doc(as('alice'), path), {
        itemKey: 'milk',
        dataUrl: 'data:image/jpeg;base64,' + 'A'.repeat(900_000),
      }),
    )
    await assertFails(getDoc(doc(as('bob'), path)))
  })
})
