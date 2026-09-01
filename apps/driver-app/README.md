# Kruze Driver App

Expo/React Native app for drivers: set up mobile login, sign in, see
today's assigned trip(s), advance trip status, verify passenger
pickup/drop OTP codes, and raise SOS. Managed with **npm**, not pnpm —
excluded from the root `pnpm-workspace.yaml` for the same reason as
`employee-app`.

## Backend prerequisite

A driver identity is created by their vendor (`POST /drivers`, by a
`VENDOR_ADMIN`/`FLEET_OPERATOR_ADMIN`) — never self-signed-up, since a
driver isn't onboarded until a fleet actually employs them. This app's
"Set up mobile login" screen calls `POST /drivers/claim-account`: the
driver re-proves who they are (their global driver ID + the phone
number the vendor registered) and picks their own password, which:

- creates a login-capable `User` and links `Driver.userId` to it
- grants a `DRIVER`-role `OrganisationMembership` on every vendor org
  the driver currently has an ACTIVE `DriverVendorRelationship` with
  (mirroring how `POST /auth/login` already supports one user holding
  multiple org memberships)

See `apps/api/src/driver/driver.service.ts` and
`apps/api/test/driver-login.e2e-spec.ts` for the full lifecycle.

Verifying a passenger's pickup/drop OTP needs the challenge id, which
the driver never sees at generation time (only the passenger does) —
`GET /otp-challenges/pending?tripEmployeeId=&purpose=` looks it up
without exposing the code itself.

## Running

```bash
cd apps/driver-app
npm install

# Point at your API — required for a physical device (localhost only
# resolves inside a simulator or the web preview, not on a phone).
EXPO_PUBLIC_API_BASE_URL=http://<your-lan-ip>:3000/v1 npm start

# or, for the web preview (no simulator required):
npm run web
```

## Verification note

Same approach as `employee-app` — no iOS/Android simulator in this
environment, so what was verified against the real running API:

- `npx tsc --noEmit` — clean
- `npx expo export --platform web` — bundles successfully
- The exported web build was driven with a headless browser end to
  end: claim account (vendor onboards driver → driver claims login) →
  auto-signed-in → see today's assigned trip → tap "Accept trip" →
  trip status updates in the UI

## Screens

- `src/screens/LoginScreen.tsx` — email/password sign-in (rejects
  non-`DRIVER` accounts)
- `src/screens/ClaimAccountScreen.tsx` — set up mobile login for an
  already-onboarded driver
- `src/screens/HomeScreen.tsx` — today's assigned trip(s), live-updated
  over the `realtime` WebSocket gateway (`trip.status`/
  `trip.assignment`, with a 30s poll fallback); per-trip status
  advance button, per-passenger pickup/drop OTP verification, SOS

## Not yet built

`apps/guard-app` now follows the same pattern (`Guard.userId` links to
`User` the same way `Driver.userId` does), completing the
employee/driver/guard mobility-worker app trio.
