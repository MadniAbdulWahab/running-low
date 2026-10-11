# Running Low: project context (handoff)

## Hearts received-message polish (local, not deployed)
- The user asked for receiving an emoji to feel more prominent, following the existing app identity.
- Current layout, explicitly requested by the user: a 72px sender photo/initial occupies the left-hand space, with the full name above the 20px message. Names wrap rather than being truncated. The received emoji follows the message inline at 28px. Time and daily count remain secondary. Longer messages wrap.
- The user rejected the small photo next to the name. Their latest request restores the quiet "Send something to [full name]" hint above the swipeable send row (a neutral join hint while waiting for a partner), keeping the reverted 28px emoji. The Home card's empty state and send confirmation also use the full name. Verified with the production build and Chromium/WebKit layout previews in both themes.
- Appearance polish at the user's request, preserving sizes: the sender uses secondary text colour, the message has a slightly lighter weight and gentler tracking, the photo has a fine edge, and the send section uses a quiet grouped background with an inset divider. The send recipient is subtly emphasised and buttons align with the card's 16px inset. Photo, message, emoji, controls and total card dimensions match the preceding version in Chromium and WebKit at 320, 375, 412, 430 and 768px in both themes. Build passed. Comparison previews: `output/playwright/hearts-refresh/polish-{before,after}-chromium-{light,dark}.png`.
- Keeps the swipeable send row, Hearts sheet, existing arrival animation and data behaviour. Empty/waiting states stay compact; existing reduced-motion styling applies to the emoji pop.
- Verified: production build, existing Chromium two-person end-to-end suite, and Chromium/WebKit component previews in both themes at 320, 375, 412, 430 and 768px. All twelve message kinds fit at 320px; card opens the sheet and empty states work. Preview artifacts: ignored `output/playwright/hearts-refresh/`.

Saved 2026-10-11 so work can resume after a restart. To continue, tell Claude:
**"Read PROJECT_CONTEXT.md and continue building the app."**

## Status (updated 2026-10-11)
- **The app is built and verified.** See README.md for Firebase setup, deploy, and installing on the iPhones.
- **Tests passing:**
  - 13 rules tests (`npm run test:rules`).
  - Type check and build (`npm run build`).
  - All end-to-end checks (`npm run e2e`) in both WebKit and Chromium, with the iPhone 15 profile: sign-up, joining by code, live sync both ways, undo, catching duplicates, offline adding, photo sync, due dates, room guessing on Home.
- **Testing quirk:** Windows WebKit ignores variable font weights and has no date picker. Judge the visuals with `BROWSER=chromium`.
- **Live and deployed:** https://running-low.web.app (Firebase project `running-low`, linked via `.firebaserc`; config in the git-ignored `.env.local`). Repo: github.com/MadniAbdulWahab/running-low.
- **Workflow:** after a change, run `npm run build`, then `npx firebase deploy --only hosting` (or `npm run deploy` if the rules changed), then commit and push. Commits are authored only by `MadniAbdulWahab <madniabdulwahab@gmail.com>`, with no Claude attribution.
- **The user's next step:** test on both iPhones (Safari → Share → Add to Home Screen).
- **Versions installed:** Firebase 13, React 19, Vite 8, TypeScript 7, Vitest 5, vite-plugin-pwa 2.
- **Differences from the plan:**
  - Your name is entered on the setup screen, not at sign-up.
  - First-time users see starter suggestions as Quick add buttons until real history replaces them.
  - Room state lives in the `SignedIn` component in App.tsx; the theme preference comes from `useThemePref`.

## Redesign (2026-10-11)
- The user rejected the "rooms of the house" look (cream, Fraunces serif, terracotta, tiles) as looking AI-made and not nice on mobile.
- From four mockups (Signal, Stamp, Label maker, Native), they chose **Native**: an iOS Reminders-style app with the system font, the #F2F2F7 grouped background and white cards, and true-black dark mode.
- **List colours:** Grocery orange, Household blue, Important red.
- **Navigation (first version):** the home screen had three list cards with the lists grouped below, and tapping one opened that list (back button "Lists"), with no tab bar. The user found this too empty, so it was replaced (see the next section).
- **On a list screen:** "Quick add" pills, then "On the list", then a collapsible "Recently bought".
- **Adding:** a bottom toolbar with an iOS search-field-style input, a camera button, and a blue send button.
- **Fonts:** the fontsource packages were removed.
- **Icon:** a white, nearly empty glass on iOS orange.
- **Live:** https://running-low.web.app (Firebase project 'running-low'). Repo: github.com/MadniAbdulWahab/running-low.
- The "rooms" section below is kept for history only.

## Tabs and emojis (2026-10-11)
- The user said the native version looked too empty. They asked for the bottom tabs back and for decoration.
- **Added:**
  - A four-tab bar (Home, Grocery, Household, Important) with count badges; the back button was removed.
  - Item emojis: `src/lib/emoji.ts` maps about 100 common item names to an emoji, and unknown items fall back to the list's emoji (🛒 🧺 📌). They appear on item rows, Quick add buttons, and the home card previews.
  - Home: the date line, the card previews, a mixed Quick add row, and an empty-state card with stickers.
