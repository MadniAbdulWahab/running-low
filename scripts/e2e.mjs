// End-to-end check against the local emulators, in WebKit with the iPhone 15 profile.
// BROWSER=chromium for screenshots (Windows WebKit ignores variable font weights and has no date picker).
// Needs: `npm run emulators` and `npm run dev:emu` running. Usage: node scripts/e2e.mjs [outDir]
import { chromium, devices, webkit } from 'playwright'
import { mkdirSync } from 'node:fs'

const URL = process.env.APP_URL ?? 'http://localhost:5173'
const OUT = process.argv[2] ?? 'screenshots'
mkdirSync(OUT, { recursive: true })

const run = Date.now().toString(36)
const engine = process.env.BROWSER === 'chromium' ? chromium : webkit
// Sync waits: WebKit on Windows is slow against the local emulator (first syncs after a join take 6–10 s).
const WAIT = engine === webkit ? 15000 : 8000
const browser = await engine.launch()
const errors = []
let failed = 0

function check(ok, label) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`)
  if (!ok) failed++
}

async function phone(name) {
  const ctx = await browser.newContext({ ...devices['iPhone 15'] })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`))
  page.on('console', (m) => m.type() === 'error' && errors.push(`${name}: ${m.text()}`))
  await page.goto(URL)
  return { ctx, page }
}

async function signUp(page, email) {
  await page.getByRole('button', { name: /create an account/i }).click()
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill('secret123')
  await page.getByRole('button', { name: 'Create account' }).click()
  await page.getByText('Set up').waitFor()
}

const visible = (page, text, timeout = WAIT) =>
  page
    .locator('.item-name', { hasText: text })
    .first()
    .waitFor({ timeout })
    .then(() => true)
    .catch(() => false)

const gone = (page, text, timeout = WAIT) =>
  page
    .locator('.item-name', { hasText: text })
    .first()
    .waitFor({ state: 'detached', timeout })
    .then(() => true)
    .catch(() => false)

async function tab(page, label) {
  // Match the label exactly, so "Us" doesn't match some other tab.
  await page.locator('.tab', { has: page.locator('.tab-label', { hasText: new RegExp(`^${label}$`) }) }).click()
  await page.locator('.large-title').first().waitFor()
}

const ticked = (page, text, want = true, timeout = WAIT) =>
  page
    .locator(want ? '.item[data-done]' : '.item:not([data-done])', { has: page.locator('.item-name', { hasText: text }) })
    .first()
    .waitFor({ timeout })
    .then(() => true)
    .catch(() => false)

/** On a list tab, Quick add folds once the list has items; open it if needed. */
async function openQuickAdd(page) {
  const t = page.locator('.fold-toggle')
  if ((await t.count()) && (await t.getAttribute('aria-expanded')) === 'false') await t.click()
}

/** A JPEG "selfie": red on the left, blue on the right, tagged as taken with the front camera. */
async function frontCameraSelfie(page) {
  const b64 = await page.evaluate(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 400
    const x = c.getContext('2d')
    x.fillStyle = '#f00'
    x.fillRect(0, 0, 200, 400)
    x.fillStyle = '#00f'
    x.fillRect(200, 0, 200, 400)
    return c.toDataURL('image/jpeg', 0.95).split(',')[1]
  })
  const jpeg = Buffer.from(b64, 'base64')
  const lens = Buffer.from('iPhone 15 front camera 2.69mm f/1.9\0', 'latin1')
  const tiff = Buffer.alloc(44 + lens.length)
  tiff.write('II', 0, 'latin1')
  tiff.writeUInt16LE(42, 2)
  tiff.writeUInt32LE(8, 4)
  tiff.writeUInt16LE(1, 8) // IFD0: pointer to the EXIF IFD
  tiff.writeUInt16LE(0x8769, 10)
  tiff.writeUInt16LE(4, 12)
  tiff.writeUInt32LE(1, 14)
  tiff.writeUInt32LE(26, 18)
  tiff.writeUInt16LE(1, 26) // EXIF IFD: LensModel
  tiff.writeUInt16LE(0xa434, 28)
  tiff.writeUInt16LE(2, 30)
  tiff.writeUInt32LE(lens.length, 32)
  tiff.writeUInt32LE(44, 36)
  lens.copy(tiff, 44)
  const head = Buffer.from([0xff, 0xe1, 0, 0, 0x45, 0x78, 0x69, 0x66, 0, 0])
  head.writeUInt16BE(2 + 6 + tiff.length, 2)
  return { name: 'selfie.jpg', mimeType: 'image/jpeg', buffer: Buffer.concat([jpeg.subarray(0, 2), head, tiff, jpeg.subarray(2)]) }
}

/** The colour at the left edge of a photo: 'red', 'blue' or something else. */
const leftColour = (img) =>
  img.evaluate(async (el) => {
    await el.decode()
    const c = document.createElement('canvas')
    c.width = el.naturalWidth
    c.height = el.naturalHeight
    const x = c.getContext('2d')
    x.drawImage(el, 0, 0)
    const [r, , b] = x.getImageData(4, c.height >> 1, 1, 1).data
    return r > 180 && b < 80 ? 'red' : b > 180 && r < 80 ? 'blue' : `rgb ${r},${b}`
  })

async function add(page, text) {
  const input = page.getByLabel('Add something')
  await input.fill(text)
  await input.press('Enter')
}

