# UniAble — Authentication Module

This is the front door of UniAble: the welcome screen and the login screen
(voice + email), built as the first working slice of the platform described
in the project proposal (Sprint 3 — Authentication module).

## Run it

```bash
npm install
npm run dev
```

Open the printed local URL. No Firebase project is required to try it —
see **Demo mode** below.

## What's here

```
src/
  pages/
    WelcomeScreen.jsx        "Create your UniAble account" / "Log in"
    LoginScreen.jsx          Voice tab + email tab, tied together
    login/
      VoiceLoginPanel.jsx    Real mic capture, mock voiceprint match
      EmailLoginForm.jsx     Validated email/password form
    SignUpPlaceholder.jsx    Stub — the 5-step voice sign-up is a later step
    DashboardPlaceholder.jsx Stub — confirms a successful login
  components/
    AuthShell.jsx            Shared gradient stage + card used by both screens
    ListeningRing.jsx        The animated voice-state indicator (signature element)
    AccessibilityQuickBar.jsx High-contrast + text-size controls, live on every auth screen
  hooks/
    useAccessibilityProfile.jsx  Contrast/text-scale state, persisted locally
    useSpeechRecognition.js      Browser SpeechRecognition wrapper
  services/
    firebase.js               Firebase Authentication, with a mock fallback
    voiceprint.js              Stand-in for the backend voiceprint model
  styles/
    tokens.css                 Colour, type, spacing, motion tokens
```

## Demo mode (no Firebase project yet)

`services/firebase.js` checks for Firebase credentials in `.env`. If none
are found, it falls back to an in-memory mock so every screen still works
end to end:

- **Email login:** `student@univen.ac.za` / `Passw0rd!`
- **Voice login:** tap the mic and say *"Hey UniAble, log me in"* — your
  browser's own speech recognition transcribes it, and a mock matcher
  scores it against the enrolled phrase.

To connect a real project, copy `.env.example` to `.env` and fill in your
Firebase web config. `signIn`/`signUp` will then call Firebase
Authentication directly — nothing else in the UI needs to change.

## Why voiceprint matching is mocked

Speaker *verification* (confirming **who** is speaking, not just
transcribing **what** was said) requires a backend biometric model — the
proposal specifies this under the AI stack (TensorFlow / a
speaker-recognition service). That can't run in the browser. `services/
voiceprint.js` is written so a real endpoint can be dropped in later
without touching `VoiceLoginPanel.jsx` — it already expects a
`{ matched, confidence }` response.

## Accessibility decisions made here

- Full keyboard operability and visible focus rings (`:focus-visible`) on
  every control, including the tabs and the mic button.
- `role="status"` / `aria-live="polite"` on voice-state text so screen
  reader users get the same feedback sighted users get from the animated
  ring — no information is conveyed by animation alone.
- The high-contrast and text-size controls are reachable from the first
  screen a student sees, not buried in settings.
- `prefers-reduced-motion` is respected — the listening-ring pulse and
  the "thinking" shimmer are disabled automatically.
- Form errors are associated with their fields via `aria-describedby` and
  announced with `role="alert"` for the top-level submit error.
- All interactive targets are sized for touch (44px+) and colour is never
  the only signal (success/error states pair colour with an icon and text).

## Next steps

- Wire the voice-guided sign-up flow (`SignUpPlaceholder.jsx` → real
  5-step flow).
- Replace `services/voiceprint.js` with a real speaker-verification
  endpoint once the backend exists.
- Replace `DashboardPlaceholder.jsx` with the real Home Dashboard.
