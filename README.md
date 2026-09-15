# InvoiceFlow Studio

Fast, beautiful invoices and proposals for freelance creatives — designers, video editors, and writers who hate making them by hand.

Live domain: **[invoiceflowstudio.com](https://invoiceflowstudio.com)**

This is a focused Micro-SaaS MVP, not an accounting suite. Create from studio templates, send a PDF or shareable link, and track paid / unpaid.

## What you get

- Marketing landing + pricing + Terms/Privacy stubs
- Auth: email/password (works with zero API keys), optional GitHub OAuth, optional Resend magic link
- Dashboard: invoices, proposals, clients, studio settings, billing
- Invoice editor (client, line items, tax, notes, due date, status)
- Proposal editor (sections, optional pricing, accept/decline on the public link)
- PDF download + public share pages
- Filters on invoice and proposal lists
- Free vs Pro limits in code: **Starter = 3 invoices and 3 proposals per month; Pro = unlimited at $24/mo**
- Stripe Checkout + Customer Portal + webhook (test mode). Local demo upgrade if Stripe keys are missing
- Cloudflare Workers deploy via the **OpenNext** adapter (`@opennextjs/cloudflare`)

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 · shadcn-style UI · Prisma · Auth.js v5 · Stripe · Resend (optional) · pdf-lib · OpenNext on Cloudflare Workers

- **Local:** SQLite (`DATABASE_URL=file:./dev.db`) so `npm run setup && npm run dev` works without Docker
- **Production:** Postgres (Neon or Supabase) + Cloudflare Workers. SQLite file DBs cannot run on Workers

## Setup (local demo)

```bash
cp .env.example .env
# set AUTH_SECRET — generate with: openssl rand -base64 32
npm install
npm run setup
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Demo account (created by seed):

- Email: `demo@invoiceflow.dev`
- Password: `demo1234`

Seed also loads Design Project Invoice, Retainer Invoice, Video Edit Proposal, and sample Studio North documents.

## Environment variables

See `.env.example`. Placeholders only — never commit real secrets.

| Variable | Local | Production (Cloudflare) | If missing |
|---|---|---|---|
| `DATABASE_URL` | `file:./dev.db` | Neon/Supabase **pooled** `postgresql://…` | App cannot store data |
| `DATABASE_URL_UNPOOLED` | — | Neon **direct** URL for `db push` / migrate | Use `DATABASE_URL` if you are not on a pooler |
| `PRISMA_PROVIDER` | unset (sqlite from URL) | `postgresql` if the build URL is not postgres yet | Provider is inferred from `DATABASE_URL` |
| `AUTH_SECRET` | generate locally | **required** secret | Dev fallback only; do not ship that |
| `AUTH_URL` | `http://localhost:3000` | `https://invoiceflowstudio.com` | Defaults to localhost / production domain |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | `https://invoiceflowstudio.com` | Share links and Stripe redirects |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | optional | optional | GitHub button hidden |
| `AUTH_RESEND_KEY` / `EMAIL_FROM` | optional | optional | Magic link hidden; share-link email logs to console |
| `STRIPE_SECRET_KEY` | optional test key | test or live secret | Checkout disabled |
| `STRIPE_PRO_PRICE_ID` | optional | `price_…` for Pro | Same |
| `STRIPE_WEBHOOK_SECRET` | from Stripe CLI | from Dashboard endpoint | Webhook route returns 501 |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | optional | optional | Not required for server Checkout |
| `AUTH_DEV_MODE` | `true` | **`false`** | Production hides “Unlock Pro for local demo” |

Auth.js is configured with `trustHost: true` so it trusts the `Host` header Cloudflare sends.

## Production Postgres (before first deploy)

Workers cannot use `file:./dev.db`. Create a Neon or Supabase Postgres database, then push the schema **from your laptop** (Prisma CLI talks to Postgres over TCP; you do this once before the Worker goes live):

```bash
export DATABASE_URL="postgresql://USER:PASSWORD@HOST/DB?sslmode=require"
# Neon: prefer the unpooled/direct URL for this command
npm run db:push:prod
```

`db:push:prod` refuses to run against SQLite. Optional later:

```bash
npx prisma migrate dev --name init   # only if you want a migration history; use the postgres URL
npm run db:migrate:prod              # prisma migrate deploy
```

For Neon, use the **pooled** (`-pooler`) URL as the Worker `DATABASE_URL`, and the **direct** URL when running `db:push:prod`.

Then seed production only if you want the demo user (skip for a real launch):

```bash
DATABASE_URL="postgresql://…" npm run db:seed
```

The app uses Prisma **driver adapters** at runtime so Postgres works on Cloudflare Workers (no query-engine binary, no `file:./dev.db`):

- **Neon** hosts → `@prisma/adapter-neon` **HTTP** (`PrismaNeonHTTP`), created **lazily on first query** so Worker secrets exist on `process.env`
- **Supabase / generic Postgres** → `@prisma/adapter-pg` + `pg` over Workers `nodejs_compat`
- Cloudflare `prisma generate` sets `engineType = "client"` (rust-free). Local SQLite `npm run setup` does not — it still uses the default Prisma client with no adapter

`DATABASE_URL` must be a **runtime** Worker secret (not only a build variable). Signup is the first path that queries Postgres; marketing pages do not.

## Deploy to Cloudflare (invoiceflowstudio.com)

OpenNext builds the Next.js 16 App Router app into a **Cloudflare Worker** (the current Git-connected path; classic Pages Functions / `@cloudflare/next-on-pages` is not used). DNS for `invoiceflowstudio.com` should stay on Cloudflare.

### A. One-time: Wrangler from this repo (optional smoke deploy)

```bash
npx wrangler login
cp .dev.vars.example .dev.vars   # local Worker preview only
npm run cf:build                 # OpenNext transform (also runs `next build`)
npm run deploy                   # build + wrangler deploy
```

`npm run preview` serves the Worker locally via Wrangler. Copy `.dev.vars.example` → `.dev.vars` with a **Postgres** URL — SQLite `file:./dev.db` cannot run inside the Worker. Use `npm run dev` for the local SQLite demo.

### B. Connect GitHub in the Cloudflare dashboard (recommended)

Do this in the Cloudflare dashboard — the agent cannot click it for you:

1. Open [Workers & Pages](https://dash.cloudflare.com/?to=/:account/workers-and-pages).
2. **Create** → **Workers** → **Connect to Git** (GitHub) → authorize the `iglooo2/invoiceflow` repo.
3. Production branch: `main` (after this PR merges).
4. Build settings:
   - **Root directory:** `/` (repo root)
   - **Build command:** `npm run cf:build` (forces a Postgres Prisma client, then OpenNext)
   - **Deploy command:** `npx wrangler deploy`
   - **Non-production branch deploy command:** `npx wrangler versions upload` (preview URLs)
   - Alternative build command: `npx opennextjs-cloudflare build` — then you **must** set `PRISMA_PROVIDER=postgresql` and a `postgresql://` `DATABASE_URL` as **build** variables so `prisma generate` does not emit SQLite.
5. **Settings → Variables and Secrets** (runtime — *not* only build vars). Add:

   | Name | Type | Example |
   |---|---|---|
   | `DATABASE_URL` | Secret | `postgresql://…` (Neon pooled or Supabase) |
   | `AUTH_SECRET` | Secret | `openssl rand -base64 32` |
   | `AUTH_URL` | Variable | `https://invoiceflowstudio.com` |
   | `NEXT_PUBLIC_APP_URL` | Variable | `https://invoiceflowstudio.com` |
   | `AUTH_DEV_MODE` | Variable | `false` |
   | `PRISMA_PROVIDER` | Variable | `postgresql` |
   | `STRIPE_SECRET_KEY` | Secret | `sk_test_…` or live |
   | `STRIPE_WEBHOOK_SECRET` | Secret | `whsec_…` |
   | `STRIPE_PRO_PRICE_ID` | Variable | `price_…` |
   | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Variable | `pk_…` |
   | `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | Secret | if using GitHub login |
   | `AUTH_RESEND_KEY` | Secret | if using magic links |
   | `EMAIL_FROM` | Variable | `InvoiceFlow Studio <noreply@invoiceflowstudio.com>` |

   Also add `DATABASE_URL` and `PRISMA_PROVIDER=postgresql` under **Build** variables so `prisma generate` emits a Postgres client during the OpenNext build.

6. Save, then **Retry build** / push to `main`.
7. **Custom domain:** Worker → **Settings → Domains & Routes → Add** → `invoiceflowstudio.com`. Because the zone is already on Cloudflare, accept the proxied record it offers. Optionally add `www` and redirect it to apex in the zone.
8. GitHub OAuth app (if used): Homepage `https://invoiceflowstudio.com`, callback `https://invoiceflowstudio.com/api/auth/callback/github`.
9. Stripe webhook endpoint: `https://invoiceflowstudio.com/api/stripe/webhook` (events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`).

Worker name in `wrangler.jsonc` is `invoiceflow` (must match the Cloudflare Git-connected Worker).

### What you must click (no CLI equivalent)

- Authorize GitHub on the Cloudflare account
- Create the Worker and connect this repo
- Paste secrets in **Variables and Secrets**
- Attach **invoiceflowstudio.com** as a custom domain
- (Optional) Enable R2 and bind `NEXT_INC_CACHE_R2_BUCKET` for durable Next.js incremental cache — not required for the MVP

## Stripe test-mode steps

1. Create a Stripe account and switch to **Test mode**.
2. Create a product “InvoiceFlow Pro” with a **$24/month** recurring price. Copy the `price_...` id.
3. Copy test secret + publishable keys into `.env` (local) or Cloudflare secrets (prod).
4. Install the [Stripe CLI](https://docs.stripe.com/stripe-cli) and run:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

5. Paste the CLI `whsec_...` into `STRIPE_WEBHOOK_SECRET`.
6. In the app: Billing → Upgrade with Stripe. Card: `4242 4242 4242 4242`, any future expiry, any CVC.

Without Stripe keys locally, keep `AUTH_DEV_MODE=true` and use **Unlock Pro for local demo**.

## Scripts

| Script | Purpose |
|---|---|
| `npm run setup` | Prisma generate + SQLite `db push` + seed |
| `npm run dev` | Next.js dev server (Turbopack) |
| `npm run build` | Node production build |
| `npm run cf:build` | OpenNext Cloudflare Worker bundle |
| `npm run preview` | Worker runtime locally (Wrangler) |
| `npm run deploy` | OpenNext build + `wrangler deploy` |
| `npm run db:push:prod` | `prisma db push` against Postgres only |
| `npm test` | Money, plan limits, DB URL/adapter helpers, Prisma postgres engine rewrite |

## Demo path (no paid keys)

1. `npm run setup && npm run dev`
2. Sign in as `demo@invoiceflow.dev` / `demo1234`
3. Open the seeded invoice, copy the public link, download PDF
4. Dashboard → template card → create a Design Project Invoice
5. Billing → Unlock Pro for local demo (optional)

## Cloudflare / Workers notes

- **OpenNext vs vinext:** Cloudflare’s newest Next.js path is [vinext](https://developers.cloudflare.com/workers/frameworks/framework-guides/nextjs/). This repo uses **`@opennextjs/cloudflare`** (still a documented Workers path) so we keep the App Router + `next build` toolchain.
- **Prisma:** production uses the rust-free client engine + driver adapters (no query-engine binary on Workers). The Prisma client is a lazy proxy so `DATABASE_URL` is read after OpenNext copies Worker secrets onto `process.env`. Local SQLite does not use an adapter.
- **Signup / login check after deploy:** open `/login` → Create account with a new email and 8+ character password. You should land on `/dashboard`. Sign out, sign back in with the same credentials. A 500 (“This page couldn’t load”) on register, followed by “Those credentials didn’t match” on login, means Prisma never created the user (adapter/env/engine). `npm test` covers adapter selection and the Postgres `engineType = "client"` schema rewrite.
- **`pg-cloudflare`:** OpenNext’s package copy does not include `pg-cloudflare`’s `workerd` build. `open-next.config.ts` sets `useWorkerdCondition: false` so `pg` uses `nodejs_compat` sockets. Prefer **Neon HTTP** in production to avoid that path.
- **Node.js middleware:** Next.js 16 `proxy.ts` (dashboard cookie gate) is **experimental** on Cloudflare OpenNext. Do not set `export const runtime = "edge"` — OpenNext expects the Node.js runtime. If a future OpenNext release rejects Node middleware, the app still authenticates in layouts; only the early `/dashboard` redirect would need a rewrite.
- **bcryptjs / pdf-lib / Stripe / Resend:** JS libraries; they rely on Workers `nodejs_compat`.
- **Incremental cache:** default OpenNext in-memory cache. Optional R2 binding documented above.
- **`next/image` optimization:** not used on the marketing pages. Cloudflare Images binding is not required.
- **Server Actions:** `next.config.ts` allows CSRF origins for `invoiceflowstudio.com` and `*.workers.dev` (Cloudflare preview URLs).
- `npm run cf:build` regenerates the Prisma client from your local `.env` afterward so SQLite `npm run dev` keeps working.

## Notes

- Public share URLs are unguessable tokens. Anyone with the link can view the document.
- This is not legal, tax, or payment-processing advice. ToS/Privacy pages are stubs.
- Invoice **payments from clients** are not collected in this MVP. Subscriptions are for InvoiceFlow Pro.
