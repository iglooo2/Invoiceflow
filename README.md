# InvoiceFlow

Fast, beautiful invoices and proposals for freelance creatives — designers, video editors, and writers who hate making them by hand.

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
- Stripe Checkout + Customer Portal + webhook (test mode). Local demo upgrade if Stripe keys are missing.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 · shadcn-style UI · Prisma + **SQLite locally** · Auth.js v5 · Stripe · Resend (optional) · pdf-lib

SQLite is the zero-config local default so `npm run setup && npm run dev` works without Docker. For production, point `DATABASE_URL` at Postgres and change `provider` in `prisma/schema.prisma` to `postgresql`, then `npx prisma db push`.

## Setup

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

Seed also loads:

- Design Project Invoice
- Retainer Invoice
- Video Edit Proposal
- Sample invoice + proposal for Studio North

### Environment variables

See `.env.example`. Placeholders only — never commit real secrets.

| Variable | Required locally? | What happens if missing |
|---|---|---|
| `DATABASE_URL` | Yes (`file:./dev.db`) | App cannot store data |
| `AUTH_SECRET` | Yes in production | Dev fallback exists; generate a real one before deploy |
| `AUTH_URL` / `NEXT_PUBLIC_APP_URL` | Recommended | Defaults to `http://localhost:3000` |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | No | GitHub button hidden |
| `AUTH_RESEND_KEY` / `EMAIL_FROM` | No | Magic-link sign-in hidden; “email share link” logs to the server console instead of sending |
| `STRIPE_SECRET_KEY` | No | Billing UI still works; Checkout disabled |
| `STRIPE_PRO_PRICE_ID` | No | Same |
| `STRIPE_WEBHOOK_SECRET` | No | Webhook route returns 501 |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | No | Not required for server Checkout |
| `AUTH_DEV_MODE` | Defaults on | Shows “Unlock Pro for local demo” |

## Stripe test-mode steps

1. Create a Stripe account and switch to **Test mode**.
2. Create a product “InvoiceFlow Pro” with a **$24/month** recurring price. Copy the `price_...` id.
3. Copy test secret + publishable keys into `.env`.
4. Install the [Stripe CLI](https://docs.stripe.com/stripe-cli) and run:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

5. Paste the CLI `whsec_...` into `STRIPE_WEBHOOK_SECRET`.
6. In the app: Billing → Upgrade with Stripe. Card: `4242 4242 4242 4242`, any future expiry, any CVC.
7. Webhook events handled: `checkout.session.completed`, `customer.subscription.created|updated|deleted`.

Without Stripe keys, keep `AUTH_DEV_MODE=true` and use **Unlock Pro for local demo**.

## Scripts

| Script | Purpose |
|---|---|
| `npm run setup` | `prisma generate` + `db push` + seed |
| `npm run dev` | Next.js dev server (Turbopack) |
| `npm run build` | Production build |
| `npm test` | Money + plan-limit unit tests |
| `npm run db:reset` | Wipe SQLite and re-seed |

## Demo path (no paid keys)

1. `npm run setup && npm run dev`
2. Sign in as `demo@invoiceflow.dev` / `demo1234`
3. Open the seeded invoice, copy the public link, download PDF
4. Dashboard → template card → create a Design Project Invoice
5. Billing → Unlock Pro for local demo (optional)

## Notes

- Public share URLs are unguessable tokens. Anyone with the link can view the document.
- This is not legal, tax, or payment-processing advice. ToS/Privacy pages are stubs.
- Invoice **payments from clients** are not collected in this MVP (no Stripe Checkout on the public invoice). You track paid/unpaid yourself. Subscriptions are for InvoiceFlow Pro.
