# Trace — workout tracker (Expo / React Native)

Read the exact versioned Expo docs at https://docs.expo.dev/versions/v57.0.0/ before writing code — Expo SDK 57, React Native 0.86, Reanimated 4.

- `npx expo start` to run; `npx tsc --noEmit` to typecheck.
- No navigation library: tabs + overlays live in `App.tsx`.
- Design rules: hairline borders, no gradients, one accent color, serif only for headings/wordmark, respect reduced motion (`useTheme().reduceMotion`).
- The line parser (`src/lib/parser.ts`) must never invent data — ambiguous numbers stay null. Run its behavior through real examples before changing it.
