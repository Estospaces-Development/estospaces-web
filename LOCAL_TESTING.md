# Local and Dev Testing Guide

This app is a Vite frontend served on `http://localhost:3000`. It supports two backend targets:

- `local`: all services on your machine
- `dev`: local frontend against the shared GCP dev services

## Standard Workflow

1. Install dependencies

```bash
npm install
```

2. Pick the backend target

```bash
npm run env:local
```

or

```bash
npm run env:dev
```

3. Start the app

```bash
npm run dev
```

4. Open the app

```text
http://localhost:3000
```

## Environment Files

- `.env.local-preset`: local services on ports `8080` to `8086`
- `.env.gcp-dev`: Cloud Run dev services
- `.env.development`: active environment used by Vite during local development

Switching environments updates `.env.development`.

## Commands We Use Before Shipping

```bash
npm run test:fast-track
npm run test
npm run build
npm run test:e2e:dev
npm run test:e2e:local
```

## End-to-End Smoke Tests

The checked-in browser smoke runner lives in `scripts/e2e-smoke.cjs`.

Use these commands:

```bash
npm run test:e2e:dev
npm run test:e2e:local
```

`test:e2e:dev` defaults to `http://localhost:4173`.
`test:e2e:local` defaults to `http://localhost:3000`.

Optional overrides:

- `E2E_DEV_BASE_URL`
- `E2E_LOCAL_BASE_URL`
- `E2E_DEV_FAST_TRACK_CASE_ID`
- `E2E_LOCAL_FAST_TRACK_CASE_ID`
- `E2E_USER_EMAIL`
- `E2E_USER_PASSWORD`
- `E2E_MANAGER_EMAIL`
- `E2E_MANAGER_PASSWORD`

## Local Backend Expectations

For `npm run env:local`, these services should be reachable:

- `VITE_CORE_SERVICE_URL=http://localhost:8080`
- `VITE_BOOKING_SERVICE_URL=http://localhost:8081`
- `VITE_PAYMENT_SERVICE_URL=http://localhost:8082`
- `VITE_NOTIFICATION_SERVICE_URL=http://localhost:8083`
- `VITE_SEARCH_SERVICE_URL=http://localhost:8084`
- `VITE_MEDIA_SERVICE_URL=http://localhost:8085`
- `VITE_MESSAGING_SERVICE_URL=http://localhost:8086`

If the local stack is not running, use `npm run env:dev` for frontend verification against the shared dev backend.

To boot the full local stack from the repo deployment workspace:

```bash
cd ..\\estospaces-deployment
docker compose -f docker-compose.dev.yml up -d --build
```

## Dev Environment Workflow

Use this when you want production-like integration without starting every backend locally.

```bash
npm run env:dev
npm run dev
```

This runs the local frontend against the GCP dev services declared in `.env.gcp-dev`.

## Fast-Track Verification Checklist

Run this checklist in both `local` and `dev` whenever the fast-track experience changes.

### User flow

1. Sign in as a user.
2. Open `/user/dashboard/fast-track`.
3. Confirm the selected case loads.
4. Verify document states render correctly:
   - not requested
   - requested
   - uploaded
   - re-upload required
   - verified
5. Open the linked workspace actions:
   - live workspace
   - document section
   - messages
   - applications or offer journey
   - viewings
   - contracts when relevant
   - billing or payments

### Manager flow

1. Sign in as a manager.
2. Open `/manager/fast-track`.
3. Confirm the queue, stats, and case search load.
4. Open a case and verify:
   - document request state
   - verification review handoff
   - linked journey summary
   - workspace section routing
5. Confirm the manager can request documents only while the live lead is still requestable.

### Journey coverage

Check both major paths:

- rent: documents -> viewing -> application -> contract -> payment completion
- buy: documents -> viewing -> buyer qualification -> sale progression -> completion

## UI Review Checklist

Use these checks before sign-off:

- primary actions use the orange brand accent
- cards and panels follow the same spacing rhythm
- page headers lead with title, supporting copy, then actions
- empty states are calm and informative
- auth screens do not expose seeded credentials
- keyboard focus is visible on interactive controls
- layouts remain clear at mobile, tablet, and desktop widths

## Quick Smoke Commands

```bash
npm run env:dev
npm run dev
```

In a second terminal:

```bash
npm run test:fast-track
npm run build
```

## Troubleshooting

### App starts but API data is empty

- Confirm the selected environment with `Get-Content .env.development`
- If you expected real integration, switch to `npm run env:dev`

### Local API errors

- Make sure the corresponding service ports are running
- Check browser network requests for the failing service origin

### Fast-track page looks blank

- Confirm authentication succeeded
- Verify the seeded environment actually contains fast-track records
- Run `npm run test:fast-track` to separate logic regressions from environment-data issues

### Build or test regressions

- Run `npm run test`
- Run `npm run build`
- Fix failing shared UI or workflow helpers before re-testing in the browser
