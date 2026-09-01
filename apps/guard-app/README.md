# Kruze Guard App

Expo/React Native app for security guards: set up mobile login, sign
in, see today's assigned trip(s), and raise SOS. Managed with **npm**,
not pnpm — excluded from the root `pnpm-workspace.yaml` for the same
reason as `employee-app`/`driver-app`.

Unlike the driver app, this one is deliberately read-only on trip
status — advancing a trip (accept/start/complete) is the driver's
responsibility, not the guard's. A guard's job on the app is limited to
visibility into their assignment and raising an alert.

## Backend prerequisite

A guard identity is created by their vendor (`POST /guards`, by a
`VENDOR_ADMIN`/`FLEET_OPERATOR_ADMIN`) — never self-signed-up, exactly
like `Driver`. This app's "Set up mobile login" screen calls
`POST /guards/claim-account`: the guard re-proves who they are (global
guard ID + registered phone number) and picks a password, which:

- creates a login-capable `User` and links `Guard.userId` to it
- grants a `GUARD`-role `OrganisationMembership` on every vendor org
  the guard currently has an ACTIVE `GuardVendorRelationship` with

See `apps/api/src/guard/guard.service.ts` and
`apps/api/test/guard-login.e2e-spec.ts` for the full lifecycle — the
same shape as `apps/api/src/driver/driver.service.ts`.

## Running

```bash
cd apps/guard-app
npm install

# Point at your API — required for a physical device (localhost only
# resolves inside a simulator or the web preview, not on a phone).
EXPO_PUBLIC_API_BASE_URL=http://<your-lan-ip>:3000/v1 npm start

# or, for the web preview (no simulator required):
npm run web
```

## Verification note

Same approach as `employee-app`/`driver-app` — no iOS/Android
simulator in this environment, so what was verified against the real
running API:

- `npx tsc --noEmit` — clean
- `npx expo export --platform web` — bundles successfully
- The exported web build was driven with a headless browser end to
  end: claim account (vendor onboards guard → guard claims login) →
  auto-signed-in → see today's assigned trip → tap "Raise SOS" →
  confirmed no error (the SOS call succeeded against the live API)

## Screens

- `src/screens/LoginScreen.tsx` — email/password sign-in (rejects
  non-`GUARD` accounts)
- `src/screens/ClaimAccountScreen.tsx` — set up mobile login for an
  already-onboarded guard
- `src/screens/HomeScreen.tsx` — today's assigned trip(s), live-updated
  over the `realtime` WebSocket gateway (`trip.status`/
  `trip.assignment`, with a 30s poll fallback); SOS button per trip

## Not yet built

This completes the mobility-worker app trio started with
`employee-app` and `driver-app` — all three follow the same
`*.userId` link + claim-account pattern now.
