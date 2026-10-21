# UniAble Team Integration Guide

## Branches
- main
- admin-dashboard
- accessibility-settings
- voice-signup
- voice-login
- peer-assistance

## Before coding
git checkout main
git pull origin main
git checkout -b peer-assistance

## Before a pull request
npm install
npm run build

## Peer Assistance ownership
Primary UI:
frontend/src/pages/PeerAssistance.jsx

Shared API:
frontend/src/services/api.js
backend/src/routes/peer.js

Do not put secrets in GitHub.
Do not overwrite another member's page.
Coordinate shared changes to App.jsx, routes, package.json and Firebase configuration.

## Integration roadmap
1. Merge UI branches.
2. Agree on Firestore collections and security rules.
3. Add Firebase Authentication and role claims.
4. Replace demo store with Firestore.
5. Add FCM for emergency and request notifications.
6. Add speech/voice microservices.
7. Add BLE/Wi-Fi positioning service.
8. Add Google Vision OCR.
9. Conduct accessibility and security testing.
