# Running Low: project context (handoff)

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
- **Home sections fold:** tapping a list heading on Home (Grocery/Household/Important) folds the section to its heading only. It looks exactly like the open heading (dot, bold name, count), with "Show all ›" on the right and the first 3 item names (with ×qty, then "+N more") as a grey line underneath, with no card, so it still reads as the list heading and not an item. The user rejected both a separate card and a card containing the heading. Tapping it unfolds to the heading plus item cards.; the state is remembered per phone (localStorage `outof.folded`). The tab bar opens the full lists.
- **Sheets and pop-ups freeze the page behind them** (`useScrollLock`: body pinned with position: fixed, scroll restored on close). Sheets can be dragged down from anywhere once their content is at the top.
- **Bottom bar:** `useKeyboard` lifts the dock only while typing and when the gap is keyboard-sized (over 120px); html/body have overscroll-behavior: none. Small visual-viewport shifts while scrolling used to make the tab bar drift.
- **Pop-ups:** confirmations use `src/components/Alert.tsx`, an iOS-style centred alert in the app's colours. Choosing a list for Move uses `ActionSheet.tsx`.
- **Quantity:** a `qty` field (whole number 1–99, enforced by the rules; absent means 1).
  - Set it with the − n + stepper in the item sheet, or by typing "2 milk", "milk x2", "milk ×2" or "milk (2)" (`parseQty` in `src/lib/parse.ts`).
  - Every row shows its quantity as a plain number on the left (grey for 1, dark for more) ("1" when not set); tapping it opens − n + right in the row, which closes on a tap elsewhere or after 4 s. Re-adding a bought item resets it.
- **Note:** a per-item text box at the top of the sheet (after Quantity) that autosaves. It's shown under the name; up to 500 characters (enforced by the rules).

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
