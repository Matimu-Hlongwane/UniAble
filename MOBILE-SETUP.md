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

## 3. Create the native projects

Run these commands once:

```bash
npx cap add android
npx cap add ios
```

Then build and copy the React application into both native projects:

```bash
npm run mobile:sync
```

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

A phone cannot use `localhost:4000` to reach your computer's backend. In `frontend/.env`, set one of the following before building:

### Physical phone on the same Wi-Fi

```env
VITE_API_URL=http://YOUR_COMPUTER_LAN_IP:4000/api
```

For example:

```env
VITE_API_URL=http://192.168.1.100:4000/api
```

### Android emulator

```env
VITE_API_URL=http://10.0.2.2:4000/api
```

### Production

Use a deployed HTTPS API:

```env
VITE_API_URL=https://your-api-domain.example/api
```

For a production iOS release, HTTPS is strongly recommended.

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

On a Mac:

```bash
cd frontend
npm run ios
```

Xcode will open. Select a simulator or connected iPhone and run the app.

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
