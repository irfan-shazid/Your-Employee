<h1 align="center">Your Employee</h1>

<p align="center">
  <strong>A verified marketplace that connects daily workers with employers across Bangladesh.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Expo-SDK%2057-000020?logo=expo&logoColor=white" alt="Expo SDK 57" />
  <img src="https://img.shields.io/badge/React%20Native-0.86-61DAFB?logo=react&logoColor=black" alt="React Native 0.86" />
  <img src="https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/API-Hono%204-E36002?logo=hono&logoColor=white" alt="Hono 4" />
  <img src="https://img.shields.io/badge/ORM-Prisma%207-2D3748?logo=prisma&logoColor=white" alt="Prisma 7" />
  <img src="https://img.shields.io/badge/DB-Neon%20Postgres-00E599?logo=postgresql&logoColor=white" alt="Neon Postgres" />
  <img src="https://img.shields.io/badge/Payments-SSLCommerz-0E8F63" alt="SSLCommerz" />
</p>

<p align="center">
  <a href="#features">Features</a> &nbsp;•&nbsp;
  <a href="#getting-started">Getting started</a> &nbsp;•&nbsp;
  <a href="#architecture">Architecture</a> &nbsp;•&nbsp;
  <a href="#api-reference">API</a> &nbsp;•&nbsp;
  <a href="#deployment">Deployment</a>
</p>

<p align="center">
  <img src="docs/screenshots/worker-job-feed.png" width="200" alt="Job feed" />
  &nbsp;
  <img src="docs/screenshots/employer-home.png" width="200" alt="Employer home" />
  &nbsp;
  <img src="docs/screenshots/admin-overview.png" width="200" alt="Admin dashboard" />
</p>

---

## About

Daily work such as masonry, electrical repairs, loading, cooking or driving is still mostly found by word of mouth, with no way for workers to prove who they are or what they have done. **Your Employee** gives workers a verified profile and gives employers a safe, simple way to find and hire them.

| Role | What they do |
| --- | --- |
| **Worker** | Registers with their national ID and skills, gets verified, applies to jobs and receives direct offers |
| **Employer** | Registers as an individual or a business, gets verified, posts jobs or hires workers directly |
| **Admin** | Approves profiles, moderates jobs, manages categories and tracks revenue |

The platform earns small fees, paid through **SSLCommerz** (bKash, Nagad, Rocket and cards):

| Fee | Paid by | Default |
| --- | --- | --- |
| Worker plan (30 days) | Worker | **BDT 50** |
| Job post | Employer | **BDT 10** |
| Hire (applicant or direct offer) | Employer | **BDT 10** |

All prices are configurable in `server/.env`.

---

## Features

**Accounts & verification**
- Email/password and Google sign-in, with no verification codes
- 30-day sessions stored securely on the device, and in-app account deletion
- Role selection and multi-step profiles validated with regex (Bangladeshi mobile numbers, 10/13/17-digit NIDs)
- All 8 divisions and 64 districts
- Admin approval before anyone can use the marketplace; NID photos stay private

**Marketplace**
- Job feed with category, district and urgency filters, plus search
- Applications, shortlisting, hiring and direct offers to workers found in the directory
- Free hire credits when a paid offer is declined
- Reviews and ratings after a job is completed
- In-app notifications with unread badges

**Payments**
- SSLCommerz checkout in an in-app browser, with a deep link back into the app
- Every payment is re-validated on the server, and duplicate callbacks are ignored
- Payments that never called back are reconciled automatically

**Admin dashboard (inside the same app)**
- Monthly and all-time revenue, a 7-day revenue chart, approval queues with NID photos
- Users, payments, job moderation, and categories with English and Bengali names

**Experience & performance**
- Light, dark and automatic themes; skeleton loaders, pull-to-refresh, infinite scroll, haptics and smooth animations
- Session caching on the server and lean list queries
- Details prefetched as soon as a card is touched
- Polling pauses while the app is in the background
- Images are resized on the phone and cached

---

## Screenshots

