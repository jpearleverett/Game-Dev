# Dead Letters — Cloud Agent Guide

Supplements `CLAUDE.md` with environment-specific notes for Cursor Cloud Agents.

## Quick verification (no device required)

| Command | Purpose |
|---------|---------|
| `npm install` | Install dependencies (`postinstall` runs `patch-package`) |
| `npm test` | Run all 137 Jest tests (21 suites) — primary CI verification |
| `node -e 'require("@babel/core").transformFileSync("src/screens/DeskScreen.js")'` | Babel parse-check after editing RN files |

There is **no ESLint/Prettier** configured in this repo.

## Environment variables

Copy `.env.example` → `.env`. For story generation in dev, set:

```
GEMINI_PROXY_URL=https://game-dev-tan.vercel.app/api/gemini
```

The shared dev proxy is documented in `CLAUDE.md`. Do **not** commit `.env`.

## Running the app in this VM

**Native mobile UI (Expo Go / emulator) cannot run in the cloud VM.** Use these alternatives:

### Expo web (browser preview)

```bash
# Web bundling requires the Lottie web peer (not in package.json by default):
npm install @lottiefiles/dotlottie-react

npx expo start --web --port 8081
```

Open `http://localhost:8081`. Use **tmux** for long-running dev servers.

**Hello-world path:** Splash → tap to enter → Prologue → "BEGIN INVESTIGATION" → skip tutorial → **Desk** screen (shows Case 001-A "The Visitor").

### Metro without web

`npx expo start` starts Metro and prints a QR code for physical devices — useful to confirm the bundler starts, but not testable headlessly here.

## Services overview

| Service | Required for | Notes |
|---------|--------------|-------|
| Node 18+ / npm | Everything | VM ships Node 22 |
| `npm install` (root) | Tests + Expo | `package-lock.json` → npm |
| `.env` with `GEMINI_PROXY_URL` | LLM story generation | Static chapter 001A works without |
| Gemini proxy (Vercel) | Generated chapters | `proxy/` subproject; deploy separately |
| `@lottiefiles/dotlottie-react` | **Web target only** | Peer of `lottie-react-native`; install ad hoc |

## Proxy subproject

`proxy/` has its own `package.json` for the Vercel Edge function. Root app dev does **not** require `npm install` in `proxy/` unless you are deploying or hacking the proxy handler.

## Gotchas

- After content/prompt changes, players need `npx expo start -c` (cache clear) on device; same applies for web during generation work.
- `CLAUDE.md` states this environment cannot run live Gemini generation reliably in tests; Jest mocks the LLM layer.
- RevenueCat IAP is auto-mocked in `__DEV__`; no external service needed.
