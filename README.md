# Running Low

A shared "we're running low" list for two people. It's an installable PWA for iPhone that syncs live between both phones and works offline. It runs entirely on Firebase's free **Spark** plan, so no card is needed.

There are four rooms: **Kitchen** (an overview of everything), **Fridge** (groceries), **Pantry** (household) and **Desk** (important things, with due dates).

## One-time Firebase setup (~10 minutes)

1. Go to [console.firebase.google.com](https://console.firebase.google.com), choose **Create a project**, and skip Analytics. New projects start on the free Spark plan.
2. **Build → Authentication → Get started → Email/Password → Enable.**
3. **Build → Firestore Database → Create database.** Choose *production mode* and the region closest to you.
4. **Project settings → Your apps → Web (`</>`).** Register an app (no Hosting checkbox needed), then copy `apiKey`, `authDomain`, `projectId` and `appId` into a new `.env.local`, using [.env.example](.env.example) as the template.
5. Link the CLI to your project:
   ```sh
   npx firebase login
   npx firebase use --add      # pick the project, alias "default"
   ```
6. Deploy the app, security rules and indexes:
   ```sh
   npm run deploy
   ```
   The app is then live at `https://<project-id>.web.app`.

## Installing on both iPhones

1. Open the `.web.app` URL in **Safari**, tap **Share → Add to Home Screen**, then open the app **from the Home Screen**. The installed app keeps its login separate from Safari, so sign in inside it.
2. **Phone 1:** create an account, choose **Start our list**, then go to Settings (the two dots, top right) → **Share** the invite code.
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
| `npm run e2e` | Two simulated iPhones: sign-up, joining, live sync, offline, photos; screenshots go to `screenshots/`. Needs the two commands above running. `BROWSER=chromium` gives accurate screenshots, because Windows WebKit ignores variable font weights. |
| `npm run build` | Type-check and production build |
| `npm run icons` | Regenerates app icons from `public/icon.svg` |

## How it works

- **Data:** `households/{CODE}`, with `items` and `photos` subcollections. There is one item doc per name: adding something you've had before flips it back to *needed* and bumps its count, and those counts drive the magnets, jars and tabs.
- **Offline:** the Firestore persistent cache. Writes are never awaited, so they apply instantly and sync later.
- **Photos:** compressed in the browser to roughly 640px JPEG (about 40–80 KB) and stored as data URLs in Firestore, because Firebase Storage needs the paid plan.
- **Security:** [firestore.rules](firestore.rules). Only members can read or write. Joining is allowed only with the code and only while there is room for a second person. Each member can rename only themselves.
- **Free-tier headroom:** 50k reads and 20k writes a day, 1 GB of Firestore storage, and 10 GB a month of Hosting transfer. Two people won't come close.
- **Design:** every colour is a CSS token per room and mode in [src/styles/tokens.css](src/styles/tokens.css). The room details (tiles, magnets, jars, cards) are in [src/styles/rooms.css](src/styles/rooms.css).
