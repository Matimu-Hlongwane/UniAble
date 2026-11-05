# UniAble presentation quick start

This guide is for the current macOS project folder. Keep the two Terminal
windows running while presenting.

## Start the backend

Open Terminal and run:

```bash
cd "/Users/dylansmac/Downloads/UniAble-integration-landing-signup-2/backend"
npm run dev
```

In another Terminal window, check that the API is ready:

```bash
curl http://localhost:4000/api/health
```

The response should include `"status":"ok"`. Do not share or display
`backend/.env`; it may contain private service configuration.

## Start the app

Open a second Terminal window and run:

```bash
cd "/Users/dylansmac/Downloads/UniAble-integration-landing-signup-2/frontend"
npm run dev -- --host 0.0.0.0
```

Open [http://localhost:5173](http://localhost:5173) in the presentation
browser. The student dashboard requires signing in with an existing student
account. Staff can start from `/staff` and sign in with an existing staff
account. Do not create test accounts during the presentation.

## If something is unavailable

- **Blank page:** Check the frontend Terminal for an error and reload the page.
- **API/network error:** Make sure the backend Terminal is still running and
  `http://localhost:4000/api/health` returns healthy.
- **UniPal AI:** The UI and built-in guidance work without the AI service.
  Live generated responses require the separate FastAPI service and a valid
  Gemini key in the private `ai-service/.env`. The key is not included in this
  project folder's example configuration.
- **Phone app:** A simulator or phone uses a different API address than
  `localhost`. Follow [MOBILE-SETUP.md](./MOBILE-SETUP.md) and configure the
  API address before presenting from a device.

## Current verified features

- Lecturer announcements are scoped to their assigned modules; students see
  announcements for modules they are enrolled in.
- Attendance entry uses the selected class roster and does not display
  disability profile details.
- Accessibility settings checks this device's text-to-speech support for the
  available languages.
- Voice navigation listens only after the microphone is activated. Device
  Voice Control, Voice Access, or switch control can help activate the button.
- The disability-office workspace shares the staff portal layout while keeping
  administrator-only sections restricted.

The frontend production build and targeted lint checks passed for this version.
The build still prints existing React Router and large-bundle warnings.
