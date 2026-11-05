# Build and test on iOS

UniAble's iOS app uses the shared React interface inside a Capacitor native shell. The Xcode project and speech-recognition plugin are already included.

## Requirements

- macOS with Xcode installed
- Node.js 20 or later
- An iOS Simulator runtime installed in Xcode, or an iPhone/iPad connected by USB
- CocoaPods (installed automatically by Capacitor sync when available)

## Configure the app

From `frontend`, install dependencies if needed:

```bash
npm install
```

Create `frontend/.env` from `.env.example` and add the Firebase web configuration used by your project. The file is local and should not be committed.

For the iOS Simulator, the default API address (`http://localhost:4000`) works when the backend is running on the same Mac. For a physical device, set both API URLs to your backend's reachable HTTPS address (the second URL has no `/api` suffix):

```env
VITE_API_URL=https://your-api-domain.example/api
VITE_API_BASE_URL=https://your-api-domain.example
```

An iPhone cannot use `localhost` to reach your Mac. Start the backend and AI service as needed for the features you want to test.

## Open and run in Xcode

Run this from `frontend`:

```bash
npm run ios
```

This builds the web app, syncs the bundle and native plugins, then opens the Xcode workspace. Alternatively, open `ios/App/App.xcworkspace` (not the `.xcodeproj`) after syncing:

```bash
npm run build
npx cap sync ios
open ios/App/App.xcworkspace
```

In Xcode, select the **App** scheme and an iOS Simulator or connected device, then press **Run**. For a physical device, select your Apple development team under **App > Signing & Capabilities**. The app uses bundle identifier `com.uniable.app`; change it in Xcode if your team requires a unique identifier.

If Xcode has no simulator available, install an iOS Simulator runtime in **Xcode > Settings > Platforms**.

## Rebuild after frontend changes

Every change to the React app or its environment settings must be included in a new native bundle:

```bash
npm run build
npx cap sync ios
```

UniAble asks iOS for microphone and speech-recognition permission when voice features are used. You can also build from Terminal without opening Xcode:

```bash
xcodebuild -workspace ios/App/App.xcworkspace \
  -scheme App \
  -destination 'generic/platform=iOS Simulator' \
  CODE_SIGNING_ALLOWED=NO build
```
