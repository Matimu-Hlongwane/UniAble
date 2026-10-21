# UniAble — AI-Powered Adaptive Accessibility Assistant

A full-stack academic prototype aligned with the UniAble planning/SRS:
- React + Vite frontend
- Node.js + Express API
- Firebase/Firestore-ready data layer
- Python + FastAPI AI microservice
- Peer Assistance network
- Emergency/SOS workflow
- Role-based dashboards
- Accessibility-aware UI
- Mock/demo mode so the project can run before API credentials are added

## Project structure

UniAble/
├── frontend/       React + Vite
├── backend/        Node.js + Express
└── ai-service/     Python + FastAPI

## 1. Frontend

cd frontend
npm install
npm run dev

## 2. Backend

cd backend
npm install
npm run dev

Create backend/.env from backend/.env.example.

## 3. AI service

cd ai-service
python -m venv .venv

Windows:
.venv\Scripts\activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000 --env-file .env

## Demo mode

The backend uses in-memory demo data if Firebase is not configured. This lets the team build the UI first.
Do NOT commit Firebase service-account JSON files or API keys.

## Git workflow

main
├── admin-dashboard
├── accessibility-settings
├── voice-signup
├── voice-login
└── peer-assistance

Each member should work on their own branch and open a Pull Request before merging.

## Android and iOS

This project can now be packaged as a cross-platform mobile app using Capacitor. See `MOBILE-SETUP.md` for the complete setup instructions.


## UniPal — Your UniAble Companion

The mobile app now includes a dedicated UniPal assistant at `/unipal`.

Architecture:

- React chat screen: `frontend/src/pages/UniPal.jsx`
- Express gateway: `backend/src/routes/unipal.js`
- FastAPI AI service: `ai-service/app/main.py`
- Frontend API client: `frontend/src/services/api.js`

UniPal is constrained to UniAble, accessibility and student disability-support topics. The AI service also uses the selected language, student first name, accessibility profile and relevant display preferences for personalisation.

For live AI responses, create `ai-service/.env` from `ai-service/.env.example` and provide an OpenAI API key. The key remains on the server-side AI service and is never placed in the mobile frontend.

The current integration uses the OpenAI Responses API. The OpenAI Assistants API was sunset on August 26, 2026, so this project does not build a new integration against the retired Assistants API.
