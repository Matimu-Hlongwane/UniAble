# UniAble updated prototype – run guide

## 1. Frontend
Open PowerShell in `UniAble/frontend`:

```powershell
npm install
npm run dev
```

Then open the Vite address shown in the terminal, normally:

`http://localhost:5173/`

The root page `/` is now the UniAble proposal/landing page. The student dashboard is `/dashboard`.

## 2. Backend
Open a SECOND PowerShell window in `UniAble/backend`:

```powershell
npm install
npm run dev
```

The API should start on:

`http://localhost:4000`

Check it with:

`http://localhost:4000/api/health`

If the backend is not running, the Peer Assistance page still displays demo requests, but browser requests to `/api/peer/...` will show `ERR_CONNECTION_REFUSED`.

## 3. Accessibility dashboards
From the Accessibility page, choose any profile. Direct routes are:

- `/disability/blind`
- `/disability/deaf`
- `/disability/mobility`
- `/disability/speech`
- `/disability/colour`
- `/disability/dyslexia`
- `/disability/adhd`
- `/disability/autism`
- `/disability/down`
- `/disability/multiple`

## 4. Important fixes in this version

- Added `React` imports to JSX files so `React is not defined` no longer occurs with the current Vite setup.
- Added a proposal-style landing page at `/`.
- Added ten personalised disability dashboard experiences.
- Added an Accessibility profile selector.
- Fixed the mobile/desktop sidebar so **Settings is no longer absolutely positioned over Emergency SOS**.
- Added a mobile navigation backdrop and close button.
- Kept the existing Peer Assistance, Emergency SOS, role-dashboard and backend integration points.

## 5. If the page is blank
1. Keep `npm run dev` running in the frontend terminal.
2. Open the browser developer console (F12).
3. If you see `React is not defined`, make sure you are running this updated ZIP and have restarted Vite after replacing files.
4. If you see `ERR_CONNECTION_REFUSED` for `localhost:4000`, start the backend in the second terminal.


## 5. UniPal AI assistant

UniPal is available at:

`http://localhost:5173/unipal`

The app sends UniPal requests to the Node backend at `/api/unipal/chat`. The backend forwards them to the existing FastAPI AI service.

For the full AI experience:

PowerShell window 3:

```powershell
cd ..\ai-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Open `ai-service/.env` and add your own OpenAI API key:

```env
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-6-luna
OPENAI_MAX_OUTPUT_TOKENS=500
```

Then start the service:

```powershell
uvicorn app.main:app --reload --port 8000 --env-file .env
```

Do not commit `.env` or your API key to GitHub.

Without an AI key/service, UniPal uses a limited local fallback so the screen can still be demonstrated.

## 6. UniPal connection troubleshooting (Android emulator)

The Android emulator cannot use `localhost` to reach a server running on your Windows computer.
This version uses `http://10.0.2.2:4000/api` for the Android emulator. The Android manifest permits
HTTP only for local development; use HTTPS for a deployed/production API.

Run the services in three separate PowerShell terminals, from the `UniAble` directory:

**Terminal 1 — Node backend**
```powershell
cd backend
npm install
npm run dev
```
Confirm `http://localhost:4000/api/health` returns a JSON status of `ok`.

**Terminal 2 — Python AI service**
```powershell
cd ai-service
python -m venv .venv
.venv\\Scripts\\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
notepad .env
```
Add your own OpenAI API key to `OPENAI_API_KEY` in `ai-service/.env`, save, then run:
```powershell
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
Confirm `http://localhost:8000/health` returns a JSON status of `ok`.

**Terminal 3 — optional browser frontend**
```powershell
cd frontend
npm install
npm run dev
```
The browser frontend uses `http://localhost:4000/api`. The Android emulator uses `10.0.2.2`.
If testing on a physical Android phone, set `VITE_API_URL` in `frontend/.env` to your computer's
LAN IP (for example `http://192.168.1.20:4000/api`), allow that port through Windows Firewall,
then rebuild and sync Android.

If UniPal still fails, first check the backend terminal for `/api/unipal/chat` requests, then check
the Python terminal for OpenAI errors. A network error before the backend logs a request is an API
address/server reachability issue. A `401` or `403` logged by the AI service indicates a key or
permission issue; a model-related `400` indicates the configured model/access needs checking.

**Security:** API keys are not included in this repaired ZIP. Add your own key locally and never
commit `.env` files to GitHub.
