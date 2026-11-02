# UniAble — Authentication, Role-Based Dashboards, Administration

Working slices of the UniAble platform:

1. **Authentication** — welcome, voice login, email login.
2. **Role-based dashboards** — Student, Lecturer, Disability Office, Security, Administrator.
3. **Administration** — accounts, roles, approvals, service configuration, controlled reports, audit trail.
4. **Voice activation + Emergency SOS** — wake-word demo; an SOS now appears on the Security dashboard.

## Run it

```bash
npm install
npm run dev
```

No Firebase project needed — a local mock back end is used (see "What is mocked").

## Demo accounts

Password for all: `Passw0rd!`

| Email (`@uniable.ac.za`) | Role | Lands on |
|---|---|---|
| `student@` | Student | `/student` |
| `lecturer@` | Lecturer | `/lecturer` |
| `disability@` | Disability Office | `/disability-office` |
| `security@` | Security | `/security` |
| `admin@`, `admin2@` | Administrator (two, so approvals can be tested) | `/admin` |

Voice login signs in the demo **student** only (see below).

### Things worth trying

- Sign in as **student**, press **Emergency SOS**, then (new tab or after signing out) sign in as **security** — the alert is on the Active incidents list. Stores sync across tabs of the same browser.
- As **admin@**, grant a role like Security to someone → it goes to **Approvals**. You cannot approve your own request; sign in as **admin2@** and approve it.
- As **admin@**, suspend a user → they can no longer sign in, and an already-signed-in session ends.
- As **admin@**, change *Unresponsive check-in threshold* → needs second approval; it then shows on the Security dashboard.
- As **admin@**, open **Audit trail** — every sensitive action and every denied attempt is there, referenced by ID.
- Visit `/admin` while signed in as a student → access denied, and the attempt is audited.

## The role model

| Role | Can do | Cannot do |
|---|---|---|
| Student | Own timetable, accessibility controls, assistance requests, SOS | See anyone else's data |
| Lecturer | Materials, announcements, **aggregated anonymous** feedback | See which student rated what, or any disability data |
| Disability Office | Registration queue, open/verify documents, decide, set accommodations | Manage accounts or config |
| Security | Active incidents, location **while active**, respond | See registration/disability data; location is cleared on close |
| Administrator | Accounts (name/email/role/status), role assignment, config, aggregated reports, audit, approvals | **Read registrations, documents, locations or assistance requests** |

Permissions live in `src/auth/roles.js`. Administrative convenience is not a reason for broad access: the admin role is simply never granted student-data permissions.

## Sensitive changes

Every sensitive admin action needs a **permission**, a **written reason (10+ chars)**, a **fresh password check**, and produces an **audit entry** (denied attempts too).

**Second-administrator approval** (four-eyes) is required for:
- granting or removing a privileged role (Administrator, Security, Disability Office);
- safety-critical settings (the check-in threshold).

Also enforced: nobody can change their own role or status; the last active administrator cannot be demoted or suspended; approvals are re-validated when decided and expire if the account changed.

## Data minimisation

- The account directory holds name, email, role, status — no disability data.
- Disability data lives only in registrations, readable only by the Disability Office.
- Audit entries reference records by ID (`registration:REG-1042`) and never copy categories or document names.
- Reports are aggregated; counts of 1–4 are shown as `<5`; exports are audited. (Primary suppression only — add secondary suppression and information-officer review before publishing real figures.)
- Incident location is deleted when an incident is resolved or cancelled.
- Voice login is for students only; staff and administrators always use a password.

South African law (POPIA) treats health and disability information as special personal information. Have your institution's information officer review this design before real data is used.

## What is mocked, and what production needs

This demo keeps data in browser storage so everything is clickable. That is **not secure** — a user could edit it. For production:

| Demo | Production |
|---|---|
| Mock sign-in | Firebase Authentication; role read from the `role` **custom claim**, set only by Cloud Functions via the Admin SDK |
| Browser-stored directory, registrations, incidents, config | Firestore, guarded by `firestore.rules` (reference rules included — test with the emulator) |
| Client-side rule checks in `adminStore.js` | The same rules in Cloud Functions; the client checks are UX only |
| Browser-stored audit log | Written only by Cloud Functions; clients denied write access |
| Suspension via shared directory | Disable the Firebase user and revoke refresh tokens |
| Voiceprint match (`services/voiceprint.js`) | Backend speaker-verification model |
| SOS delivered via shared storage | Cloud Function + Firebase Cloud Messaging to Security |
| Peer matching, announcements, file upload | Back end not built yet; the UI says so |

To go live: copy `.env.example` to `.env`, fill in your Firebase web config, and implement the back end above.

## Wake-word activation (unchanged)

`/voice-activation` listens continuously **while the tab is open**. Browsers don't allow microphone access from a locked screen or background app; that needs a native app. See earlier notes in the UI.

## Structure

```
src/
  auth/        roles.js (permissions) · SessionContext.jsx · RequireRole.jsx
  services/    firebase.js · directory.js · adminStore.js (approvals, config, rules)
               auditLog.js · registrations.js · incidents.js · assistance.js · reports.js
  dashboards/  Student · Lecturer · DisabilityOffice · Security · admin/*
  components/  StepUpDialog (reason + password) · AuthShell · ListeningRing …
  pages/       Welcome · Login · VoiceActivation · EmergencySOS
firestore.rules   reference security rules
```

## Accessibility

Skip link; one `main` per page; focus moves to the section heading on navigation; real tables with captions and scoped headers; native `<dialog>` (focus trap, Esc); status and errors announced with `aria-live` / `role="alert"`; badges pair colour with text; 44px+ targets; high contrast, text size and reduced motion respected on every dashboard.

## Next steps

Voice-guided sign-up flow · real back end (above) · wire lecturer announcements to FCM · real document storage.
