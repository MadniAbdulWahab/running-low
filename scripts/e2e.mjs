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

const visible = (page, text, timeout = 8000) =>
  page
    .locator('.item-name', { hasText: text })
    .first()
    .waitFor({ timeout })
    .then(() => true)
    .catch(() => false)

const gone = (page, text, timeout = 8000) =>
  page
    .locator('.item-name', { hasText: text })
    .first()
    .waitFor({ state: 'detached', timeout })
    .then(() => true)
    .catch(() => false)

async function tab(page, label) {
  // Match the label exactly: "Us" is also inside "Household".
  await page.locator('.tab', { has: page.locator('.tab-label', { hasText: new RegExp(`^${label}$`) }) }).click()
  await page.locator('.large-title').first().waitFor()
}

const ticked = (page, text, want = true, timeout = 8000) =>
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
  await A.page.screenshot({ path: `${OUT}/0-setup.png` })
  await A.page.getByRole('button', { name: 'Start our list' }).click()
  await A.page.locator('.large-title').waitFor()
  check(true, 'A signs up and creates the household')
  await A.page.waitForTimeout(700)
  await A.page.screenshot({ path: `${OUT}/0-home-empty.png` })
  await tab(A.page, 'Grocery')
  await A.page.waitForTimeout(700)
  await A.page.screenshot({ path: `${OUT}/0-grocery-empty.png` })
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

  // ── Live sync A → B ──
  await tab(A.page, 'Home')
  await tab(B.page, 'Home')
  await add(A.page, 'Milk, eggs and bread.')
  check(await visible(A.page, 'Eggs'), 'A: comma/"and" entry splits into items')
  check(await visible(B.page, 'Bread'), 'B sees A’s items live')
  const meta = await B.page.locator('.item', { hasText: 'Milk' }).locator('.item-meta').textContent()
  check(meta.includes('Sara'), `B sees who added it (“${meta.trim()}”)`)

  // ── Live sync B → A via a magnet ──
  await tab(B.page, 'Grocery')
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
  await tab(A.page, 'Grocery')
  check(await visible(A.page, 'Oat milk'), 'A sees B’s photo item')
  const thumb = A.page.locator('.item', { hasText: 'Oat milk' }).locator('.item-thumb img')
  check(await thumb.waitFor({ timeout: 8000 }).then(() => true).catch(() => false), 'photo thumbnail syncs')

  // ── Household + Important ──
  await tab(A.page, 'Household')
  check(
    (await A.page.locator('.fold-toggle').getAttribute('aria-expanded')) === 'true',
    'Quick add is open on a tab with nothing on it',
  )
  await A.page.getByRole('button', { name: 'Add Dish soap' }).click()
  await add(A.page, 'Light bulbs')
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
  await tab(A.page, 'Grocery')
  await A.page.locator('.item-body', { hasText: 'Eggs' }).first().click()
  await A.page.locator('.sheet textarea').fill('Free range, a dozen')
  await A.page.locator('.sheet-done').click()
  await tab(B.page, 'Grocery')
  check(
    await B.page.locator('.item', { hasText: 'Eggs' }).locator('.item-note', { hasText: 'Free range' })
      .waitFor({ timeout: 8000 }).then(() => true).catch(() => false),
    'note added on A shows under the item on B',
  )

  // ── Press and hold opens the item menu; Delete asks first ──
  await tab(A.page, 'Household')
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
  await tab(B.page, 'Household')
  check(await gone(B.page, 'Light bulbs'), 'delete from the hold menu removes it on B')

  // ── Multi-select: tick two, Got it ──
  await tab(A.page, 'Grocery')
  await A.page.locator('.select-toggle').click()
  check((await A.page.locator('.select-toggle').textContent()) === 'Unselect', 'Select toggles to Unselect')
  await A.page.locator('.item-body', { hasText: 'Olive oil' }).first().click()
  await A.page.locator('.item-body', { hasText: 'Coffee' }).first().click()
  await A.page.screenshot({ path: `${OUT}/multi-select.png` })
  await A.page.locator('.select-bar').getByRole('button', { name: 'Got it' }).click()
  await tab(B.page, 'Grocery')
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
  await A.page.locator('.section-head', { hasText: 'Grocery' }).click()
  check(
    (await A.page.locator('section[data-list=grocery] .folded-names').textContent()).includes('Apples') &&
      (await A.page.locator('section[data-list=grocery] .item').count()) === 0,
    'tapping Grocery on Home folds it to its heading plus item names',
  )
  await A.page.screenshot({ path: `${OUT}/home-folded.png` })
  check(await A.page.locator('section[data-list=grocery] .folded-show', { hasText: 'Show all' }).isVisible(), 'folded card says Show all')
  check(/×\d/.test(await A.page.locator('section[data-list=grocery] .folded-names').textContent()), 'folded names include quantities')
  check((await A.page.locator('section[aria-label="Quick add"]').count()) === 0, 'Home hides quick add once items are on the list')
  await A.page.locator('section[data-list=grocery] .folded-head').click()
  check((await A.page.locator('section[data-list=grocery] .item').count()) > 0, 'tapping again unfolds it')

  // ── The page behind a sheet stays put; the bar stays on the bottom edge ──
  await A.page.evaluate(() => window.scrollTo(0, 300))
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

  // Home on B: guess room from history (Dish soap → Pantry)
  await B.page.getByLabel('Add something').fill('dish soap')
  const chip = await B.page.locator('.list-chip').textContent()
  check(chip.includes('Household'), `Home chip guesses the room from history (${chip.trim()})`)
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

  // ── Hearts ──
  await tab(B.page, 'Grocery')
  await A.page.locator('.heart-main').click()
  check(
    await B.page.locator('.toast', { hasText: 'sent a heart' }).waitFor({ timeout: 8000 }).then(() => true).catch(() => false),
    'a heart from A shows on B',
  )
  check((await B.page.locator('.heart-rain').count()) > 0, 'B gets the heart shower')
  await B.page.screenshot({ path: `${OUT}/heart-arrives.png` })

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

  // ── Screenshots of every room, light and dark ──
  for (const scheme of ['light', 'dark']) {
    await A.page.emulateMedia({ colorScheme: scheme })
    for (const [i, label] of ['Home', 'Grocery', 'Household', 'Important', 'Us'].entries()) {
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
  await tab(A.page, 'Grocery')
  await A.page.waitForTimeout(400)
  const wide = await A.page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
  check(wide <= 0, `no sideways scrolling on a list screen (${wide}px extra)`)
  if (await A.page.locator('.recent-head').count()) await A.page.locator('.recent-head').click()
  await A.page.screenshot({ path: `${OUT}/grocery-recent.png`, fullPage: true })
  await tab(A.page, 'Home')
  await A.page.locator('.members-btn').click()
  await A.page.waitForTimeout(400)
  await A.page.screenshot({ path: `${OUT}/settings.png` })
  await A.page.keyboard.press('Escape')
  await A.page.locator('.item-body', { hasText: 'Oat milk' }).first().click()
  await A.page.waitForTimeout(400)
  await A.page.screenshot({ path: `${OUT}/sheet-photo.png` })
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
