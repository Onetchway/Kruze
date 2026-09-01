# Kruze Employee App

Expo/React Native app for employees: request transport access, sign in,
see today's trip(s), and generate a pickup/drop OTP code to show the
driver. Managed with **npm**, not pnpm — excluded from the root
`pnpm-workspace.yaml` since Expo/React Native tooling expects its own
lockfile and `node_modules` layout.

## Backend prerequisite

An employee record needs a linked login account before this app is
useful. That's what `POST /employees/signup` now does: it creates the
`User` immediately (so the app has something to log in with) but the
account has **no session** until the corporate approves the request
(`POST /employees/:id/approve`, from Corporate Web's Signup Requests
page or the API directly) — approval is what grants the `EMPLOYEE`
`OrganisationMembership` that `POST /auth/login` requires. See
`apps/api/src/employee/employee.service.ts` and
`apps/api/test/employee-login.e2e-spec.ts` for the full lifecycle.

## Running

```bash
cd apps/employee-app
npm install

# Point at your API — required for a physical device (localhost only
# resolves inside a simulator or the web preview, not on a phone).
EXPO_PUBLIC_API_BASE_URL=http://<your-lan-ip>:3000/v1 npm start

# or, for the web preview (no simulator required):
npm run web
```

## Verification note

This environment has no iOS/Android simulator, so native builds
couldn't be exercised directly here. What *was* verified, against the
real running API:

- `npx tsc --noEmit` — clean
- `npx expo export --platform web` — bundles successfully; the output
  bundle was inspected and contains the actual screen content
- The exported web build was driven with a headless browser through
  the real UI end to end: submit the signup form → approve via the
  Corporate Web-equivalent API call → sign in → see today's trip → tap
  "Get pickup code" → see the generated OTP

Since Expo's web target (`react-native-web`) renders the same
component tree as the native targets, this is a meaningful check of
the actual app logic — just not a substitute for a real device/
simulator pass before shipping.

## Screens

- `src/screens/LoginScreen.tsx` — email/password sign-in (rejects
  non-`EMPLOYEE` accounts)
- `src/screens/SignupScreen.tsx` — request access by the employer's
  Kruze ID
- `src/screens/HomeScreen.tsx` — today's trip(s), live-updated over the
  `realtime` WebSocket gateway (`trip.status`/`trip.assignment`, with a
  30s poll fallback), pickup/drop OTP generation

## Not yet built

`apps/driver-app` now follows the same pattern (`Driver.userId` links
to `User` the same way `Employee.userId` does). A Guard app would
follow the same pattern too (`PlatformRole.GUARD` exists, but nothing
currently links a `Guard` record to a `User`) — not built in this
pass; these two apps are meant to establish the pattern, not be
triplicated.
