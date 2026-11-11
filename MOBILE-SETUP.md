# UniAble Mobile Setup (Android and iOS)

This version keeps the existing React/Vite interface and backend, and adds Capacitor so the same frontend can be packaged as an Android and iOS application.

## 1. Install prerequisites

- Node.js 20 or later
- Android Studio for Android builds
- Xcode on a Mac for iOS builds
- A physical iPhone/iPad is recommended for testing iOS speech recognition

## 2. Install frontend dependencies

From `frontend`:

```bash
npm install
```

## 3. Native projects

The Android and iOS native projects are already included. Do not run `cap add` again. To build and copy the React application into both native projects:

```bash
npm run mobile:sync
```

Only run `npx cap add android` or `npx cap add ios` if you intentionally recreate a missing native project.

## 4. Configure voice permissions

### iOS

Open `ios/App/App/Info.plist` and ensure these entries exist:

```xml
<key>NSMicrophoneUsageDescription</key>
<string>UniAble uses the microphone for voice commands and accessibility features.</string>
<key>NSSpeechRecognitionUsageDescription</key>
<string>UniAble uses speech recognition to understand voice commands.</string>
```

### Android

The speech-recognition plugin normally contributes the required microphone permission. After syncing, verify that `android/app/src/main/AndroidManifest.xml` contains:

```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
```

## 5. Configure the backend URL

A physical phone cannot use `localhost:4000` to reach your computer's backend. Set the API URLs in `frontend/.env` before building. `VITE_API_URL` includes `/api`; `VITE_API_BASE_URL` is the same server root without `/api` and is used by account verification.

### iOS Simulator

```env
VITE_API_URL=http://localhost:4000/api
VITE_API_BASE_URL=http://localhost:4000
```

### Physical iPhone/iPad

```env
VITE_API_URL=https://your-api-domain.example/api
VITE_API_BASE_URL=https://your-api-domain.example
```

Use a reachable HTTPS backend for iOS devices; an iPhone cannot use your Mac's `localhost`. For Android devices on the same Wi-Fi, a computer LAN address can be used if the backend/network allows HTTP traffic.

### Android emulator

```env
VITE_API_URL=http://10.0.2.2:4000/api
```

### Production

Use your deployed HTTPS API:

```env
VITE_API_URL=https://your-api-domain.example/api
```

## 6. Run Android

Start the backend first:

```bash
cd ../backend
npm install
npm run dev
```

In another terminal:

```bash
cd frontend
npm run android
```

Android Studio will open. Select an emulator or connected Android device and run the app.

## 7. Run iOS

See [frontend/IOS_SETUP.md](frontend/IOS_SETUP.md) for Xcode signing, simulator, and iPhone instructions. On a Mac, run:

```bash
cd frontend
npm run ios
```

Xcode opens the `App` workspace. Select a simulator or connected iPhone and run the app.

## Notes

- The Node.js backend and Python AI service remain shared by web, Android, and iOS.
- Voice recognition now uses the Capacitor native speech-recognition plugin on native Android/iOS apps and the Web Speech API in a normal browser.
- Every time frontend code changes, run `npm run mobile:sync` before testing native projects.
- Bluetooth, push notifications, background wake-word detection, and emergency calling may require additional native plugins and platform-specific testing.


## UniPal spoken responses (text-to-speech)

UniPal can read its answers aloud, in the language chosen in **Settings > Language & Region**.
The toggle is **Settings > Language & Region > Spoken responses** (on by default).

### One-time Android setup
1. In `frontend/`, install the native speech plugin (pick the release that matches your Capacitor major version, npm will warn if it does not):
   `npm install @capacitor-community/text-to-speech`
2. Rebuild and sync: `npm run android` (this runs the build, `cap sync android`, and opens Android Studio).
3. The manifest already declares the Android 11+ `<queries>` entry for `android.intent.action.TTS_SERVICE`.

Without the plugin the app still works: it falls back to the WebView's built-in speech engine.

### Voices and languages
- A language is only spoken if the device has a voice for it. English, Afrikaans and isiZulu are the most likely to be available; the other official languages often are not on stock Android.
- To add voices on a device: Android Settings > System > Languages > Text-to-speech output > Google Speech Services > Install voice data.
- When no voice exists, UniPal shows the answer as text and explains why. It never reads, for example, isiXhosa text with an English voice.

### Backend compatibility
- AI service (FastAPI) `0.3.0` and the Node route must both be updated. The AI service answers in the selected language and returns `replyLanguage` / `replyLocale`, which the app uses to pick the matching voice.
- `GET /api/unipal/capabilities` reports whether the backend supports this. If it does not, UniPal shows a notice in non-English languages instead of failing silently.
- Local/demo replies (no `OPENAI_API_KEY`, or the AI service is offline) are English and are spoken with an English voice.
