# Running Low

A shared "we're running low" list for two people. It's an installable PWA for iPhone that syncs live between both phones and works offline. It runs entirely on Firebase's free **Spark** plan, so no card is needed.

It looks and feels like a native iOS app. There are three lists, **Grocery**, **Household** and **Important** (with due dates), plus a home screen showing everything at once.

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
- **Us tab:** send a heart (or a hug, kiss, coffee), count down to things you are looking forward to, keep shared sticky notes with checklists, plan the week's meals (and send their ingredients to Grocery in one tap), and let the date jar pick what to do together.
- **Using it:** tap the tick on the right to mark something as got (it stays in the list, struck through, for a day; tapping it again asks before putting it back). Tap an item for its quantity, note, photo and due date. Press and hold to delete. Tap **Select** next to "On the list" to act on several items at once. Typing "2 milk" or "milk x2" sets a quantity.
- **Offline:** the Firestore persistent cache. Writes are never awaited, so they apply instantly and sync later.
- **Photos:** compressed in the browser to roughly 640px JPEG (about 40–80 KB) and stored as data URLs in Firestore, because Firebase Storage needs the paid plan.
- **Security:** [firestore.rules](firestore.rules). Only members can read or write. Joining is allowed only with the code and only while there is room for a second person. Each member can rename only themselves.
- **Free-tier headroom:** 50k reads and 20k writes a day, 1 GB of Firestore storage, and 10 GB a month of Hosting transfer. Two people won't come close.
- **Design:** native iOS style with the system font, a plain grouped background, restrained category colours, and true-black dark mode. Rounded cards, consistent spacing, and larger touch targets keep the lists easy to scan. Navigation and the bottom input stay within the same 600px column on larger screens. All colours are CSS tokens in [src/styles/tokens.css](src/styles/tokens.css), and each has one job: soft brand orange for the app and every action, pastel green / blue / indigo only for Grocery / Household / Important, and red only for delete and overdue.