<table>
  <tr>
    <td align="center"><img src="docs/screenshots/sign-up.png" width="190" alt="Sign up" /><br /><sub>Sign up</sub></td>
    <td align="center"><img src="docs/screenshots/worker-onboarding.png" width="190" alt="Worker registration" /><br /><sub>Worker registration</sub></td>
    <td align="center"><img src="docs/screenshots/worker-job-feed.png" width="190" alt="Job feed" /><br /><sub>Job feed</sub></td>
    <td align="center"><img src="docs/screenshots/job-detail.png" width="190" alt="Job details" /><br /><sub>Job details</sub></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/screenshots/employer-home.png" width="190" alt="Employer home" /><br /><sub>Employer home</sub></td>
    <td align="center"><img src="docs/screenshots/hire-detail.png" width="190" alt="Hire details" /><br /><sub>Hire & unlocked contact</sub></td>
    <td align="center"><img src="docs/screenshots/admin-overview.png" width="190" alt="Admin dashboard" /><br /><sub>Admin dashboard</sub></td>
    <td align="center"><img src="docs/screenshots/dark-mode.png" width="190" alt="Dark mode" /><br /><sub>Dark mode</sub></td>
  </tr>
</table>

---

## How it works

### Workers

1. Sign up with email or Google and choose **"I want work"**.
2. Complete a four-step profile:
   - photo, legal name, mobile number, date of birth, NID number and an optional NID photo;
   - location (division, district and area);
   - up to five work categories, plus skills and experience;
   - expected wage and availability.
3. Wait for an admin to review the profile. The app moves on automatically once it is approved.
4. Browse jobs for free. The **BDT 50 plan** unlocks applying, appearing in employer searches and receiving direct offers. Renewing early adds the days on top.

### Employers

1. Sign up, choose **"I want to hire"**, and register as an individual or a business. An NID or trade licence is required, and an admin must approve the profile.
2. **Post a job.** It goes live after the BDT 10 payment, and available workers in the same category and district are notified.
3. Shortlist or reject applicants, then **hire for BDT 10**. The hire is confirmed immediately.
4. **Or find workers directly** by category, district, skill or rating, and send an **offer for BDT 10**.
5. Mark the work completed and **rate the worker** from 1 to 5 stars.

### Fair-play rules

- Phone numbers and addresses are shared **only after a hire is confirmed**. That is what the hiring fee pays for.
- If a worker declines a paid offer, or the employer cancels it before the worker answers, the employer receives a **free hire credit**.
- Changing identity details (name, NID) on an approved profile sends it back for review. Suspending an employer closes their open jobs.

---

## Tech stack