try {
  // ── A creates the household ──
  const A = await phone('A')
  await A.page.screenshot({ path: `${OUT}/0-signin.png` })
  await signUp(A.page, `a-${run}@test.dev`)
  await A.page.getByLabel('Your name').fill('Sara')
  await A.page.locator('.photo-picker input[type=file]').setInputFiles('public/pwa-512x512.png')
  check(await A.page.locator('.photo-picker-face img').first().waitFor({ timeout: 8000 }).then(() => true).catch(() => false), 'A adds a profile photo on setup')
  await A.page.screenshot({ path: `${OUT}/0-setup.png` })
  await A.page.getByRole('button', { name: 'Start our list' }).click()
  await A.page.locator('.large-title').waitFor()
  check(true, 'A signs up and creates the household')
  await A.page.waitForTimeout(700)
  await A.page.screenshot({ path: `${OUT}/0-home-empty.png` })
  await tab(A.page, 'Groceries')
  await A.page.waitForTimeout(700)
  await A.page.screenshot({ path: `${OUT}/0-groceries-empty.png` })
  check(
    (await A.page.locator('.tab-label').allTextContents()).join() === 'Home,Groceries,Important,Meals,Us',
    'tab bar is Home, Groceries, Important, Meals, Us',
  )
  check((await A.page.locator('.large-title').textContent()) === 'Groceries', 'the tab is called Groceries')
  check((await A.page.locator('section[data-list]').count()) === 0, 'Groceries is one list, with no sections')
  await tab(A.page, 'Home')

  await A.page.locator('.members-btn').click()
  const code = (await A.page.locator('.invite-code').textContent()).trim()
  check(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(code), `invite code shown (${code})`)
  await A.page.keyboard.press('Escape')

  // ── B joins with the code ──
  const B = await phone('B')
  await signUp(B.page, `b-${run}@test.dev`)
  await B.page.getByLabel('Your name').fill('Omar')
  await B.page.getByLabel('Code').fill(code.toLowerCase())
  await B.page.getByRole('button', { name: 'Join with a code' }).click()
  await B.page.locator('.large-title').waitFor({ timeout: 15000 })
  check(true, 'B joins with the code')
  check(await B.page.locator('.members-btn .avatar--photo img').first().waitFor({ timeout: 30000 }).then(() => true).catch(() => false), 'B sees A’s photo at the top right')
  check((await B.page.locator('.members-btn .avatar').count()) === 2, 'both people show at the top right')

  // ── Live sync A → B ──
  await tab(A.page, 'Home')
  await tab(B.page, 'Home')
  await add(A.page, 'Milk, eggs and bread.')
  check(await visible(A.page, 'Eggs'), 'A: comma/"and" entry splits into items')
  // The first sync right after joining can take ~10 s in WebKit against the local emulator.
  check(await visible(B.page, 'Bread', 20000), 'B sees A’s items live')
  const meta = await B.page.locator('.item', { hasText: 'Milk' }).locator('.item-meta').textContent()
  check(meta.includes('Sara'), `B sees who added it (“${meta.trim()}”)`)

  // ── Live sync B → A via a magnet ──
  await tab(B.page, 'Groceries')
  check(
    (await B.page.locator('.fold-toggle').getAttribute('aria-expanded')) === 'false',
    'Quick add starts folded on a tab that has items',
  )
  await openQuickAdd(B.page)
  await B.page.getByRole('button', { name: 'Add Coffee' }).click()
  check(await visible(A.page, 'Coffee'), 'A sees B’s magnet tap live')

  // ── Tick off on B, check A ──
  await B.page.getByRole('button', { name: 'Got Milk' }).click()
  check(await ticked(A.page, 'Milk'), 'B ticks Milk, A sees it ticked (still in the list)')
  await B.page.getByRole('button', { name: 'Put Milk back' }).click()
  const alert = B.page.locator('.alert')
  check(await alert.getByText('Put Milk back on the list?').isVisible().catch(() => false), 'unticking asks first')
  await B.page.screenshot({ path: `${OUT}/untick-alert.png` })
  await alert.getByRole('button', { name: 'Put back' }).click()
  check(await ticked(A.page, 'Milk', false), 'after confirming, Milk is unticked on A')

  // ── Re-adding something already on the list is a no-op ──
  await add(A.page, 'milk')
  check(await A.page.locator('.toast', { hasText: 'already on the list' }).isVisible(), 'duplicate add is caught')

  // ── Offline on A ──
  await A.ctx.setOffline(true)
  await add(A.page, 'Olive oil')
  check(await visible(A.page, 'Olive oil', 3000), 'A adds while offline (shows instantly)')
  await B.page.waitForTimeout(1500)
  check(!(await B.page.locator('.item-name', { hasText: 'Olive oil' }).count()), 'B doesn’t have it yet')
  await A.ctx.setOffline(false)
  check(await visible(B.page, 'Olive oil', 20000), 'offline add syncs to B once A is back online')

  // ── Photo add on B ──
  await B.page.locator('.quick-add input[type=file]').setInputFiles('public/pwa-512x512.png')
  await B.page.locator('.pending-photo img').waitFor()
  await add(B.page, 'Oat milk')
  await tab(A.page, 'Groceries')
  check(await visible(A.page, 'Oat milk'), 'A sees B’s photo item')
  const thumb = A.page.locator('.item', { hasText: 'Oat milk' }).locator('.item-thumb img')
  check(await thumb.waitFor({ timeout: 8000 }).then(() => true).catch(() => false), 'photo thumbnail syncs')

  // ── Household things go on Groceries too, then Important ──
  await tab(A.page, 'Important')
  check(
    (await A.page.locator('.fold-toggle').getAttribute('aria-expanded')) === 'true',
    'Quick add is open on a tab with nothing on it',
  )
  check((await A.page.locator('.list-chip').count()) === 0, 'Important has no list chip')
  await tab(A.page, 'Groceries')
  check((await A.page.locator('.list-chip').count()) === 0, 'Groceries has no list chip')
  await openQuickAdd(A.page)
  await A.page.getByRole('button', { name: 'Add Dish soap' }).click()
  await add(A.page, 'Light bulbs')
  check(
    (await visible(A.page, 'Light bulbs')) && (await visible(A.page, 'Dish soap')) &&
      (await A.page.locator('.group').count()) === 1,
    'household things land in the one Groceries list',
  )
  await A.page.screenshot({ path: `${OUT}/groceries-list.png`, fullPage: true })
  await tab(A.page, 'Important')
  await add(A.page, 'Passport renewal')
  await add(A.page, 'Dentist appointment')
  await visible(A.page, 'Dentist appointment') // let the new row settle before tapping the one below it
  await A.page.locator('.item-body', { hasText: 'Passport renewal' }).click()
  const due = new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10)
  await A.page.locator('.sheet input[type=date]').fill(due)
  await A.page.locator('.sheet').screenshot({ path: `${OUT}/sheet-important.png` })
  await A.page.keyboard.press('Escape')
  check(
    await A.page.locator('.item', { hasText: 'Passport renewal' }).locator('.item-due')
      .waitFor({ timeout: 8000 }).then(() => true).catch(() => false),
    'due date set from the item sheet',
  )

  // ── Note on an item syncs to the other phone ──
  await tab(A.page, 'Groceries')
  await A.page.locator('.item-body', { hasText: 'Eggs' }).first().click()
  await A.page.locator('.sheet textarea').fill('Free range, a dozen')
  await A.page.locator('.sheet-done').click()
  await tab(B.page, 'Groceries')
  check(
    await B.page.locator('.item', { hasText: 'Eggs' }).locator('.item-note', { hasText: 'Free range' })
      .waitFor({ timeout: 8000 }).then(() => true).catch(() => false),
    'note added on A shows under the item on B',
  )

  // ── Press and hold opens the item menu; Delete asks first ──
  await tab(A.page, 'Groceries')
  await A.page.waitForTimeout(400) // let the slide-in finish so the row doesn't move under the pointer
  const bulbs = A.page.locator('.item-body', { hasText: 'Light bulbs' }).first()
  await bulbs.evaluate((el) => el.scrollIntoView({ block: 'center' }))
  await A.page.waitForTimeout(200)
  const box = await bulbs.boundingBox()
  await A.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await A.page.mouse.down()
  await A.page.waitForTimeout(700)
  await A.page.mouse.up()
  const holdAlert = A.page.locator('.alert')
  check(
    await holdAlert.getByText('Delete Light bulbs?').isVisible().catch(() => false),
    'press and hold asks to delete',
  )
  await A.page.screenshot({ path: `${OUT}/hold-menu.png` })
  await holdAlert.getByRole('button', { name: 'Delete' }).click()
  await tab(B.page, 'Groceries')
  check(await gone(B.page, 'Light bulbs'), 'delete from the hold menu removes it on B')

  // ── Multi-select: tick two, Got it ──
  await tab(A.page, 'Groceries')
  await A.page.locator('.select-toggle').click()
  check((await A.page.locator('.select-toggle').textContent()) === 'Unselect', 'Select toggles to Unselect')
  await A.page.locator('.item-body', { hasText: 'Olive oil' }).first().click()
  await A.page.locator('.item-body', { hasText: 'Coffee' }).first().click()
  await A.page.screenshot({ path: `${OUT}/multi-select.png` })
  await A.page.locator('.select-bar').getByRole('button', { name: 'Got it' }).click()
  await tab(B.page, 'Groceries')
  check(
    (await ticked(B.page, 'Olive oil')) && (await ticked(B.page, 'Coffee')),
    'multi-select Got it ticks both items on B',
  )

  // ── Quantity: typed in, then changed with the stepper ──
  await add(A.page, '3 apples')
  check(
    await A.page.locator('.item', { hasText: 'Apples' }).locator('.qty-value', { hasText: /^3$/ })
      .waitFor({ timeout: 8000 }).then(() => true).catch(() => false),
    '"3 apples" adds Apples ×3',
  )
  await A.page.locator('.item-body', { hasText: 'Apples' }).first().click()
  await A.page.getByRole('button', { name: 'One more' }).click()
  await A.page.locator('.sheet').screenshot({ path: `${OUT}/sheet-qty.png` })
  await A.page.locator('.sheet-done').click()
  check(
    await B.page.locator('.item', { hasText: 'Apples' }).locator('.qty-value', { hasText: /^4$/ })
      .waitFor({ timeout: 8000 }).then(() => true).catch(() => false),
    'stepper change to ×4 syncs to B',
  )
  // Inline: tap the number, then + in the row.
  await A.page.locator('.item', { hasText: 'Apples' }).locator('.qty-value').click()
  await A.page.getByRole('button', { name: 'One more Apples' }).click()
  await A.page.locator('.item', { hasText: 'Apples' }).screenshot({ path: `${OUT}/qty-inline.png` })
  check(
    await B.page.locator('.item', { hasText: 'Apples' }).locator('.qty-value', { hasText: /^5$/ })
      .waitFor({ timeout: 8000 }).then(() => true).catch(() => false),
    'inline + in the row (×5) syncs to B',
  )
  // ── Home sections fold to one line ──
  await tab(A.page, 'Home')
  await A.page.locator('.section-head', { hasText: 'Groceries' }).click()
  check(
    (await A.page.locator('section[data-list=grocery] .folded-names').textContent()).includes('Apples') &&
      (await A.page.locator('section[data-list=grocery] .item').count()) === 0,
    'tapping Groceries on Home folds it to its heading plus item names',
  )
  await A.page.screenshot({ path: `${OUT}/home-folded.png` })
  check(await A.page.locator('section[data-list=grocery] .folded-show', { hasText: 'Show all' }).isVisible(), 'folded card says Show all')
  check(/×\d/.test(await A.page.locator('section[data-list=grocery] .folded-names').textContent()), 'folded names include quantities')
  check((await A.page.locator('section[aria-label="Quick add"]').count()) === 0, 'Home hides quick add once items are on the list')
  await A.page.locator('section[data-list=grocery] .folded-head').click()
  check((await A.page.locator('section[data-list=grocery] .item').count()) > 0, 'tapping again unfolds it')

  // ── The page behind a sheet stays put; the bar stays on the bottom edge ──
  await A.page.evaluate(() => document.querySelector('.item-body').scrollIntoView({ block: 'center' }))
  const before = await A.page.evaluate(() => window.scrollY)
  await A.page.locator('.item-body').first().click()
  await A.page.locator('.sheet').waitFor()
  check(
    (await A.page.evaluate(() => getComputedStyle(document.body).position)) === 'fixed',
    'page behind the sheet is locked',
  )
  await A.page.mouse.move(200, 60)
  await A.page.mouse.wheel(0, 600).catch(() => {}) // mobile WebKit has no wheel
  await A.page.locator('.sheet-done').click()
  check(
    (await A.page.evaluate(() => [getComputedStyle(document.body).position, window.scrollY])).join() ===
      ['static', before].join(),
    'closing the sheet unlocks the page at the same scroll spot',
  )
  await A.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await A.page.waitForTimeout(200)
  await A.page.evaluate(() => window.scrollTo(0, 0))
  await A.page.waitForTimeout(300)
  const gap = await A.page.evaluate(() => innerHeight - document.querySelector('.dock').getBoundingClientRect().bottom)
  check(Math.abs(gap) < 1, `bottom bar stays on the bottom edge after scrolling (${gap}px)`)

  await B.page.getByRole('button', { name: 'Got Bread' }).click().catch(() => {})
  await tab(B.page, 'Home')

  // Home on B: the chip guesses the list from history
  await B.page.getByLabel('Add something').fill('passport renewal')
  const chip = await B.page.locator('.list-chip').textContent()
  check(chip.includes('Important'), `Home chip guesses the list from history (${chip.trim()})`)
  check(
    (await B.page.locator('.list-card .list-card-name').allTextContents()).join() === 'Groceries,Important,Meals,Us',
    'Home has a card for each tab',
  )
  await B.page.getByLabel('Add something').fill('')

  // ── Us tab: notes board ──
  await tab(A.page, 'Us')
  await tab(B.page, 'Us')
  await A.page.getByLabel('New note').fill('Dinner at 8 🍝 bring the good plates')
  await A.page.getByLabel('New note').press('Enter')
  const noteOnB = B.page.locator('.note', { hasText: 'Dinner at 8' })
  check(await noteOnB.waitFor({ timeout: 8000 }).then(() => true).catch(() => false), 'note written on A shows on B')
  // B adds a checklist item in the note sheet
  await noteOnB.locator('.note-open').click()
  await B.page.locator('.sheet').getByRole('button', { name: '+ Add item' }).click()
  await B.page.getByLabel('Checklist item 1').fill('Wine')
  await B.page.locator('.sheet .select-toggle', { hasText: 'Pin' }).click()
  await B.page.locator('.sheet').screenshot({ path: `${OUT}/note-sheet.png` })
  await B.page.locator('.sheet-done').click()
  const noteOnA = A.page.locator('.note', { hasText: 'Dinner at 8' })
  check(
    await noteOnA.locator('.note-check', { hasText: 'Wine' }).waitFor({ timeout: 8000 }).then(() => true).catch(() => false),
    'checklist item added on B shows on A',
  )
  check(
    await noteOnA.locator('.note-pin').waitFor({ timeout: 8000 }).then(() => true).catch(() => false),
    'pin from B shows on A',
  )
  await noteOnA.locator('.note-check', { hasText: 'Wine' }).click()
  check(
    await noteOnB.locator('.note-check[data-done]', { hasText: 'Wine' }).waitFor({ timeout: 8000 }).then(() => true).catch(() => false),
    'ticking a checklist item on the card syncs',
  )
  // A blank "New note" that is closed empty is thrown away
  const notesBefore = await A.page.locator('.note').count()
  await A.page.locator('section[aria-label=Notes] .select-toggle', { hasText: 'New note' }).click()
  await A.page.locator('.sheet-done').click()
  let notesAfter = -1
  for (let t = 0; t < 25 && notesAfter !== notesBefore; t++) {
    await A.page.waitForTimeout(200)
    notesAfter = await A.page.locator('.note').count()
  }
  check(notesAfter === notesBefore, 'an empty new note is discarded on close')

  // ── Hearts (on Home) ──
  check((await A.page.locator('.hearts').count()) === 0, 'hearts are no longer on Us')
  await tab(A.page, 'Home')
  await tab(B.page, 'Groceries')
  check((await A.page.locator('.hearts .heart-quick').count()) === 12, 'twelve things to send, in one row')
  {
    const [track, last] = await Promise.all([
      A.page.locator('.hearts .send-pings-track').boundingBox(),
      A.page.locator('.hearts .heart-quick').last().boundingBox(),
    ])
    check(last.x + last.width > track.x + track.width, 'the send row runs off the edge (swipe for more)')
  }
  await A.page.getByRole('button', { name: 'Send: Heart' }).click()
  check(
    await B.page.locator('.ping-card', { hasText: 'sent a heart' }).waitFor({ timeout: 8000 }).then(() => true).catch(() => false),
    'a heart from A pops up on B',
  )
  check(
    (await B.page.locator('.ping-card-name').textContent()) === 'Sara' && (await B.page.locator('.ping-card img').count()) === 1,
    'the pop-up shows A’s name and photo',
  )
  check((await B.page.locator('.heart-rain').count()) > 0, 'B gets the heart shower')
  await B.page.screenshot({ path: `${OUT}/heart-arrives.png` })
  await A.page.waitForTimeout(400)
  await A.page.getByRole('button', { name: 'Send: Heart' }).click()
  await A.page.waitForTimeout(400)
  await A.page.getByRole('button', { name: 'Send: Rose' }).click()
  await tab(B.page, 'Home')
  check(
    await B.page.locator('.hearts-in', { hasText: 'Sara' }).filter({ has: B.page.locator('.hearts-last', { hasText: 'Sent a rose' }) }).waitFor({ timeout: 8000 }).then(() => true).catch(() => false),
    'B sees the latest one big on Home (a rose)',
  )
  check(
    await B.page.locator('.hearts-when', { hasText: '3 today' }).waitFor({ timeout: 8000 }).then(() => true).catch(() => false),
    'the strip says how many came in today (3 today)',
  )
  await B.page.locator('.hearts').evaluate((el) => el.scrollIntoView({ block: 'start' }))
  await B.page.waitForTimeout(300)
  await B.page.screenshot({ path: `${OUT}/hearts-card.png` })
  check(await B.page.locator('.hearts-big img').isVisible(), 'the hearts card shows the sender’s large photo beside the message')

  // ── The Hearts sheet: today / this week, latest, and a grid to send from ──
  await B.page.locator('.hearts-in').click()
  const hs = B.page.locator('.sheet')
  check(await hs.locator('.hearts-score').waitFor({ timeout: 8000 }).then(() => true).catch(() => false), 'tapping the strip opens the Hearts sheet')
  const nums = async () => (await hs.locator('.hearts-score-n').allTextContents()).join()
  check((await nums()) === '3,0', `today: 3 from Sara, 0 from you (${await nums()})`)
  const row = (kind) => hs.locator(`.hearts-row[data-kind=${kind}] .hearts-row-n`)
  check(
    (await row('heart').textContent()) === '20' && (await row('rose').textContent()) === '10',
    'breakdown: ❤️ 2 · 0 and 🌹 1 · 0',
  )
  check((await hs.locator('.hearts-recent').first().textContent()).includes('sent a rose'), 'Latest starts with the rose')
  await B.page.screenshot({ path: `${OUT}/hearts-sheet.png` })
  await hs.getByRole('button', { name: 'This week' }).click()
  check((await nums()) === '3,0', 'this week includes today')
  await hs.getByRole('button', { name: 'Send: Hug' }).click()
  check(
    await A.page.locator('.ping-card', { hasText: 'sent a hug' }).waitFor({ timeout: 8000 }).then(() => true).catch(() => false),
    'sending from the sheet’s grid reaches A',
  )
  check(
    await B.page.waitForFunction(() => [...document.querySelectorAll('.sheet .hearts-score-n')].map((e) => e.textContent).join() === '3,1', null, { timeout: 8000 })
      .then(() => true).catch(() => false),
    'the sheet counts what you send, live (3 · 1)',
  )
  await B.page.locator('.sheet-done').click()
  await A.page.waitForTimeout(3800) // let the hug pop-up on A finish
  // The last one in the row is reachable by swiping (Playwright scrolls it into view).
  await A.page.locator('.hearts').getByRole('button', { name: 'Send: Haha' }).click()
  check(await B.page.locator('.ping-card', { hasText: 'is laughing' }).waitFor({ timeout: 8000 }).then(() => true).catch(() => false), 'the 12th, swiped into view, sends too')

  // ── B adds a photo later, from the top right ──
  await B.page.locator('.members-btn').click()
  await B.page.locator('.sheet .photo-picker input[type=file]').setInputFiles(await frontCameraSelfie(B.page))
  check(await B.page.locator('.sheet .photo-picker-face img').first().waitFor({ timeout: 8000 }).then(() => true).catch(() => false), 'B adds a photo in Settings')
  const face = B.page.locator('.sheet .photo-picker-face img')
  const shot = await leftColour(face)
  check(shot === 'blue', `a selfie just taken with the front camera is mirrored, like the preview (left edge: ${shot})`)
  const shotSrc = await face.getAttribute('src')
  await B.page.getByRole('button', { name: 'Flip photo left to right' }).click()
  await B.page.waitForFunction((src) => document.querySelector('.sheet .photo-picker-face img')?.getAttribute('src') !== src, shotSrc, { timeout: 8000 })
  const flipped = await leftColour(face)
  check(flipped === 'red', `Flip turns it back (left edge: ${flipped})`)
  // Remove asks first; Cancel keeps the photo.
  await B.page.locator('.sheet .photo-picker').getByRole('button', { name: 'Remove' }).click()
  const removeAlert = B.page.locator('.alert', { hasText: 'Remove your photo?' })
  check(await removeAlert.isVisible().catch(() => false), 'removing the photo asks first')
  await B.page.screenshot({ path: `${OUT}/remove-photo-alert.png` })
  await removeAlert.getByRole('button', { name: 'Cancel' }).click()
  check(await face.isVisible(), 'Cancel keeps the photo')
  await B.page.locator('.sheet .photo-picker').getByRole('button', { name: 'Remove' }).click()
  await B.page.locator('.alert').getByRole('button', { name: 'Remove' }).click()
  check(
    await B.page.locator('.sheet .photo-picker-face img').waitFor({ state: 'detached', timeout: 8000 }).then(() => true).catch(() => false),
    'confirming Remove takes the photo away',
  )
  await B.page.locator('.sheet .photo-picker input[type=file]').setInputFiles(await frontCameraSelfie(B.page))
  await face.waitFor({ timeout: 8000 })
  await B.page.locator('.sheet').screenshot({ path: `${OUT}/settings-photo.png` })
  await B.page.keyboard.press('Escape')
  check(
    await A.page.waitForFunction(() => document.querySelectorAll('.members-btn .avatar--photo').length === 2, null, { timeout: 8000 })
      .then(() => true).catch(() => false),
    'A sees B’s new photo too',
  )
  await tab(A.page, 'Us')

  // ── Delete a note by press and hold ──
  await tab(B.page, 'Us')
  const card = A.page.locator('.note', { hasText: 'Dinner at 8' }).locator('.note-open')
  await card.evaluate((el) => el.scrollIntoView({ block: 'center' }))
  await A.page.waitForTimeout(300)
  const nb = await card.boundingBox()
  await A.page.mouse.move(nb.x + nb.width / 2, nb.y + nb.height / 2)
  await A.page.mouse.down()
  await A.page.waitForTimeout(700)
  await A.page.mouse.up()
  await A.page.locator('.alert').getByRole('button', { name: 'Delete' }).click()
  check(
    await B.page.locator('.note', { hasText: 'Dinner at 8' }).waitFor({ state: 'detached', timeout: 8000 }).then(() => true).catch(() => false),
    'holding a note and confirming deletes it on B too',
  )

  // ── Meal planner → Groceries ──
  await tab(A.page, 'Meals')
  await tab(B.page, 'Meals')
  check((await B.page.locator('.meal-row:not(.recipe-row)').count()) === 7, 'Meals shows the week')
  check((await A.page.locator('section[aria-label=Notes]').count()) === 0, 'Meals tab has only meals')
  check(await A.page.locator('.recipe-empty').isVisible(), 'Our meals starts empty, with a hint')

  // ── Our meals: save one from the add bar (with ingredients after a colon) ──
  await A.page.getByLabel('Save a meal').fill('Pasta night: pasta, 2 tomatoes, basil')
  await A.page.getByLabel('Save a meal').press('Enter')
  const pastaOnB = B.page.locator('.recipe-row', { hasText: 'Pasta night' })
  check(await pastaOnB.waitFor({ timeout: 8000 }).then(() => true).catch(() => false), 'a meal saved on A shows in Our meals on B')
  check((await pastaOnB.locator('.meal-ingredients').textContent()) === 'pasta, 2 tomatoes, basil', 'with its ingredients')
  await A.page.getByLabel('Save a meal').fill('pasta NIGHT')
  await A.page.getByLabel('Save a meal').press('Enter')
  check(await A.page.locator('.toast', { hasText: 'already in Our meals' }).waitFor({ timeout: 5000 }).then(() => true).catch(() => false), 'saving the same meal twice is caught')
  await A.page.getByLabel('Save a meal').fill('')

  // ── Plan today from the saved meal ──
  await A.page.locator('.meal-row[data-today]').click()
  await A.page.locator('.sheet .recipe-pick', { hasText: 'Pasta night' }).click()
  check(
    (await A.page.getByPlaceholder('What’s for dinner?').inputValue()) === 'Pasta night' &&
      (await A.page.locator('#meal-ingredients').inputValue()) === 'pasta, 2 tomatoes, basil',
    'tapping a saved meal fills in the day, ingredients and all',
  )
  check((await A.page.locator('.sheet').getByRole('button', { name: 'Save to Our meals' }).count()) === 0, 'no "Save to Our meals" for a meal that is already saved')
  await A.page.locator('.sheet').getByRole('button', { name: 'Add ingredients to Groceries' }).click()
  await A.page.locator('.sheet').screenshot({ path: `${OUT}/meal-sheet.png` })
  await A.page.locator('.sheet-done').click()
  check(
    await B.page.locator('.meal-row[data-today] .meal-name', { hasText: 'Pasta night' }).waitFor({ timeout: 8000 }).then(() => true).catch(() => false),
    "today's meal planned on A shows on B",
  )
  await tab(B.page, 'Groceries')
  check(
    (await visible(B.page, 'Pasta')) &&
      (await B.page.locator('.item', { hasText: 'Tomatoes' }).locator('.qty-value', { hasText: /^2$/ }).waitFor({ timeout: 8000 }).then(() => true).catch(() => false)) &&
      (await visible(B.page, 'Basil')),
    'meal ingredients land in Groceries on B, with "2 tomatoes" as Tomatoes ×2',
  )
  await A.page.locator('.meal-add-all').click()
  check(
    await A.page.locator('.toast', { hasText: 'already on the list' }).waitFor({ timeout: 5000 }).then(() => true).catch(() => false),
    'adding the week again skips what is already on the list',
  )
  await A.page.screenshot({ path: `${OUT}/meals.png`, fullPage: true })

  // ── A saved meal's sheet: ingredients, plan it, replace asks first, delete asks first ──
  await tab(B.page, 'Meals')
  await B.page.getByLabel('Save a meal').fill('Tacos')
  await B.page.getByLabel('Save a meal').press('Enter')
  await B.page.locator('.recipe-row', { hasText: 'Tacos' }).click()
  await B.page.locator('#recipe-ingredients').fill('tortillas, beans, 2 avocados')
  await B.page.locator('.sheet .plan-day').nth(1).click()
  check(await B.page.locator('.toast', { hasText: 'Planned Tacos for' }).waitFor({ timeout: 5000 }).then(() => true).catch(() => false), 'plan a saved meal for tomorrow from its sheet')
  check(await B.page.locator('.sheet .plan-day[data-planned]').first().isVisible(), 'days that already have a meal are marked')
  await B.page.locator('.sheet').screenshot({ path: `${OUT}/recipe-sheet.png` })
  await B.page.locator('.sheet .plan-day').first().click()
  const replace = B.page.locator('.alert', { hasText: 'Replace Pasta night?' })
  check(await replace.waitFor({ timeout: 5000 }).then(() => true).catch(() => false), 'planning over a day that has a meal asks first')
  await replace.getByRole('button', { name: 'Cancel' }).click()
  await B.page.locator('.sheet-done').click()
  check(
    await A.page.locator('.recipe-row', { hasText: 'Tacos' }).locator('.meal-ingredients', { hasText: 'tortillas, beans, 2 avocados' }).waitFor({ timeout: 8000 }).then(() => true).catch(() => false),
    'ingredients added in the sheet on B show on A',
  )
  check(
    (await A.page.locator('.meal-row[data-today] .meal-name').textContent()) === 'Pasta night',
    'Cancel kept today’s meal',
  )
  await B.page.locator('.recipe-row', { hasText: 'Tacos' }).click()
  await B.page.locator('.sheet').getByRole('button', { name: 'Delete meal' }).click()
  const del = B.page.locator('.alert', { hasText: 'Delete Tacos?' })
  check(await del.waitFor({ timeout: 5000 }).then(() => true).catch(() => false), 'deleting a saved meal asks first')
  await del.getByRole('button', { name: 'Delete' }).click()
  check(
    await A.page.locator('.recipe-row', { hasText: 'Tacos' }).waitFor({ state: 'detached', timeout: 8000 }).then(() => true).catch(() => false),
    'a deleted meal goes from Our meals on A too',
  )
  await A.page.screenshot({ path: `${OUT}/our-meals.png`, fullPage: true })
  await tab(A.page, 'Us')
  check((await A.page.locator('.meal-row').count()) === 0, 'Us no longer shows meals')

  // ── Countdowns ──
  await tab(A.page, 'Us')
  await tab(B.page, 'Us')
  await A.page.locator('.cd-add').click()
  await A.page.getByPlaceholder('Paris trip, anniversary…').fill('Paris trip')
  await A.page.locator('.cd-emoji-pick button', { hasText: '✈️' }).click()
  await A.page.locator('.sheet').screenshot({ path: `${OUT}/countdown-sheet.png` })
  await A.page.locator('.sheet').getByRole('button', { name: 'Add countdown' }).click()
  const cdOnB = B.page.locator('.cd-card', { hasText: 'Paris trip' })
  check(await cdOnB.waitFor({ timeout: 8000 }).then(() => true).catch(() => false), 'countdown added on A shows on B')
  check((await cdOnB.locator('.cd-days').textContent()) === '7', 'it counts 7 days to the default date (a week ahead)')

  // ── Date jar ──
  for (const idea of ['Picnic in the park', 'Movie night']) {
    await A.page.getByLabel('Add a date idea').fill(idea)
    await A.page.getByLabel('Add a date idea').press('Enter')
  }
  check(
    await B.page.locator('.jar-count', { hasText: '2 ideas' }).waitFor({ timeout: 8000 }).then(() => true).catch(() => false),
    'ideas dropped in the jar on A show on B',
  )
  await A.page.locator('.jar-stage').getByRole('button', { name: 'Pick one' }).click()
  const result = A.page.locator('.jar-result')
  check(await result.waitFor({ timeout: 4000 }).then(() => true).catch(() => false), 'Pick one lands on an idea')
  const pickedText = (await result.textContent()) ?? ''
  check(/Picnic in the park|Movie night/.test(pickedText), `the pick is one of the ideas (${pickedText.trim()})`)
  await A.page.screenshot({ path: `${OUT}/date-jar.png`, fullPage: true })
  await A.page.locator('.jar-stage').getByRole('button', { name: 'Let’s do it' }).click()
  check(
    await B.page.locator('.jar-count', { hasText: '1 idea' }).waitFor({ timeout: 8000 }).then(() => true).catch(() => false),
    "Let's do it marks it done on B too",
  )

  // ── Screenshots of every room, light and dark ──
  for (const scheme of ['light', 'dark']) {
    await A.page.emulateMedia({ colorScheme: scheme })
    for (const [i, label] of ['Home', 'Groceries', 'Important', 'Meals', 'Us'].entries()) {
      await tab(A.page, label)
      await A.page.waitForTimeout(500)
      await A.page.screenshot({ path: `${OUT}/${i + 1}-${label.toLowerCase()}-${scheme}.png`, fullPage: true })
    }
  }
  {
    await tab(A.page, 'Us')
    await A.page.waitForTimeout(500)
    const usWide = await A.page.evaluate(() => {
      const W = innerWidth
      const over = [...document.querySelectorAll('body *')]
        .map((el) => [el, el.getBoundingClientRect()])
        .filter(([, r]) => r.right > W + 0.5 && r.width > 0)
        .map(([el]) => el.className)
      return { extra: document.documentElement.scrollWidth - W, over: over.slice(0, 4) }
    })
    check(usWide.extra <= 0, `no sideways scrolling on Us (${usWide.extra}px; ${usWide.over.join(' | ')})`)
  }
  await A.page.emulateMedia({ colorScheme: 'light' })
  await tab(A.page, 'Groceries')
  await A.page.waitForTimeout(400)
  const wide = await A.page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
  check(wide <= 0, `no sideways scrolling on a list screen (${wide}px extra)`)
  if (await A.page.locator('.recent-head').count()) await A.page.locator('.recent-head').click()
  await A.page.screenshot({ path: `${OUT}/groceries-recent.png`, fullPage: true })
  await tab(A.page, 'Home')
  await A.page.locator('.members-btn').click()
  await A.page.waitForTimeout(400)
  await A.page.screenshot({ path: `${OUT}/settings.png` })
  await A.page.keyboard.press('Escape')
  await A.page.locator('.item-body', { hasText: 'Oat milk' }).first().click()
  await A.page.waitForTimeout(400)
  await A.page.screenshot({ path: `${OUT}/sheet-photo.png` })
  await A.page.keyboard.press('Escape')

  // ── B leaves the list, then joins again with the same code ──
  await B.page.locator('.members-btn').click()
  await B.page.getByRole('button', { name: 'Leave this list' }).click()
  const leaveAlert = B.page.locator('.alert')
  check(await leaveAlert.getByText(/^Leave /).isVisible().catch(() => false), 'Leave asks first')
  await B.page.screenshot({ path: `${OUT}/leave-alert.png` })
  await leaveAlert.getByRole('button', { name: 'Leave' }).click()
  check(
    await B.page.getByLabel('Code').waitFor({ timeout: 10000 }).then(() => true).catch(() => false),
    'after leaving, B is back on the start-or-join screen',
  )
  await A.page.locator('.members-btn').click()
  check(
    await A.page.locator('.sheet', { hasText: 'Waiting for someone to join' })
      .waitFor({ timeout: 8000 }).then(() => true).catch(() => false),
    'A sees B has left (waiting for someone again)',
  )
  await A.page.keyboard.press('Escape')
  check(await B.page.locator('.photo-picker-face img').first().waitFor({ timeout: 8000 }).then(() => true).catch(() => false), 'after leaving, B’s photo is still there for the next list')
  await B.page.getByLabel('Your name').fill('Omar')
  await B.page.getByLabel('Code').fill(code)
  await B.page.getByRole('button', { name: 'Join with a code' }).click()
  await B.page.locator('.large-title').waitFor({ timeout: 15000 })
  await tab(B.page, 'Groceries')
  check(await visible(B.page, 'Oat milk'), 'B can join again with the same code and sees the list')
  check(
    await A.page.waitForFunction(() => document.querySelectorAll('.members-btn .avatar--photo').length === 2, null, { timeout: 10000 })
      .then(() => true).catch(() => false),
    'B’s photo comes back with them',
  )
} catch (e) {
  failed++
  console.error('ERROR', e)
} finally {
  const real = errors.filter((e) => !/offline|network|Could not reach|WebChannel|net::|internal error|Beacon API/i.test(e))
  check(real.length === 0, `no console errors${real.length ? ':\n  ' + real.join('\n  ') : ''}`)
  await browser.close()
  console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed')
  process.exit(failed ? 1 : 0)
}
