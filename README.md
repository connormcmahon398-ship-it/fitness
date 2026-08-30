# Trace

A quiet, premium workout tracker. Logging a workout feels like typing into
the Notes app: open it, type `bench press 185 3 sets of 6`, press Enter, and
a small mark confirms the line was understood. Complete the workout and Trace
tells you what mattered — a new best, +5 lb on last session, total working
sets — then charts your progression over time.

## Running the app

```bash
npm install
npx expo start
```

Then press **i** for the iOS simulator, **a** for Android, or scan the QR code
with the **Expo Go** app on your phone (recommended — the app is designed
mobile-first and uses haptics).

## What's inside

- **Logger** — a notes-style editor. Each line is parsed in the background
  (`bench 185 3x6`, `bench press — 185 — 3x6`, `pull ups 3x10`, and
  `deadlift 315 for 5` all work). Ambiguous lines are never guessed at.
- **Feedback** — after completing a workout: personal records, deltas from
  your previous session, and set totals. Nothing more.
- **Growth** — per-exercise weight and rep progression on thin, scrubbable
  charts, plus 12-week consistency, per-session volume, and recent
  improvements.
- **Onboarding** — one question at a time, spring transitions, wheel pickers,
  no account or email. Ends by morphing into the logger.
- **Settings** — light/dark/system appearance, lb/kg and ft-in/cm units,
  profile edits, JSON export, full reset.

## Architecture

```
src/
  theme.ts            palettes (designed light + dark), type scale, motion constants
  lib/
    parser.ts         natural-language line parser
    stats.ts          PRs, session deltas, volume, consistency
    store.tsx         reducer + AsyncStorage persistence
    theme-context.tsx theme resolution + reduced-motion
  components/         PressableScale, RecognitionMark, LineChart, WheelPicker, …
  screens/            Onboarding, Home, Logger, Summary, Growth, Settings, WorkoutDetail
```

No navigation library — three tabs and animated overlays are managed in
`App.tsx` with Reanimated transitions. All data stays on device.
Reduced-motion settings are respected throughout.
