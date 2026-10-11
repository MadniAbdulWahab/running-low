# Running Low

A shared "we're running low" list for two people. It's an installable PWA for iPhone that syncs live between both phones and works offline. It runs entirely on Firebase's free **Spark** plan, so no card is needed.

It looks and feels like a native iOS app. There are two lists, **Groceries** (food and household things) and **Important** (with due dates). The tab bar is **Home** · **Groceries** · **Important** · **Meals** (the week's plan) · **Us**.

**Live:** https://running-low.web.app (Firebase project `running-low`).

## One-time Firebase setup (~10 minutes)

1. Go to [console.firebase.google.com](https://console.firebase.google.com), choose **Create a project**, and skip Analytics. New projects start on the free Spark plan.
2. **Build → Authentication → Get started → Email/Password → Enable.**
3. **Build → Firestore Database → Create database.** Choose *production mode* and the region closest to you.
4. **Project settings → Your apps → Web (`</>`).** Register an app (no Hosting checkbox needed), then copy `apiKey`, `authDomain`, `projectId` and `appId` into a new `.env.local`, using [.env.example](.env.example) as the template.
5. Log the CLI in. This repo's `.firebaserc` already points at the `running-low` project; for a different project, run `npx firebase use --add` too.
   ```sh
   npx firebase login
   ```
6. Deploy the app, security rules and indexes:
   ```sh
   npm run deploy
   ```
   The app is then live at `https://<project-id>.web.app`.

## Updating the live app

After changing the code, deploy again from a computer that has `.env.local`:

```sh
npm run deploy                         # app + security rules
npx firebase deploy --only hosting     # app only, when the rules didn't change
```

Both phones pick up the new version the next time the app is opened. If one still shows the old version, swipe it away in the app switcher and open it again.

## Notifications (free Cloudflare Worker)

Push notifications (things added, new notes, hearts) are sent by a tiny Cloudflare Worker in [worker/](worker/). The free plan is plenty.

- **Deployed at:** `https://running-low-push.madniabdulwahab.workers.dev`. The app finds it through `VITE_PUSH_URL` and `VITE_VAPID_PUBLIC_KEY` in `.env.local`.
- **Who can send:** the Worker checks the sender's Firebase sign-in, then reads the list's subscriptions *as that person* through the Firestore REST API. So the normal security rules decide who can send to whom, and there's no service account.
- **Keys:** the VAPID public key is in `worker/wrangler.jsonc` and `.env.local`. The private key is a Worker secret, and a local copy is in `worker/.dev.vars` (git-ignored, keep it safe).
- **Redeploying after changes:** `npm --prefix worker install` once, then `npm run deploy:worker`. To replace the private key: `npm --prefix worker exec wrangler secret put VAPID_PRIVATE_KEY`. If you generate new keys, both phones must turn notifications off and on again.
- **Tests:** `npm run test:worker`.
- **On the iPhone:** open the app from the Home Screen → Settings → Notifications → **Turn on notifications** (iOS 16.4 or later).

## Installing on both iPhones

1. Open the `.web.app` URL in **Safari**, tap **Share → Add to Home Screen**, then open the app **from the Home Screen**. The installed app keeps its login separate from Safari, so sign in inside it.
2. **Phone 1:** create an account, choose **Start our list**, then go to Settings (the initials at the top right) → **Share** the invite code.
3. **Phone 2:** install the same way, create an account, choose **Join with a code** and enter the code. A list holds at most two people.

## Development

```sh
npm install
npm run emulators   # Auth + Firestore emulators (needs Java 11+)
npm run dev:emu     # Vite against the emulators; no Firebase project needed
```

`npm run dev:emu` also prints a Network URL, so you can open the app on a phone on the same Wi-Fi.

| Command | What it does |
|---|---|
| `npm run test:rules` | Security-rules tests (Vitest + emulator) |
| `npm run e2e` | Two simulated iPhones: sign-up, joining, live sync, offline, photos; screenshots go to `screenshots/` (or a folder you pass). Needs the two commands above running. Runs in WebKit by default; `BROWSER=chromium` also checks the due date, because WebKit on Windows has no date picker. |
| `npm run build` | Type-check and production build |
| `npm run icons` | Regenerates app icons from `public/icon.svg` |

## How it works

- **Data:** `households/{CODE}`, with `items` and `photos` subcollections. There is one item doc per name: adding something you've had before flips it back to *needed* and bumps its count, and those counts drive the Quick add suggestions.
- **Home:** a card for each tab (what's needed, tonight's meal, the next countdown), the hearts card, and both lists in foldable sections.
- **Profile photos:** add one on setup (optional), or later from Settings (tap the faces at the top right). A selfie just taken with the front camera is mirrored to match the camera preview, and **Flip** turns any photo around. Removing a photo asks first. It shows in place of your initial, and with every heart you send: when one arrives, a card pops up with the sender's photo, name and emoji.
- **Hearts (on Home):** twelve little things to send (❤️ 🤗 😘 🥺 🌹 💭 ☕ 🍕 🚗 😴 💪 😂). The last one you received shows big, with today's count of each, plus what you sent today.
- **Meals tab:** plan the week's meals and send their ingredients to Grocery in one tap.
- **Us tab:** count down to things you are looking forward to, keep shared sticky notes with checklists, and let the date jar pick what to do together.
- **Leaving a list:** Settings → **Leave this list** takes you off it, so you can start a new one or join someone else's. Everything stays for whoever is still on it, and their invite code works again.
- **Using it:** tap the tick on the right to mark something as got (it stays in the list, struck through, for a day; tapping it again asks before putting it back). Tap an item for its quantity, note, photo and due date. Press and hold to delete. Tap **Select** next to "On the list" to act on several items at once. Typing "2 milk" or "milk x2" sets a quantity.
- **Offline:** the Firestore persistent cache. Writes are never awaited, so they apply instantly and sync later.
- **Photos:** profile photos are cropped square to about 320px JPEG (15–40 KB). Item photos are compressed in the browser to roughly 640px JPEG (about 40–80 KB) and stored as data URLs in Firestore, because Firebase Storage needs the paid plan.
- **Security:** [firestore.rules](firestore.rules). Only members can read or write. Joining is allowed only with the code and only while there is room for a second person. Each member can rename only themselves, and can remove only themselves.
- **Free-tier headroom:** 50k reads and 20k writes a day, 1 GB of Firestore storage, and 10 GB a month of Hosting transfer. Two people won't come close.
- **Design:** native iOS style with the system font, a plain grouped background, restrained category colours, and true-black dark mode. Rounded cards, consistent spacing, and larger touch targets keep the lists easy to scan. Navigation and the bottom input stay within the same 600px column on larger screens. All colours are CSS tokens in [src/styles/tokens.css](src/styles/tokens.css), and each has one job: soft brand orange for the app and every action, pastel green / indigo for Groceries / Important (and blue for Meals on the Home cards), and red only for delete and overdue.
