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
  await page.locator('.tab', { hasText: label }).click()
  await page.locator('.large-title').first().waitFor()
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
  await B.page.getByRole('button', { name: 'Add Coffee' }).click()
  check(await visible(A.page, 'Coffee'), 'A sees B’s magnet tap live')

  // ── Tick off on B, check A ──
  await B.page.getByRole('button', { name: 'Got Milk' }).click()
  check(await gone(A.page, 'Milk'), 'B ticks off Milk, it leaves A’s list')
  await B.page.getByRole('button', { name: 'Undo' }).click()
  check(await visible(A.page, 'Milk'), 'Undo puts Milk back on A’s list')

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
  await A.page.getByRole('button', { name: 'Add Dish soap' }).click()
  await add(A.page, 'Light bulbs')
  await tab(A.page, 'Important')
  await add(A.page, 'Passport renewal')
  await add(A.page, 'Dentist appointment')
  await A.page.locator('.item-body', { hasText: 'Passport renewal' }).click()
  const due = new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10)
  await A.page.locator('.sheet input[type=date]').fill(due)
  await A.page.locator('.sheet').screenshot({ path: `${OUT}/sheet-important.png` })
  await A.page.keyboard.press('Escape')
  check(
    await A.page.locator('.item', { hasText: 'Passport renewal' }).locator('.item-due').isVisible(),
    'due date set from the item sheet',
  )
  await B.page.getByRole('button', { name: 'Got Bread' }).click().catch(() => {})
  await tab(B.page, 'Home')

  // Home on B: guess room from history (Dish soap → Pantry)
  await B.page.getByLabel('Add something').fill('dish soap')
  const chip = await B.page.locator('.list-chip').textContent()
  check(chip.includes('Household'), `Home chip guesses the room from history (${chip.trim()})`)
  await B.page.getByLabel('Add something').fill('')

  // ── Screenshots of every room, light and dark ──
  for (const scheme of ['light', 'dark']) {
    await A.page.emulateMedia({ colorScheme: scheme })
    for (const [i, label] of ['Home', 'Grocery', 'Household', 'Important'].entries()) {
      await tab(A.page, label)
      await A.page.waitForTimeout(500)
      await A.page.screenshot({ path: `${OUT}/${i + 1}-${label.toLowerCase()}-${scheme}.png`, fullPage: true })
    }
  }
  await A.page.emulateMedia({ colorScheme: 'light' })
  await tab(A.page, 'Grocery')
  await A.page.waitForTimeout(400)
  const wide = await A.page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
  check(wide <= 0, `no sideways scrolling on a list screen (${wide}px extra)`)
  await A.page.locator('.recent-head').click()
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
