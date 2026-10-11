import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  arrayUnion,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
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