| Layer | Technology |
| --- | --- |
| Mobile | [Expo SDK 57](https://docs.expo.dev) · React Native 0.86 · React 19.2 · Expo Router · React Compiler |
| State | [Redux Toolkit](https://redux-toolkit.js.org) + RTK Query (cache tags, infinite queries, optimistic updates) |
| UI | Custom design system · Plus Jakarta Sans · Ionicons · Reanimated 4 · FlashList 2 · expo-image |
| API | [Hono 4](https://hono.dev) on Node.js · Zod validation · rate limiting |
| Auth | [Better Auth 1.7](https://www.better-auth.com) + `@better-auth/expo` |
| Database | [Neon](https://neon.tech) Postgres · [Prisma ORM 7](https://www.prisma.io) with `@prisma/adapter-pg` |
| Payments | [SSLCommerz](https://developer.sslcommerz.com) (sandbox and live) |
| Tests | Node test runner · [PGlite](https://pglite.dev) in-process Postgres · mocked SSLCommerz |

No Docker required.

---

## Architecture

```mermaid
flowchart TB
  App["Expo app<br/>Redux Toolkit + RTK Query"]
  API["Hono API<br/>Better Auth · Zod · rate limits"]
  DB[("Neon Postgres")]
  SSL["SSLCommerz"]
  Google["Google OAuth"]

  App -- "HTTPS + session cookie" --> API
  API -- "Prisma 7" --> DB
  API <-- "payments & callbacks" --> SSL
  App -. "sign-in" .-> Google
  Google -. "callback" .-> API
```

The app never trusts a payment redirect on its own:

```mermaid
sequenceDiagram
  participant A as App
  participant S as API
  participant G as SSLCommerz
  A->>S: POST /api/payments/init
  S->>G: Create payment session
  G-->>A: Hosted checkout (in-app browser)
  G->>S: POST success URL with val_id
  S->>G: Validate amount, currency and transaction
  S->>S: Settle exactly once (plan, job or hire)
  S-->>A: Deep link back to the app
  A->>S: GET /api/payments/:tranId
  G-->>S: IPN (server-to-server backup)
```

---

## Project structure

```text
.
├── server/                  API
│   ├── prisma/              schema, migrations, seed
│   ├── tests/               end-to-end and unit tests
│   └── src/
│       ├── app.ts           middleware, rate limits, routes, errors
│       ├── index.ts         starts the HTTP server
│       ├── config/          validated environment and pricing
│       ├── db/              Prisma client and seed functions
│       ├── lib/             auth, session cache, errors, validation, pagination, SSLCommerz client
│       ├── middleware/      session, role and approval guards
│       ├── shared/          Zod schemas, serializers, locations, categories
│       └── modules/         account, jobs, applications, hires, workers,
│                            payments, notifications, admin, media, meta
├── mobile/                  Expo app
│   └── src/
│       ├── app/             screens (Expo Router)
│       ├── features/        per-feature API, components and hooks
│       ├── components/      design system, lists, form fields, layout
│       ├── store/           Redux store and base API
│       ├── lib/             auth client, formatting, validation, image upload
│       ├── theme/           light and dark design tokens
│       └── types/           API response types
└── docs/screenshots/
```

**Conventions:**
- Each server module has `*.routes.ts` (HTTP), `*.schemas.ts` (input rules) and `*.service.ts` (business logic).
- Each mobile feature keeps its API endpoints, components and hooks together, and screens only compose them.

---

## Getting started

### Prerequisites

- Node.js **20.19 or newer**
- A PostgreSQL database; a free [Neon](https://neon.tech) project is recommended
- An [SSLCommerz sandbox store](https://developer.sslcommerz.com/registration/)
- Expo Go on your phone, or an Android emulator / iOS simulator
- *Optional:* a Google Cloud OAuth client for Google sign-in

### 1. Install

```bash
git clone <your-repo-url> your-employee
cd your-employee

cd server && npm install
cd ../mobile && npm install
```

### 2. Configure the API

```bash
cd server
cp .env.example .env
```

Fill in at least the following. The complete list is under [Configuration](#configuration).

```dotenv
DATABASE_URL=postgresql://USER:PASSWORD@ep-xxxx-pooler.region.aws.neon.tech/neondb?sslmode=require
DIRECT_URL=postgresql://USER:PASSWORD@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require
BETTER_AUTH_URL=http://192.168.0.105:4000
BETTER_AUTH_SECRET=replace-with-32-or-more-random-characters
SSLCOMMERZ_STORE_ID=your-sandbox-store-id
SSLCOMMERZ_STORE_PASSWORD=your-sandbox-store-password
ADMIN_EMAIL=you@example.com
ADMIN_PASSWORD=a-strong-password
```

Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Create the database

```bash
npx prisma migrate deploy
npm run db:seed
```

This creates all tables, the 22 work categories and your admin account.

### 4. Start the API

```bash
npm run dev
```

Check it is running: `curl http://localhost:4000/api/health`

### 5. Run the app

```bash
cd ../mobile
cp .env.example .env
```

Point the app at your computer's **local network IP**. `localhost` does not work from a phone.

```dotenv
EXPO_PUBLIC_API_URL=http://192.168.0.105:4000
```

```bash
npx expo start
```

Scan the QR code with Expo Go, then sign in with `ADMIN_EMAIL` and `ADMIN_PASSWORD` to open the admin dashboard. Create more accounts in the app to try the worker and employer flows.

> **Tip:** the admin dashboard also runs in a browser with `npx expo start --web`. Add `http://localhost:8081` to `CORS_ORIGINS`.

### Google sign-in *(optional)*

1. In Google Cloud Console, open **APIs & Services → Credentials → Create OAuth client ID → Web application**.
2. Add the redirect URI `<BETTER_AUTH_URL>/api/auth/callback/google`.
3. Put the client ID and secret in `server/.env`. The Google button appears automatically.

> Google rejects local network addresses such as `192.168.x.x`. For local testing, expose the API over HTTPS with a tunnel (`npx cloudflared tunnel --url http://localhost:4000` or ngrok). Use that URL for both `BETTER_AUTH_URL` and `EXPO_PUBLIC_API_URL`.

### SSLCommerz

- **Sandbox:** keep `SSLCOMMERZ_IS_LIVE=false`. The payer's browser opens the success, fail and cancel pages, so a local network URL works for testing.
- **IPN:** server-to-server confirmation needs a public URL. The app also confirms payments itself, so IPN is a safety net.
- **Live:** set `SSLCOMMERZ_IS_LIVE=true` and register `<your-domain>/api/payments/sslcommerz/ipn` as the IPN URL in the merchant panel.

---

## Configuration

<details>
<summary><strong>Server: <code>server/.env</code></strong></summary>

<br />

| Variable | Required | Description |
| --- | :---: | --- |
| `DATABASE_URL` | Yes | Runtime connection string (the Neon **pooled** URL) |
| `DIRECT_URL` | Yes | Direct connection used by Prisma migrations (falls back to `DATABASE_URL`) |
| `BETTER_AUTH_URL` | Yes | Public base URL of the API, used for sign-in and payment callbacks |
| `BETTER_AUTH_SECRET` | Yes | 32+ random characters used to sign sessions |
| `PORT` | | API port (default `4000`) |
| `NODE_ENV` | | `development` or `production` |
| `APP_SCHEME` | | Deep-link scheme; must match `mobile/app.json` (default `youremployee`) |
| `CORS_ORIGINS` | | Comma-separated browser origins, e.g. the Expo web dev server |
| `TRUST_PROXY` | | `true` when running behind a proxy (Render, Railway, Nginx, Cloudflare) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | | Enable Google sign-in |
| `SSLCOMMERZ_STORE_ID`, `SSLCOMMERZ_STORE_PASSWORD` | | Enable payments |
| `SSLCOMMERZ_IS_LIVE` | | `false` for sandbox, `true` for live |
| `WORKER_MONTHLY_FEE`, `JOB_POST_FEE`, `HIRE_FEE` | | Prices in BDT (defaults `50`, `10`, `10`) |
| `SUBSCRIPTION_DAYS` | | Length of the worker plan (default `30`) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` | | First admin account, created by `npm run db:seed` |

The server validates these at startup and lists anything that is missing.

</details>

<details>
<summary><strong>Mobile: <code>mobile/.env</code></strong></summary>

<br />

| Variable | Description |
| --- | --- |
| `EXPO_PUBLIC_API_URL` | Base URL of the API: your local network IP in development, your HTTPS domain in production |

</details>

---

## Scripts

| Server (`server/`) | Description |
| --- | --- |
| `npm run dev` | Start the API with auto-reload |
| `npm start` | Start the API |
| `npm test` | Run the test suite (no database or network needed) |
| `npm run typecheck` | Type-check source and tests |
| `npm run db:migrate` | Create a migration after editing `schema.prisma` |
| `npm run db:deploy` | Apply migrations |
| `npm run db:seed` | Seed categories and the admin account |
| `npm run db:studio` | Browse the database in Prisma Studio |

| Mobile (`mobile/`) | Description |
| --- | --- |
| `npm start` | Start the Expo dev server |
| `npm run android` / `ios` / `web` | Start and open a specific platform |
| `npm run typecheck` | Type-check the app, including typed routes |
| `npm run lint` | Run ESLint |

---

## Testing

```bash
cd server
npm test
```

The suite runs the real API against an in-process Postgres with the real migration applied, and mocks SSLCommerz at the HTTP level. It needs no Docker, no database account and no network, and finishes in about 30 seconds.

It covers:
- onboarding and admin approval;
- subscriptions, including early renewal;
- job posts, applications, hires, contact unlocking, completion and reviews;
- direct offers and hire credits;
- the full payment callback flow, forged callbacks, duplicate IPNs and reconciliation;
- media privacy, session handling, account deletion and rate limiting.

For the mobile app:

```bash
cd mobile
npm run typecheck && npm run lint && npx expo-doctor
```

---

## API reference

All routes are under `/api`. Errors share one shape: `{ "error": { "code", "message", "details" } }`. Lists use cursor pagination: `?cursor=<id>&limit=20` returns `{ items, nextCursor }`.

<details>
<summary><strong>Show all endpoints</strong></summary>

<br />

| Area | Endpoints |
| --- | --- |
| Public | `GET /health` · `GET /meta` · `GET /media/:id` |
| Auth | `/auth/*`, handled by Better Auth (`sign-up/email`, `sign-in/email`, `sign-in/social`, `get-session`, `sign-out`) |
| Account | `GET /me` · `PUT /me/worker` · `PUT /me/employer` · `PATCH /me/availability` · `DELETE /me` · `POST /media` |
| Jobs | `GET /jobs` · `GET /jobs/mine` · `POST /jobs` · `GET /jobs/:id` · `POST /jobs/:id/close` · `POST /jobs/:id/reopen` · `DELETE /jobs/:id` · `POST /jobs/:id/apply` · `GET /jobs/:id/applications` |
| Applications | `GET /applications/mine` · `POST /applications/:id/withdraw` · `POST /applications/:id/shortlist` · `POST /applications/:id/reject` · `POST /applications/:id/hire` |
| Workers | `GET /workers` · `GET /workers/:id` |
| Hires | `GET /hires` · `POST /hires` · `GET /hires/:id` · `POST /hires/:id/accept` · `POST /hires/:id/decline` · `POST /hires/:id/complete` · `POST /hires/:id/cancel` · `POST /hires/:id/review` |
| Payments | `POST /payments/init` · `GET /payments` · `GET /payments/:tranId` · `POST /payments/sslcommerz/{success,fail,cancel,ipn}` |
| Notifications | `GET /notifications` · `GET /notifications/unread-count` · `POST /notifications/read` |
| Admin | `GET /admin/stats` · `GET /admin/workers` · `GET /admin/employers` · `POST /admin/{workers,employers}/:id/decision` · `GET /admin/users` · `GET /admin/payments` · `GET /admin/jobs` · `POST /admin/jobs/:id/remove` · `GET/POST/PATCH /admin/categories` |

</details>

---

## Security

- **Rate limits:**
  - 300 requests per minute per IP on the API, and 40 on sign-in routes;
  - stricter limits on sign-in and sign-up;
  - per-user limits on payments, applications, job posts, offers and uploads.
- **Validation:** every request is validated with Zod. Uploads are checked by their file signature (JPEG, PNG or WebP, up to 1.5 MB).
- **Privacy:** phone numbers, NID numbers and addresses never appear in public data. NID photos are visible only to their owner and admins.
- **Payments:** amount, currency and transaction are verified with SSLCommerz before anything is granted. Redirects only go back into the app, and settlement is idempotent.
- **Hardening:** secure headers, a CORS allow-list and request size limits.

---

## Deployment

### API

Any Node.js host works (Render, Railway, Fly.io, or a VPS with `pm2`). No Docker needed.

```bash
npm ci
npx prisma migrate deploy
npm start
```

In production, set:
- `NODE_ENV=production`;
- `TRUST_PROXY=true` when running behind a proxy;
- `BETTER_AUTH_URL` to your HTTPS API domain;
- the rest of the variables from `.env`.

The rate limiter and session cache live in memory, which suits a single instance. Move them to Redis or Postgres before scaling out.

### Mobile

```bash
cd mobile
npx eas-cli@latest build:configure
npx eas-cli@latest build -p android
```

Set `EXPO_PUBLIC_API_URL` in the `env` block of your `eas.json` build profile, and update the bundle identifiers in `app.json` if needed.

### Go-live checklist

- [ ] Live SSLCommerz credentials with `SSLCOMMERZ_IS_LIVE=true`, and the IPN URL registered
- [ ] Google OAuth redirect URI pointing at the production domain
- [ ] A strong `BETTER_AUTH_SECRET` and admin password
- [ ] Your own app icon and splash artwork in `mobile/assets/images`

---

## Troubleshooting

| Problem | Solution |
| --- | --- |
| The app says **"You're offline"** on a phone | Use your computer's local network IP in `EXPO_PUBLIC_API_URL`, keep both devices on the same Wi-Fi, and allow port 4000 through the firewall |
| The server stops with **"Invalid environment variables"** | Fill in the variables it lists in `server/.env` |
| Prisma migrations cannot reach Neon | Use the **direct** (non-pooler) connection string for `DIRECT_URL` |
| Google shows **`redirect_uri_mismatch`** | Register exactly `<BETTER_AUTH_URL>/api/auth/callback/google` over HTTPS (use a tunnel locally) |
| Checkout says **"Payments are not configured"** | Set `SSLCOMMERZ_STORE_ID` and `SSLCOMMERZ_STORE_PASSWORD`, then restart the API |
| **429 Too many requests** during testing | Rate limits are working as intended; wait a minute or restart the API |

---

## Roadmap

- [ ] Push notifications
- [ ] Password reset by email
- [ ] Bengali language support across the app
- [ ] Subscription expiry reminders
- [ ] Employer ratings by workers and in-app chat
- [ ] Refunds through SSLCommerz
- [ ] Shared rate-limit and session store for multi-instance deployments
- [ ] Mobile component tests

**Current status:**
- All features above are implemented.
- Verified with type-checking, linting, `expo-doctor`, the automated API test suite and browser-based UI testing of the web build.
- Not yet tested on physical devices or with live SSLCommerz sandbox payments.

---

## Contributing

1. Follow the structure: a server feature is `modules/<name>/`, and a mobile feature is `features/<name>/`.
2. Run the checks before opening a pull request:

   ```bash
   cd server && npm run typecheck && npm test
   cd ../mobile && npm run typecheck && npm run lint
   ```

3. After changing `server/prisma/schema.prisma`, create a migration with `npm run db:migrate -- --name <change>`.

---

## License

No license has been chosen yet, so all rights are reserved. Add a `LICENSE` file before publishing or accepting outside contributions.