- Floating background stickers and per-tab colour washes were also tried. The user later removed them (see UI polish).

## UI polish (2026-10-11)
- The user confirmed that the existing native iOS style should be polished, and separately approved removing the floating emoji stickers and colour-wash wallpaper.
- Plain grouped grey in light mode and true black in dark mode; item emojis, category colours, and family initials remain.
- Refined title spacing and tracking, subtler section headings and separators, rounded list cards with labels that fit small phones, and consistent larger touch targets.
- Retains the current four-tab navigation, quick-add workflow, and all existing data/sync behaviour. The dock is now constrained to the same 600px column as the page on larger screens.
- Removed the unused background sticker component and its helper. Empty-state illustrations remain.
- Verified with the production build, Chromium and WebKit two-user end-to-end checks, light/dark screenshot review, and layout checks at 320, 390, 430, 768, and 1440px. The due-date test now waits for the asynchronous label update. Visual artifacts are in ignored `output/playwright/`.
- Deployed and pushed as commit e9b6cf9 "UI refinements".

## Logo (2026-10-11)
- The user chose the basket option from three SVG proposals: refined glass, pantry jar, and nearly empty grocery basket.
- The current logo is a white basket with a small low-stock mark on iOS orange (#FF9500). The SVG source is `public/icon.svg`; use `npm run icons` to regenerate the PWA icons, iPhone Home Screen icon, and favicon.
- This replaces the glass logo recorded in the earlier design history.

## Sign-in screen (2026-10-11)
- The user asked for a more polished mobile first screen that follows the app identity.
- Sign-in and account creation now share a centered basket logo, a short household tagline, full-width labelled inputs, an orange primary action, and a separate account-switch button.
- Styling is scoped to `.auth-screen`, preserving household setup and the main lists. Brand tokens keep button text and links readable in light and dark mode.
- The page scrolls naturally on small screens and uses tighter spacing below 700px height. Safari installation guidance appears below the form; installed apps omit it.
- Verified with the production build and Chromium/WebKit checks for sign-in, account creation, error feedback, autofill attributes, themes, and phone sizes from 320px upward. Screenshots are in ignored `output/playwright/auth/`.
- These sign-in changes are local and have not been deployed.

## List interactions (2026-10-11, revised at the user's request)
- **Ticking:** a tick button on the **right** of each row (no circle on the left).
  - Tapping it ticks the item; it **stays in the list**, struck through, for 24 hours (`TICKED_FOR` in RoomShell), then moves to the collapsed "Earlier this week" section (up to 7 days).
  - Tapping a ticked item's tick asks "Put X back on the list?" before unticking.
- **Press and hold** (450 ms; moving more than 10px or scrolling cancels it) only asks "Delete X?". Right-click does the same on desktop.
- **Select:** a toggle at the right end of the "On the list" row (on Home and each list).
  - It reads "Select", and "Unselect" while active (tapping it again cancels).
  - The bottom bar becomes **Select all · Got it · Move · Delete**. Got it has an Undo; Delete asks first.
  - It uses batched writes (`markDoneMany`, `moveMany`, `deleteMany`).
- **Home sections fold:** tapping a list heading on Home (Grocery/Household/Important) folds the section to its heading only. It looks exactly like the open heading (dot, bold name, count), with "Show all ›" on the right and the first 3 item names, each with its quantity ("Eggs ×1"), then "+N more" as a grey line underneath, with no card, so it still reads as the list heading and not an item. The user rejected both a separate card and a card containing the heading. Tapping it unfolds to the heading plus item cards.; the state is remembered per phone (localStorage `outof.folded`). The tab bar opens the full lists.
- **Sheets and pop-ups freeze the page behind them** (`useScrollLock`: body pinned with position: fixed, scroll restored on close). Sheets can be dragged down from anywhere once their content is at the top.
- **Bottom bar:** `useKeyboard` lifts the dock only while typing and when the gap is keyboard-sized (over 120px); html/body have overscroll-behavior: none. Small visual-viewport shifts while scrolling used to make the tab bar drift.
- **Quick add on Home** only shows while nothing is needed (an empty list); it disappears once anything is added. The list tabs always keep their Quick add, but it folds: open while that list has nothing needed, folded ("QUICK ADD · Show") once it has items. Tapping the heading overrides that until you switch tabs.
- **Pop-ups:** confirmations use `src/components/Alert.tsx`, an iOS-style centred alert in the app's colours. Choosing a list for Move uses `ActionSheet.tsx`.
- **Quantity:** a `qty` field (whole number 1–99, enforced by the rules; absent means 1).
  - Set it with the − n + stepper in the item sheet, or by typing "2 milk", "milk x2", "milk ×2" or "milk (2)" (`parseQty` in `src/lib/parse.ts`).
  - Every row shows its quantity as a plain number on the left (grey for 1, dark for more) ("1" when not set); tapping it opens − n + right in the row, which closes on a tap elsewhere or after 4 s. Re-adding a bought item resets it.
- **Note:** a per-item text box at the top of the sheet (after Quantity) that autosaves. It's shown under the name; up to 500 characters (enforced by the rules).

## Us tab: notes, hearts and extras (2026-10-11, in progress)
- **Plan:** `C:UsersTRA 3 PC0032.claudeplansi-need-ideas-from-warm-zephyr.md`, built in phases:
  1. Us tab + sticky notes + hearts
  2. push notifications (Cloudflare Worker)
  3. countdowns + date jar
  4. meal planner → Grocery
- **Phase 1 is done.** It adds a fifth tab, **Us** (heart icon, brand orange), with:
  - **Hearts row:** "Send a heart" plus 🤗 😘 ☕.
    - Each send creates a doc in `pings`.
    - The receiving phone shows a full-screen emoji shower and a toast once per ping (localStorage `outof.pingSeen.<uid>`).
  - **Sticky-note board:** two CSS columns of pastel notes (peach, mint, sky, lilac, lemon, rose; content palette `--note-*` with ink).
    - Each note has its first line bold, an optional pin (pinned notes sort first) and a checklist you can tick right on the card.
    - Press and hold a note to delete it (with confirmation).
    - Tapping a note opens `NoteSheet`: colour swatches, pin, auto-saving text and checklist.
    - A note left empty is discarded when the sheet closes.
  - **Bottom bar on Us:** "New note…" (`NoteComposer`).
- **Meal planner** (done; built before countdowns at the user's request):
  - A "Meals" section on Us with a Mon–Sun week (‹ This week ›), today highlighted.
  - Tapping a day opens `MealSheet` (meal name plus comma-separated ingredients, autosaved).
  - "Add ingredients to Grocery" works per meal or for the whole week, using `splitEntry`, so "2 tomatoes" becomes Tomatoes ×2 and items already needed are skipped.
  - Data: `meals/{YYYY-MM-DD}` (one per day), with rules and a rules test. `weekDays`, `toISO` and `weekLabel` are in lib/time.ts.
- **Countdowns (done):** a swipeable row of pastel cards on Us (days to go, Today! 🎉, past one-offs faded at the end). They can repeat every year. Tapping one opens `CountdownSheet` (name, date, Once / Every year, emoji, delete). Data: `countdowns/{id}`.
- **Date jar (done):** add ideas; "Pick one" shuffles for about 1.1 s and lands on an idea not yet done (never the same one twice in a row). "Let's do it" marks it done (`doneAt`); "See all ideas" lists them with Put back and remove. Data: `ideas/{id}`.
- **Us tab order:** Hearts, Countdowns, Notes, Meals, Date jar (later: Meals moved to its own tab, see below). There are 19 rules tests.
- **Push notifications (phase 2, done):**
  - **Worker:** `running-low-push` on Cloudflare (the user's account, wrangler 4.149 pinned in `worker/`), at https://running-low-push.madniabdulwahab.workers.dev.
    - `POST /notify {hid, kind: items|notes|hearts, title, body, room}` with the Firebase ID token.
    - It verifies the token with jose (Google securetoken JWKs), reads `households/{hid}/push` through the Firestore REST API using the caller's token (rules apply; non-members get 403), and sends Web Push with `@block65/webcrypto-web-push` to every member except the sender whose pref for that kind is on.
  - **Keys:** VAPID public key in `wrangler.jsonc` and `.env.local`. The private key is a Worker secret, with a local copy in `worker/.dev.vars` (git-ignored). The VAPID subject is the app URL (the user's email is not sent).
  - **App:**
    - `vite-plugin-pwa` now uses `injectManifest` with `src/sw.ts` (precache + navigation fallback as before, plus `push` and `notificationclick` handlers that open the right tab via `?room=` or a postMessage).
    - `src/lib/push.ts` handles enable/disable/refresh/notify. Item adds are grouped per ~6 s burst and flushed when the app is hidden.
    - The opt-in and per-type switches are in Settings → Notifications (`NotificationSettings.tsx`), shown only in the production config and in the installed app on iOS.
    - Subscriptions live at `push/{uid}`: the owner writes, members read.
  - **Tests:** the worker has unit tests (`npm run test:worker`, 7), and the rules tests total 20. The live worker was checked with a throwaway account: real token accepted, non-member 403, bad input 400.
  - **Still to check on real phones:** push delivery can't be simulated end-to-end.
- **Code:** `src/components/us/*`, `src/data/{notes,pings}.ts` and `src/hooks/useCollection.ts` (a generic live query; `toMs` lives there).
- **Types:** see "Shopping and Meals tabs" below (`isList()` was replaced).
- **Rules:** notes (members only, size and colour checks, can't change `createdBy`, `updatedBy` must be you) and pings (sent as yourself, never edited). Both are covered by rules tests (16 total).

## Shopping and Meals tabs; leaving a list (2026-10-11)
- **Request:** the user wanted meals on their own tab, but six tabs is too many, so Grocery and Household were merged. Separately, a member could not leave a list. The two options were leaving or belonging to several lists; leaving was chosen because it is simpler and fits a two-person app.
- **Tabs:** Home · Shopping · Important · Meals · Us.
  - **Shopping** shows the Grocery and Household lists as two foldable sections in their own colours (the fold state is shared with Home). It has a Grocery/Household chip on the add bar (guesses from history, tap to switch) and Quick add with 5 picks per list. Its badge counts both lists.
  - **Meals** is the planner, moved off Us, with no add bar.
  - **Us** is now Hearts, Countdowns, Notes and the Date jar.
  - The data model is unchanged: items still have `list: grocery|household|important`.
- **Types and helpers:** `ListRoom` = 'home' | 'shopping' | 'important'; `RoomId` = ListRoom | 'meals' | 'us'. rooms.ts has `ROOM_LISTS` (lists shown per tab), `isListRoom`, `singleList` (the list for a one-list tab, or null), `roomForList` (list → tab) and `ROOM_LABEL`.
- **Compatibility:**
  - `App.tsx` `asRoom()` maps an old saved tab or notification link (`grocery`/`household`) to `shopping`.
  - The Worker accepts the new and the old room names.
  - QuickAdd ignores a chip choice that doesn't belong to the current tab, because the bar stays mounted across tabs.
- **Leave this list** (Settings, danger row above Sign out, with an Alert):
  - `leaveHousehold` is one batch: `arrayRemove` yourself from `members`, delete your `memberNames` entry and your `push/{uid}`, and delete `users/{uid}`. The app then shows the start-or-join screen.
  - The data stays for the other member, and the code works again since there is room.
  - When the last member leaves, the data is orphaned and nobody can read it.
  - Rule: a member may update only `members` + `memberNames`, removing only themselves. Rules tests: 21.
- **E2E** (WebKit + Chromium, all passing): checks the new tab bar, the Shopping chip and its sections, that Meals is on its own tab, and that B leaves, A sees "Waiting for someone to join", and B rejoins with the same code.
- **Superseded the same day by the next section:** Shopping became Groceries, a single list.

## Groceries as one list, Home cards, hearts on Home (2026-10-11)
- **Feedback:** the user found the Shopping tab messy and wanted it named Groceries, as a single list with no Grocery/Household sections. They found the tab titles too big. Home still showed the old list cards, without Meals and Us. They wanted the hearts moved to Home, with a more prominent view of what was sent and how often, and more emoji.
- **Tabs:** Home · Groceries · Important · Meals · Us. Room ids are `home | grocery | important | meals | us`.
- **One Groceries list:**
  - `ListId` is now `'grocery' | 'important'`, and `LIST_INFO.grocery.label` = 'Groceries'.
  - Old items stored as `'household'` are **read** as grocery in `useItems` (no data migration). They are rewritten as grocery the next time they're re-added or moved. The rules still accept 'household', for older app versions.
  - Grocery starters now include household staples (Toilet paper, Dish soap, Bin bags, Laundry detergent).
  - The Groceries and Important tabs are single-list tabs, so there's no chip on their add bar. Home keeps the Groceries/Important chip. `ROOM_LISTS` and `roomForList` are gone; `singleList(room)` is null only for Home.
  - `asRoom()` in App.tsx maps old 'shopping'/'household' to 'grocery'. The Worker accepts all the old and new room names.
- **Titles:** `.large-title` went from 34px to 28px (line-height 34px).
- **Home cards** (`ListCards.tsx`): a 2×2 grid, one card per tab.
  - Groceries and Important show the needed count and emoji.
  - Meals shows the count of upcoming planned meals and "Tonight: …" or "Next: …".
  - Us shows the number of notes and the next countdown ("✈️ Paris trip · 7 days").
  - Tones: `[data-tone=meals]` uses the old Household blue (tokens renamed `--meals*`); `[data-tone=us]` uses the brand.
- **Hearts card on Home** (`HeartsBar.tsx`, below the cards, hidden while selecting):
  - The latest received one is shown big (58px tile, pop animation) with "Omar sent a rose · 5m ago", and "Today" chips counting each kind received today (❤️ 2 · 🌹 1).
  - Below that is a 6×2 grid of 12 kinds: heart, hug, kiss, miss 🥺, rose 🌹, think 💭, coffee, food 🍕, home 🚗, sleep 😴, cheer 💪, laugh 😂. Heart has the brand fill.
  - "You sent today" chips. The send burst starts from the tapped emoji.
  - Heart notifications open Home.
  - The rules allow the 12 kinds (rules test updated). `KEEP` is now 100 pings.
- **Us tab:** Countdowns, Notes, Date jar.
- **E2E:**
  - New checks: the tab bar, the Groceries title, one list without sections or chip, household things landing in Groceries, the Home cards, hearts not on Us, 12 send buttons, the latest-received display, today's ❤️ 2 tally, and the sent tally.
  - The first post-join sync check now waits 20 s: WebKit against the emulator takes 6–10 s there.

## Colour system (2026-10-11)
- The user felt the colour identity was inconsistent: blue meant both actions and Household, red meant Important, delete and badges, and orange was only the icon and Grocery. They chose the **orange-brand** option, with **pastel** colours where possible.
- **Brand orange** for the app and every action: pastel fill `--brand` #FFB066 with `--brand-ink` for text on it; links and text `--brand-link` (#A84700 light, #FFB870 dark); `--tint` = `--brand-link`.
- **Lists:** Grocery green, Household blue (now the Meals card tone), Important indigo. Each has a pastel fill (`--x`), `--x-ink` for text on the fill and `--x-text` for text on the page. They are never used for actions.
- **Red** (`--danger`) only for delete and overdue dates. Tab badges use their list colour, and member avatars are two brand-orange shades.
- **Rule:** text on a pastel fill always uses the matching ink, never white.
- The app icon keeps the stronger iOS orange (#FF9500).

## Goal
A shared list for two partners (**both on iPhone**) to quickly note that something is finished: groceries, household things, important items.
- Must be **completely free**: no App Store fee, no paid backend, no credit card.
- Must **sync live** between both phones.
- The user is an experienced developer.

## Decisions made
- **App type:** a PWA (installed from Safari with Share → Add to Home Screen).
- **Backend:** the free **Firebase Spark** plan: Firestore (real-time sync and offline cache), Auth, Hosting.
- **Backends considered and rejected:**
  - Supabase: free projects pause after 7 days with no use.
  - Cloudflare: no built-in login or offline sync, and R2 photo storage needs a card.
  - InstantDB / Convex: younger, weaker offline support.
  - PocketBase: you'd run and patch your own server.
- **Sign-in: email and password, not Google.** Google sign-in by popup or redirect is unreliable inside iOS Home Screen apps. Home Screen apps also keep their storage separate from Safari, so email-link sign-in breaks too.
- **Quick-add methods:**
  - One-tap frequent items.
  - Photo of the item.
  - A text box with autocomplete.
  - Voice through the iPhone keyboard's dictation mic, which needs no extra code. The text box splits on commas, newlines and " and ", unless the whole phrase matches an item already in history. A big in-app mic button (`webkitSpeechRecognition`) can be added later.
- **Photos:**
  - Firebase Storage needs the paid Blaze plan, so it isn't used.
  - The photo is compressed in the browser with a canvas (about 640px, JPEG quality 0.6, roughly 40–80 KB) and stored as a base64 data URL in `photos/{id}`.
  - **The photo stays attached to the item** (it reminds you which brand to buy). It is deleted only when you remove it or delete the item.
- **Design can change later.** All styling uses CSS variables (tokens) set per room.

## Design (REPLACED 2026-10-11, see the note below): "Rooms of the house" (elegant, not gimmicky; light by default, full dark mode)
- **Feel:** soft color, subtle low-opacity texture, one signature detail per room, no cartoon drawings.
- **Avoid:** purple gradients, frosted glass, stock component libraries, heavy shadows.
- **Theme:** follows the iPhone light/dark setting, with a manual switch (System / Light / Dark).

| Tab | Light | Dark | Signature detail |
|---|---|---|---|
| **Home = Kitchen**: overview of everything needed, grouped by room | Oat/linen #F4EEE3 with a faint linen texture; terracotta accent #B85C3E | Warm charcoal-brown #1D1916; soft terracotta #D98466 | Glazed ceramic tiles (one per room, in that room's colors, with a count); the combined list below |
| **Grocery = Fridge** | Enamel off-white #EEF2F0 with a vertical sheen; sage accent #5E8C76 | Slate-green #131A18 with a fridge-light glow at the top; accent #8DBBA4 | Frequent items as round pastel **magnets** with a monogram letter in Fraunces italic; the list is a notepad held by a magnet; a "snap" animation on add |
| **Household = Pantry** | Birch #F1E8DA with a faint wood grain; dusty-blue accent #587A99 | Walnut #1B1612; accent #8FAECB | Shelf lines between rows; frequent items as jar labels |
| **Important = Desk** | Paper #F7F5F0; ochre accent #A97A2C | Ink-navy #12151C; accent #D6AC5E | Items as index cards (one red header line and faint blue rules) with an optional due date; frequent items as paper tabs |

**Shared across rooms**
- **Fonts:** **Fraunces** (variable serif, with the SOFT axis) for titles and item names; **Instrument Sans** for interface text. Both self-hosted from `@fontsource-variable` so they work offline.
- **Header:** a small uppercase label (e.g. "Grocery"), a large serif title ("The Fridge"), a count line ("4 things to pick up"), and a settings button showing both partners' dots.
- **Ticking off:** a thin pencil-stroke SVG line draws across the item (about 260 ms), then it moves to "Recently bought" (last 7 days; tap to re-add). An undo toast appears.
- **Who added it:** a colored dot for each partner ("Sara · 2h ago").
- **Tab changes:** the background color and texture crossfade (about 350 ms); room content fades in.
- **Navigation:** a bottom tab bar with custom thin-line icons. The quick-add bar sits just above it: a text field, a camera button, and on Home a room chip (it guesses the room from history and cycles when tapped).
- **Item sheet:** tap an item to open a bottom sheet with its photo (view, add, replace, remove), a room switcher, a due date (Important only), delete, and who added it.
- **Settings sheet:** members, the invite code with a Share button, Appearance, sign out.
- **iPhone details:** inputs at least 16px (stops iOS zooming in), safe-area insets, `viewport-fit=cover`, status-bar style "default", and the `theme-color` meta updated for each room and mode.

## Data model (Firestore)
```
users/{uid}                     { householdId }
households/{CODE}               { name, members: [uid], memberNames: {uid: name}, createdAt }
   (doc id = 8-character invite code from an unambiguous alphabet, shown as XXXX-XXXX)
households/{CODE}/items/{"i_"+encodeURIComponent(key)}
                                { name, key (lowercase, trimmed), list: 'grocery'|'household'|'important',
                                  status: 'needed'|'done', addedBy, addedAt, doneBy, doneAt,
                                  count (increment), lastUsed, photoId?, due? ('YYYY-MM-DD') }
households/{CODE}/photos/{id}   { itemKey, dataUrl, createdAt }
```
- **One doc per item name.** Re-adding an item flips its status back to `needed`, so the doc also holds the history used for autocomplete and the frequent items. There is no separate `frequent` collection.
- **Writes don't wait.** Writes are fired without `await`, because offline writes only resolve once the server confirms them. Errors are caught.
- Reads use `serverTimestamps: 'estimate'`.
- Firestore runs with `persistentLocalCache` and `persistentMultipleTabManager`.

## Security rules (summary)
- `users/{uid}`: only the owner can read or write it.
- `households/{hid}`:
  - **Read:** only members can `get` it.
  - **Create:** only with `members == [self]` and only the allowed keys.
  - **Update:** a member may edit it without changing `members`. A non-member may **join** only while `members.size() < 2`, and the update must be exactly `members.concat([self])` plus their own `memberNames` key.
- **Subcollections:** only members (checked with `get()` on the household).
- **Joining:** the partner types the code inside the installed app (an invite link would open Safari, which has separate storage). It's an update with `arrayUnion` and no read beforehand.

## Planned files (original plan; the current files are listed below)

**Current files (after the redesigns):**
- **Components:** `src/components/`: Header, HouseholdSetup, Icons, ItemRow, ItemSheet, ListCards, PhotoViewer, QuickAdd, QuickPicks, RoomShell, SettingsSheet, Sheet, SignIn, TabBar, Toast
- **Styles:** `src/styles/{tokens,base,components}.css`
- **Helpers:** `src/lib/{emoji,parse,report,theme,time}.ts`; list labels and counts in `src/rooms.ts`; starter suggestions in `src/starters.ts`
- **Tests:** end-to-end checks in `scripts/e2e.mjs`

**Original plan:**
- **Setup:** `index.html`, `vite.config.ts` (vite-plugin-pwa: manifest, auto-update service worker), `.env.example` (`VITE_FIREBASE_*`, plus `VITE_USE_EMULATORS`)
- **Core:** `src/main.tsx`, `src/App.tsx` (sign-in check → household check → main screen), `src/firebase.ts`, `src/types.ts`, `src/rooms.ts`
- **Data:** `src/data/{household,items,photos}.ts`
- **Helpers:** `src/lib/{parse,time,theme}.ts`, `src/hooks/{useAuth,useHousehold,useItems,useTheme,usePhoto}.ts`
- **Styles:** `src/styles/{tokens,base,rooms,components}.css` (tokens keyed by `[data-room]` and `[data-mode]`; textures are inline SVG and gradients)
- **Components:** `src/components/`: `RoomShell`, `TabBar`, `RoomHeader`, `RoomTiles`, `QuickAdd`, `FrequentItems`, `ItemRow`, `ItemSheet`, `SettingsSheet`, `Toast`, `SignIn`, `HouseholdSetup`, `PhotoViewer`
- **Firebase:** `firestore.rules`, `firestore.indexes.json`, `firebase.json` (Hosting rewrites to index.html, emulators for Auth and Firestore)
- **Assets:** `public/icon.svg`, with app icons generated by `@vite-pwa/assets-generator`
- **Tests:** `tests/rules.test.ts` (vitest + `@firebase/rules-unit-testing`)
- **Docs:** `README.md` (Firebase setup and deploy)

## Dependencies (the fontsource font packages were later removed; the app uses the iPhone system font)
- **App:** react, react-dom, firebase, @fontsource-variable/fraunces, @fontsource-variable/instrument-sans
- **Dev:** vite, @vitejs/plugin-react, typescript, @types/react, @types/react-dom, vite-plugin-pwa, @vite-pwa/assets-generator, vitest, @firebase/rules-unit-testing, firebase-tools, and playwright (WebKit with the iPhone profile, for screenshots)

## Verification plan
1. Rules tests against the emulator, using the demo project `demo-outof` (no real Firebase project needed).
2. `npm run build` (TypeScript checks and the Vite build) passes.
3. **Playwright WebKit (iPhone 15 profile) against dev server + emulators:**
   - User A signs up, creates the household, and adds items.
   - User B joins with the code; check live sync in both directions.
   - Go offline, add items, go back online; check they sync.
   - Take screenshots of all 4 rooms in light and dark mode at 390px wide.
4. **User's own steps:**
   - Create a Firebase project (Spark plan) and enable Email/Password sign-in.
   - Put the config in `.env.local`.
   - Run `firebase deploy`.
   - On both iPhones: Add to Home Screen.

## Later (optional, still free)
- **Push notification when your partner adds something:** Web Push works on iOS 16.4+ for Home Screen apps, sent from a free Cloudflare Worker with VAPID keys.
- **Reminders** for Important items with a due date.

## Profile photos (2026-10-11)
- **Request:** a selfie or profile photo, asked for on setup, changeable later from the top-right icon, and shown with the sender's name and emoji when hearts arrive, so it feels more personal.
- **Data:**
  - `households/{hid}/profiles/{uid}` `{ photo: data URL, updatedAt }`. Only the owner writes; members read. Rules require a `data:image/(jpeg|png|webp);base64,` URL under 200 KB, and keys `photo` and `updatedAt` only. Rules tests: 22.
  - A copy is kept on `users/{uid}.photo`, so it survives leaving.
  - `src/data/profiles.ts`:
    - `setMyPhoto` writes or removes both copies.
    - `readMyPhoto` prefills the setup screen.
    - `compressAvatar` centre-crops a square, about 320px JPEG on a white background.
- **Leaving changed:** `leaveHousehold` now deletes your profile doc and only removes `householdId` from `users/{uid}` (the doc is no longer deleted). Create and join write `users/{uid}` with `merge: true`, so the photo isn't wiped.
- **Bug fixed in `useHousehold`:**
  - After leaving, the household listener is refused, but the users doc ack snapshot may never arrive, so `hid` stays the same.
  - Rejoining the same code then never re-subscribed, and the app stayed on the setup screen.
  - Fix: a `refused` ref plus an `attempt` counter that re-subscribes once the users doc confirms a household again.
- **UI:**
  - `Avatar.tsx` (photo or initial; used at the top right and in Settings → Members).
  - `PhotoPicker.tsx` (96px circle with a camera badge, Add a photo / Change photo / Remove; `accept="image/*"`, so iPhone offers Take Photo or the library). It is used on setup, in "About you", optional, and at the top of Settings, above Your name, which moved up.
  - Context has `photos` (uid → data URL) from a live `profiles` query in RoomShell.
- **Hearts:**
  - An incoming one now shows `PingArrival` instead of a toast: a centred card over the shower with a 104px avatar, the emoji badge wiggling, the name and the verb. It closes on tap or after about 3.6 s.
  - The hearts card on Home shows the sender's photo with an emoji badge when they have a photo; otherwise the big emoji as before.
- **E2E:** A adds a photo at setup; B sees it at the top right; the pop-up has Sara's name and photo; the hearts card shows the photo; B adds one in Settings and A sees it; after B leaves the setup screen is prefilled with B's photo; after rejoining, both photos show.
- **Ideas not done yet:** a tiny photo in place of the coloured dot in item rows ("Sara · 2m ago"). Web Push can't carry the photo (payload too small, and iOS uses the app icon).
- **Mirrored selfies (follow-up):** iPhone saves front-camera photos un-mirrored, so they looked flipped next to the preview (the user called it "reverted").
  - `isFreshSelfie(file)`: the EXIF LensModel (read by `src/lib/exif.ts`) contains "front" and the file is under 2 minutes old. Such photos are mirrored in `compressAvatar(file, { mirror })`.
  - Library selfies are left alone, since that's how they look in Photos.
  - PhotoPicker has a **Flip** button (`flipPhoto`) for anything else.
  - Tests: `tests/exif.test.ts` (2), and an e2e check with a synthetic red|blue JPEG tagged as a front-camera shot.
  - If iOS strips the EXIF, auto-mirroring silently doesn't happen; Flip covers that.
- **Remove photo asks first:** PhotoPicker's Remove opens an `Alert` ("Remove your photo?", Cancel / Remove in red), on setup and in Settings. The e2e checks that it asks, that Cancel keeps the photo, and that confirming removes it.

## Hearts strip + Hearts sheet (2026-10-11)
- **Feedback:** the hearts card had become one big block: the latest, an 11-chip tally on 3 lines, a 6×2 grid and "You sent today". The user wanted it nicer and chose a **slim strip with a swipeable send row** (from three options).
- **Home (`HeartsBar.tsx`):**
  - The top row is a button: the sender's photo with an emoji badge (44px), **first name** + verb, and "2m ago · 46 today". Tapping opens the sheet.
  - Below it, `SendPings layout="row"`: all 12 in one horizontal scroll-snap row (46px). The right edge fades until you reach the end (`data-end`, set on scroll).
- **Sheet (`HeartsSheet.tsx`):**
  - A Today | This week segmented control.
  - Two score cards: "3 from Sara" in brand-link, and "0 from you".
  - A breakdown row per emoji used, with two thin bars (theirs: brand; yours: grey), counts stacked, sorted by total.
  - "Send something" (`SendPings layout="grid"`, 6×2).
  - "Latest": the last 15 pings ("Sara sent a rose 🌹 · 2m", "You sent 😴 Sleepy").
- **Counting moved to `pingDays/{YYYY-MM-DD}` = `{ [uid]: { kind: n } }`:**
  - `sendPing` also does `setDoc(merge)` with `increment(1)`. Pings are pruned to the newest 100, which this couple outgrows in about a day, so counts can't come from them.
  - RoomShell listens to the last 7 days (`pingDaysSince`, `documentId() >= weekAgo`). Helpers: `countsFor`, `totalOf`.
  - Rules: member read; create/update only touches your own uid key (plus a date-id check); never deleted.
  - Counts started from zero at rollout; older pings weren't backfilled.
- **Tests:**
  - 25 unit tests (rules + EXIF), including the new pingDays test.
  - E2E: 12 buttons in one row that runs off the edge; "3 today" on the strip; the sheet shows 3,0 and the ❤️ 2·0 / 🌹 1·0 breakdown, with the rose first in Latest; This week ≥ today; sending from the grid reaches A and updates the score live (3,1); the 12th button (swiped into view) sends.

## Our meals: saved meals as templates (2026-10-12)
- **Request:** a list of meals, noted like grocery items, that can be used as templates in the week planner.
- **Data:** `households/{hid}/recipes/{id}` = `{ name 1–80, ingredients ≤20, uses int, createdBy, createdAt }`, in `src/data/recipes.ts` (`createRecipe`, `updateRecipe`, `usedRecipe` (`increment`), `deleteRecipe`, `findRecipe` (case-insensitive), sorted by `byUse`: most planned first, then A–Z). Rules: members read, write and delete; name and size checks; `uses` must be an int.
- **Meals tab:**
  - The week planner, then **Our meals** (`SavedMeals.tsx`): rows with an emoji tile, the name and ingredients ("Tap to add ingredients" if none). It has an empty-state card.
  - The dock now has an add bar on Meals (`MealComposer.tsx`, "Save a meal…"). "Name: a, b, c" saves the ingredients too, and duplicates are caught with a toast.
- **Saved meal sheet** (`RecipeSheet.tsx`):
  - Edit the name and ingredients (saved on blur and close; never with an empty name).
  - **Plan it for**: 7 day chips starting Today (weekday short names; a brand dot marks days that already have a meal). Planning over a different meal asks first ("Replace X?").
  - Add ingredients to Groceries, and Delete meal (asks first).
- **Day sheet** (`MealSheet.tsx`): a "From our meals" chip row at the top fills the name and ingredients, saves, and counts a use; the chip of the matching saved meal is highlighted. "Save to Our meals" shows when the day's meal name isn't saved yet.
- **Tests:**
  - Rules tests: 26.
  - E2E: saving from the bar with ingredients, sync to B, duplicate caught, the chip fills today's sheet, no "Save to Our meals" for an already-saved meal, planning from the saved meal's sheet, the planned-day dot, Replace asks and Cancel keeps it, ingredients edited on B show on A, and Delete asks and syncs.
- **E2E timing:** sync waits are now 15 s in WebKit and 8 s in Chromium (`WAIT` in `scripts/e2e.mjs`). With more live collections, WebKit on Windows takes 6–10 s for the first sync after a join against the emulator. "B sees A's photo at the top right" still missed once right after an emulator cold start, then passed.

## Meal photos; open on Home after a full close (2026-10-12)
- **Feedback:** saved meals had no photo option, unlike Groceries, so the design wasn't consistent. The app also reopened on the last tab even after being fully closed; it should open on Home.
- **Meal photos (same as grocery items):**
  - The Meals bar (`MealComposer`) has the camera button and the pending-photo preview from QuickAdd (`compressImage`); the placeholder becomes "Name this meal". The camera is labelled "Add a meal photo".
  - `recipes/{id}.photoId` points at the shared `photos/` collection (`newPhotoDoc`).
  - The saved meal's sheet has a Photo section like ItemSheet: photo-frame, tap for `PhotoViewer`, Replace photo, Remove photo.
  - `MealThumb` shows the photo (32px) or the emoji tile, in Our meals rows and on planned days.
  - Planning from a saved meal copies its `photoId` onto `meals/{day}` (from both the meal's sheet and the "From our meals" chips), so the week shows the photo too.
  - Old photos are deleted when replaced, removed or when the meal is deleted, unless a planned day still uses them.
  - Rules: `photoId` must be a string (null allowed for recipes) on recipes and meals.
- **Tab memory:**
  - `App.tsx` keeps the tab in **sessionStorage** (the `outof.room` key). It survives switching apps and reloads, but a fresh start after a full close opens Home.
  - The old localStorage key is removed on start. Notification `?room=` links still win.
- **E2E:** the Meals bar takes a photo; B sees the thumb; the meal's sheet shows it; planning it (Replace) puts the photo on today's row. At the very end, a reload keeps the tab, the app still syncs after the reload, and a fresh page opens on Home.
- **WebKit test quirk:** a reload leaves the old page's long-poll channels hanging for a while. Both simulated phones share one WebKit browser and its per-host connection limit, so later syncs stalled for both. That's why the reload checks run last. The cancelled-channel console message ("…channel?… due to access control checks") is filtered out.

