# InvoiceFlow Studio

Fast invoices and estimates for freelancers and contractors — plus the studio templates designers, editors, and writers already use.

Live domain: **[invoiceflowstudio.com](https://invoiceflowstudio.com)**

This is a focused Micro-SaaS MVP, not an accounting suite. Create from studio templates, send a PDF or shareable link, and track paid / unpaid / approved.

## What you get

- Marketing landing + pricing + `/estimates` + Terms/Privacy stubs
- Auth: email/password (works with zero API keys), optional GitHub OAuth, optional Resend magic link
- Dashboard: invoices, estimates, clients, studio settings, billing
- Invoice editor (client, line items, tax, notes, due date, status)
- Estimate editor (line items, markup, tax, attachments list, online approve with a typed name)
- PDF download + public share pages (opened + approved notifications)
- Filters on invoice and estimate lists
- Free vs Pro limits in code: **Starter = 3 invoices and 3 estimates per month; Pro = unlimited at $24/mo**
- QuickBooks Online **settings placeholder** (Intuit app client id/secret required for live OAuth — not in this release)
- Stripe Checkout + Customer Portal + webhook (test keys locally, live keys in production). Local demo upgrade if Stripe keys are missing
- Cloudflare Workers deploy via the **OpenNext** adapter (`@opennextjs/cloudflare`)

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 · shadcn-style UI · Prisma · Auth.js v5 · Stripe · Resend (optional) · OpenNext on Cloudflare Workers

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
| `STRIPE_SECRET_KEY` | optional test key | **runtime secret** `sk_test_…` or `sk_live_…` | Checkout disabled |
| `STRIPE_PRO_PRICE_ID` | optional | **runtime secret** `price_…` in the **same mode** as the secret | Same |
| `STRIPE_WEBHOOK_SECRET` | from Stripe CLI | **runtime secret** `whsec_…` from the matching-mode endpoint | Webhook route returns 501 |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | unused | unused | Not read by Checkout or the Billing button |
| `AUTH_DEV_MODE` | `true` | **`false`** | Production hides login demo credentials and “Unlock Pro for local demo” |
| `INTUIT_CLIENT_ID` / `INTUIT_CLIENT_SECRET` | optional | optional Worker secrets | Settings shows Connect QuickBooks; live OAuth is not in this release |
| `INTUIT_REDIRECT_URI` | optional | optional | Defaults to `{APP_URL}/dashboard/settings` |

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

### Estimates columns (required after the Estimates / PR #23 deploy)

`/dashboard/estimates` queries every `Proposal` scalar. If production Postgres was pushed **before** Estimates landed, it is missing `taxRate`, `markupRate`, `viewedAt`, `signedName`, `signedAt`, and `attachments`. Prisma then throws, and Cloudflare shows **This page couldn’t load** (error id like `158536238`) instead of the list.

This build still **loads the page** from the older columns (markup / opened / attachments stay empty). To restore the full Estimates schema, run this **from a laptop** (Prisma uses TCP; the Worker cannot push). No Worker redeploy is required for the SQL itself:

```bash
cd /path/to/invoiceflow
# Neon: DIRECT / unpooled host — NOT the *-pooler.* URL used by the Worker
export DATABASE_URL="postgresql://USER:PASSWORD@ep-XXXX.us-east-1.aws.neon.tech/neondb?sslmode=require"
# If you keep both URLs in .env, db:push:prod prefers DATABASE_URL_UNPOOLED automatically:
# export DATABASE_URL_UNPOOLED="$DATABASE_URL"

npm run db:push:prod
```

That script is `node scripts/prisma.mjs db push --require-postgres`. It refuses SQLite.

SQL-only equivalent (Postgres, idempotent): `prisma/add-estimate-columns.sql`

Then reload `https://invoiceflowstudio.com/dashboard/estimates`. Creating or approving estimates that write the new columns still needs this push.

Then seed production only if you want the demo user (skip for a real launch):

```bash
DATABASE_URL="postgresql://…" npm run db:seed
```

The app uses Prisma **driver adapters** at runtime so Postgres works on Cloudflare Workers (no query-engine binary, no `file:./dev.db`):

- **Neon** hosts → `@prisma/adapter-neon` **HTTP** (`PrismaNeonHTTP`), created **lazily on first query** so Worker secrets exist on `process.env`
- **Supabase / generic Postgres** → `@prisma/adapter-pg` + `pg` over Workers `nodejs_compat`
- Cloudflare `prisma generate` sets `engineType = "client"` (rust-free). `npm run cf:build` then copies `query_compiler_bg.wasm` next to the Worker and imports it as a Wrangler `CompiledWasm` module (Prisma’s Node `fs.readFileSync` path is missing from the `/bundle` FS). Local SQLite `npm run setup` does not — it still uses the default Prisma client with no adapter

`DATABASE_URL` must be a **runtime** Worker secret (not only a build variable). Signup is the first path that queries Postgres; marketing pages do not. If the secret is missing at runtime, `/login` now says so instead of a generic create failure. Neon pooled URLs that include `channel_binding=require` are sanitized for the HTTP adapter (`sslmode=require` is kept).

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

**MUST set Build variable `PRISMA_PROVIDER=postgresql`.** Without it, `npm install` / `prisma generate` can emit a SQLite client that is then bundled into the Worker. Runtime `DATABASE_URL` pointing at Neon cannot fix a SQLite client. `npm run cf:build` also forces Postgres generate (even if Build `DATABASE_URL` is missing or `file:./dev.db`). The real Neon pooled URL still belongs on **runtime** secrets.

Do this in the Cloudflare dashboard — the agent cannot click it for you:

1. Open [Workers & Pages](https://dash.cloudflare.com/?to=/:account/workers-and-pages).
2. **Create** → **Workers** → **Connect to Git** (GitHub) → authorize the `iglooo2/invoiceflow` repo.
3. Production branch: `main` (after this PR merges).
4. Build settings:
   - **Root directory:** `/` (repo root)
   - **Build command:** `npm run cf:build` (forces a Postgres Prisma client, then OpenNext)
   - **Deploy command:** `npx wrangler deploy` (`wrangler.jsonc` sets `keep_vars: true` so dashboard plaintext vars are not deleted)
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
   | `STRIPE_SECRET_KEY` | Secret (**runtime**) | `sk_live_…` for production charges |
   | `STRIPE_WEBHOOK_SECRET` | Secret (**runtime**) | Live endpoint `whsec_…` |
   | `STRIPE_PRO_PRICE_ID` | Secret (**runtime**) | Live-mode `price_…` (Dashboard Live toggle). Must be encrypted — a plaintext Variable is wiped on Git deploy if `keep_vars` is off. Never put the live id in the repo. |
   | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | unused | Do not rely on this — see Stripe section |
   | `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | Secret | if using GitHub login |
   | `AUTH_RESEND_KEY` | Secret | if using magic links |
   | `EMAIL_FROM` | Variable | `InvoiceFlow Studio <noreply@invoiceflowstudio.com>` |

   Also add **`PRISMA_PROVIDER=postgresql` as a Build variable** (required). `npm run cf:build` now runs `prisma generate` in Postgres mode even if Build `DATABASE_URL` is missing or still `file:./dev.db`. The real Neon URL must still be a **runtime** secret. Optionally set Build `DATABASE_URL` to any `postgresql://…` placeholder; do not rely on SQLite at build time.

   **Why Stripe price id must be a Secret:** `wrangler deploy` (Workers Builds / `npm run deploy`) uploads `wrangler.jsonc` `vars` as the complete plaintext set. That file only declares `NEXTJS_ENV=production`, so a dashboard **Variable** named `STRIPE_PRO_PRICE_ID` is deleted and Billing shows “Stripe isn’t wired yet”. Encrypted **Secrets** (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and now `STRIPE_PRO_PRICE_ID`) are not replaced. `keep_vars: true` in `wrangler.jsonc` also keeps other dashboard Variables (`AUTH_URL`, `EMAIL_FROM`, …). Do not put a live `price_…` in the repo.

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

## Stripe (test locally, live on Workers)

Checkout is a **server action** (`startProCheckout` → `stripe.checkout.sessions.create`). The Billing button label follows the **runtime** `STRIPE_SECRET_KEY` prefix (`sk_test_` vs `sk_live_` / restricted `rk_test_` / `rk_live_`). `AUTH_*` is not used for Stripe mode. `AUTH_DEV_MODE` only shows the local “Unlock Pro” demo button.

### Build vs Runtime on Cloudflare / OpenNext

| Variable | When it is read | Notes |
|---|---|---|
| `STRIPE_SECRET_KEY` | **Runtime** Worker secret | Preferred via `getCloudflareContext()`. Do not rely on a Build var — Next may inline an empty/placeholder `process.env` at `cf:build`. |
| `STRIPE_PRO_PRICE_ID` | **Runtime** Worker secret | Encrypted secret, same as the Stripe key. Must be created in the **same** Stripe mode as the secret. A test `price_…` with `sk_live_` fails (`No such price`). A dashboard **plaintext Variable** is deleted on `wrangler deploy` because `wrangler.jsonc` `vars` only lists `NEXTJS_ENV` — Secrets survive. |
| `STRIPE_WEBHOOK_SECRET` | **Runtime** Worker secret | Live Dashboard endpoint for production; Stripe CLI `whsec_…` locally. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | **Not used** | This app never calls Stripe.js. Setting `pk_live_…` as a Runtime var will **not** change the Billing button or Checkout. If you later add client Stripe.js, `NEXT_PUBLIC_*` **must be a Build variable** — Next.js inlines it into the client bundle at `next build` / `npm run cf:build`. |
| `NEXT_PUBLIC_APP_URL` | Build inlines if referenced; runtime fallback is `AUTH_URL` then `https://invoiceflowstudio.com` | Used for Checkout `success_url` / `cancel_url`. |
| `PRISMA_PROVIDER` | **Build** (required) | Unrelated to Stripe; still required so Prisma is Postgres. |

Changing live Stripe secrets on **Runtime** does **not** require a rebuild. After this deploy, Billing shows “Upgrade with Stripe (test mode)” only when the Worker secret is `sk_test_` / `rk_test_`.

### Live mode checklist

1. In the Stripe Dashboard, switch to **Live** (not Test).
2. Create product “InvoiceFlow Pro” with a **$24/month** recurring **live** price. Copy that `price_…` (it is not the test-mode id).
3. Set Worker **encrypted runtime secrets** (Settings → Variables and Secrets → Secret, not Variable): `STRIPE_SECRET_KEY=sk_live_…`, `STRIPE_PRO_PRICE_ID=<live price>`, `STRIPE_WEBHOOK_SECRET` from a Live endpoint at `https://invoiceflowstudio.com/api/stripe/webhook`. If `STRIPE_PRO_PRICE_ID` already exists as a plaintext Variable, delete it and re-add it as a Secret so preview `versions upload` cannot wipe it.
4. You do not need `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` for Checkout.
5. Accounts that already clicked Upgrade under test keys may have a test `cus_…` stored. Checkout now creates a new customer if Stripe returns “No such customer”.
6. Live accounts often have **Managed Payments** on by default. Checkout writes Stripe tax code `txcd_10103001` (SaaS — business use) onto the Pro product when it is missing. If Stripe still rejects the session, Checkout retries with `managed_payments[enabled]=false` so Upgrade can complete without a Dashboard tax-code edit.

If Checkout still fails, Billing shows a mapped error (bad key, wrong-mode price, leftover customer, missing tax code, network) or the fallback **Couldn’t complete the Stripe request (Name Code)** from `stripeFailureMessage` — check Worker logs for the raw Stripe error.

### Local test-mode steps

1. Create a Stripe account and switch to **Test mode**.
2. Create a product “InvoiceFlow Pro” with a **$24/month** recurring price. Copy the `price_...` id.
3. Copy test secret + price id into `.env`.
4. Install the [Stripe CLI](https://docs.stripe.com/stripe-cli) and run:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

5. Paste the CLI `whsec_...` into `STRIPE_WEBHOOK_SECRET`.
6. In the app: Billing → Upgrade with Stripe (test mode). Card: `4242 4242 4242 4242`, any future expiry, any CVC.

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
| `npm test` | Money, plan limits, DB URL/adapter helpers, invoice/estimate form parsing, sequential Neon HTTP writes, Prisma postgres engine rewrite, Workers-safe PDF writer |

## Demo path (no paid keys)

1. `npm run setup && npm run dev`
2. Sign in as `demo@invoiceflow.dev` / `demo1234`
3. Open the seeded invoice, copy the public link, download PDF
4. Dashboard → template card → create a Design Project Invoice or Job Estimate
5. Open `/estimates` on the marketing site, then Settings → Connect QuickBooks (placeholder)
6. Billing → Unlock Pro for local demo (optional)

## QuickBooks Online (not live yet)

InvoiceFlow Studio can show the Connect QuickBooks story in Settings and on `/estimates`. Live Intuit OAuth is deferred until an Intuit developer app exists.

1. Create an app in the [Intuit developer portal](https://developer.intuit.com/).
2. Set redirect URI to `https://invoiceflowstudio.com/dashboard/settings` (or your preview URL).
3. Add Worker **secrets** `INTUIT_CLIENT_ID` and `INTUIT_CLIENT_SECRET` (optional `INTUIT_REDIRECT_URI`).
4. Run `npm run db:push:prod` after deploy so estimate columns exist. Invoices, auth, and Stripe billing are unchanged.

## Cloudflare / Workers notes

- **OpenNext vs vinext:** Cloudflare’s newest Next.js path is [vinext](https://developers.cloudflare.com/workers/frameworks/framework-guides/nextjs/). This repo uses **`@opennextjs/cloudflare`** (still a documented Workers path) so we keep the App Router + `next build` toolchain.
- **Prisma:** production uses the rust-free client engine + driver adapters (no query-engine binary on Workers). The Prisma client is a lazy proxy so `DATABASE_URL` is read after OpenNext copies Worker secrets onto `process.env`. Local SQLite does not use an adapter. Neon HTTP **cannot run transactions**, so invoice/estimate saves insert the parent row and then each line/section as separate statements (no nested `create`, no `prisma.$transaction`). Signup stays a single `user.create`. Estimate **reads** retry without the new Proposal columns if Postgres has not been pushed yet, and render an in-page message instead of Cloudflare’s generic error page. After this release, run `npm run db:push:prod` so estimate columns (`taxRate`, `markupRate`, `viewedAt`, `signedName`, `signedAt`, `attachments`) exist on Postgres.
- **Signup / login check after deploy:** open `/login` → Create account with a new email and 8+ character password. You should land on `/dashboard`. Sign out, sign back in with the same credentials. If the form says **DATABASE_URL is missing at runtime**, add the Neon pooled URL under Worker **runtime** Variables and Secrets (not only build vars) and redeploy. If it mentions missing tables, run `npm run db:push:prod` from a laptop. If it mentions a SQLite Prisma client, set **Build** `PRISMA_PROVIDER=postgresql` and rebuild with `npm run cf:build`. `npm test` covers adapter selection, Neon URL sanitization (`channel_binding` / `sslmode`), Prisma error hints, and postgres generate without a real DATABASE_URL.
- **Save invoice check after deploy:** `/dashboard/invoices/new` → client name + line description → **Save invoice**. You should land on `/dashboard/invoices/[id]`, not Cloudflare’s generic “This page couldn’t load”. Validation and Prisma errors (including missing `Invoice` / `InvoiceItem` tables) render on the form. If the form says tables are missing or out of date, from a laptop run `npm run db:push:prod` against the Neon **direct/unpooled** URL (`DATABASE_URL_UNPOOLED` or `DATABASE_URL`), then retry save. `npm test` also covers invoice form parsing and sequential (non-transaction) writes.
- **`pg-cloudflare`:** OpenNext’s package copy does not include `pg-cloudflare`’s `workerd` build. `open-next.config.ts` sets `useWorkerdCondition: false` so `pg` uses `nodejs_compat` sockets. Prefer **Neon HTTP** in production to avoid that path.
- **Node.js middleware:** Next.js 16 `proxy.ts` (dashboard cookie gate) is **experimental** on Cloudflare OpenNext. Do not set `export const runtime = "edge"` — OpenNext expects the Node.js runtime. If a future OpenNext release rejects Node middleware, the app still authenticates in layouts; only the early `/dashboard` redirect would need a rewrite.
- **bcryptjs / Stripe / Resend:** JS libraries; they rely on Workers `nodejs_compat`.
- **PDF download:** invoices and estimates are written as PDF 1.4 in `lib/pdf.ts` using the 14 standard Type1 fonts (no embedding, no `pdf-lib`, no `Buffer` copies). That keeps Download PDF inside Workers CPU/memory limits (Error 1102). Public share pages also print cleanly if a client uses the browser “Save as PDF” dialog. Very large documents still have the 128 MB isolate cap; typical freelance invoices stay tiny.
- **Incremental cache:** default OpenNext in-memory cache. Optional R2 binding documented above.
- **`next/image` optimization:** not used on the marketing pages. Cloudflare Images binding is not required.
- **Server Actions:** `next.config.ts` allows CSRF origins for `invoiceflowstudio.com` and `*.workers.dev` (Cloudflare preview URLs).
- `npm run cf:build` regenerates the Prisma client from your local `.env` afterward so SQLite `npm run dev` keeps working.

## Notes

- Public share URLs are unguessable tokens. Anyone with the link can view the document.
- This is not legal, tax, or payment-processing advice. ToS/Privacy pages are stubs.
- Invoice **payments from clients** are not collected in this MVP. Subscriptions are for InvoiceFlow Pro.
