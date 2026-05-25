# Lekka — Vyapara Ledger

> **లెక్క** · A private money-account tracking and reminder app for small business lenders.

A bilingual (Telugu + English) web app for tracking customer accounts, BC weekly repayment plans, monthly interest plans, payments, and polite reminders. Built for internal recordkeeping. Installable as a PWA.

---

## Features (Phase 1 MVP)

- 🔐 Google sign-in (Supabase OAuth) with email allowlist
- 👥 Customer directory with fast search by name or phone
- 📒 Two account types:
  - **BC Weekly Plan** — fixed weekly repayments (e.g. ₹50,000 over 10 weeks)
  - **Monthly Interest Plan** — principal + APR-based monthly interest
- 🗓️ Auto-generated installment schedules
- 💵 Full and partial payment entry with multiple methods (Cash, UPI, PhonePe, GPay, Paytm, Bank)
- 🏠 Mobile-first dashboard: Due Today, Overdue, Paid Today, Outstanding
- 📲 WhatsApp reminder buttons (opens WhatsApp with pre-filled message — no API needed)
- 📊 Reports with CSV export
- 🌐 Telugu / English language toggle
- 📷 Optional photo attachment for customer ID
- 📝 Audit log of payments and account edits
- 📱 Installable as a Progressive Web App

## Tech Stack

| Layer       | Tech                                    |
| ----------- | --------------------------------------- |
| Frontend    | React 18 + TypeScript + Vite            |
| Styling     | Tailwind CSS + shadcn/ui components     |
| State       | TanStack Query + Zustand                |
| Routing     | React Router v6                         |
| Database    | Supabase (Postgres)                     |
| Auth        | Supabase Auth                           |
| Forms       | React Hook Form + Zod                   |
| i18n        | i18next                                 |
| Dates       | date-fns                                |
| Icons       | Lucide React                            |
| Hosting     | Vercel (frontend) + Supabase (backend)  |

All free tier. Total monthly cost: ₹0.

---

## Quick start

### 1. Prerequisites

- Node.js 18+ and npm
- A free Supabase account → https://supabase.com
- A free Vercel account → https://vercel.com (only needed for deploy)

### 2. Clone and install

```bash
git clone <your-repo-url> lekka
cd lekka
npm install
```

### 3. Create your Supabase project

1. Go to https://supabase.com → **New project**
2. Pick a name (`lekka`), set a strong DB password, choose region close to India (e.g. Mumbai)
3. Wait ~2 min for it to provision

### 4. Run the database migrations

Open **SQL Editor** in Supabase and run, in order:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_rls_policies.sql`
3. `supabase/migrations/003_functions_and_triggers.sql`
4. (optional) `supabase/migrations/004_seed_data.sql` — sample customer + account for testing

### 5. Enable Google sign-in

Sign-in uses **Google OAuth** — uncle just taps "Continue with Google" and picks his Gmail. No passwords to remember.

**In your Google Cloud Console** (https://console.cloud.google.com):

1. Create or pick a project → **APIs & Services** → **Credentials**
2. **Create Credentials** → **OAuth client ID** → application type **Web application**
3. **Authorised redirect URIs** — add the callback URL from your Supabase project. You'll find the exact URL in **Supabase Dashboard → Authentication → Providers → Google → Callback URL**. It looks like:
   ```
   https://YOUR_PROJECT.supabase.co/auth/v1/callback
   ```
4. Save and copy the **Client ID** and **Client Secret**

**In Supabase Dashboard**:

1. **Authentication** → **Providers** → **Google** → toggle **Enabled**
2. Paste the **Client ID** and **Client Secret** from Google
3. Save

**In your local `.env.local` (and later in Vercel env vars)**, set the allowlist:

```
VITE_ADMIN_EMAILS=uncle@gmail.com,you@gmail.com
```

This is a frontend gate — only listed emails can sign in. Leave it empty during initial testing if you want, but **set it before going live** so a stranger guessing the URL can't reach the data. (Supabase RLS still scopes each user's data per `auth.uid`, so they wouldn't see uncle's records, but they'd be able to create their own — not what you want.)

### 6. Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` and paste from Supabase → **Project Settings** → **API**:

```
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
VITE_ADMIN_EMAILS=uncle@gmail.com
```

> ⚠️ Never commit `.env.local`. Never use the `service_role` key in the frontend — only the `anon` key.

### 7. Run locally

```bash
npm run dev
```

Open http://localhost:5173, click **Continue with Google**, pick uncle's account. The first sign-in creates the Supabase user automatically.

---

## Deploy to Vercel (free)

1. Push this repo to GitHub
2. Go to https://vercel.com → **Add New Project** → import the GitHub repo
3. Framework preset: **Vite**
4. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_ADMIN_EMAILS` — comma-separated allowlist (e.g. `uncle@gmail.com,you@gmail.com`)
5. Click **Deploy**

Your app will be live at `https://your-project.vercel.app` in ~1 minute.

**After the first deploy**, add the production URL to two places:

- **Google Cloud Console → OAuth client → Authorised redirect URIs**: the same `https://YOUR_PROJECT.supabase.co/auth/v1/callback` is already there from step 5 above, so no change needed unless you swap Supabase projects.
- **Supabase Dashboard → Authentication → URL Configuration → Site URL**: set to `https://your-project.vercel.app` (or your custom domain). Also add it to **Redirect URLs**.

To add a custom domain (₹500–800/year separately, optional): **Settings → Domains** in Vercel. Then update the Site URL above to match.

---

## Telugu notebook import (optional)

Your uncle's existing notebook entries can be imported a few ways. Pick what works:

### Option A — Manual entry (most reliable)
Just type them in. For a few dozen customers this is honestly fastest. The Customers page has a quick-add form designed for this.

### Option B — Printed Telugu OCR (free, runs in browser)
The app uses **Tesseract.js** with the Telugu language pack. Works well on printed/clear text. Open **Customers → Import → Scan**, upload a photo of the page, review the extracted text, then save.

### Option C — Handwritten Telugu OCR (more accurate, free tier)
Tesseract is poor at handwriting. For better results, the import screen also supports **Google Cloud Vision API** (`DOCUMENT_TEXT_DETECTION`). Free tier: 1,000 pages/month.

To enable: get an API key from https://console.cloud.google.com → enable the Vision API → add to `.env.local`:
```
VITE_GOOGLE_VISION_API_KEY=AIza...
```

The import screen will use Vision if the key is set, Tesseract otherwise.

> ⚠️ Vision OCR still needs review before saving. Always verify amounts and phone numbers — handwriting OCR makes mistakes.

---

## Project structure

```
lekka/
├── supabase/
│   └── migrations/         # Run these in order in Supabase SQL editor
├── public/
│   ├── manifest.webmanifest # PWA manifest
│   └── icons/
├── src/
│   ├── lib/                # Supabase client, currency, dates, i18n
│   ├── locales/            # en.json, te.json — translations
│   ├── types/              # Database types
│   ├── hooks/              # useAuth, useCustomers, useAccounts, etc.
│   ├── components/
│   │   ├── layout/         # AppLayout, SidebarNavigation
│   │   ├── ui/             # shadcn primitives (Button, Input, Dialog, ...)
│   │   ├── dashboard/      # DashboardCards, DueTodayTable, OverdueTable
│   │   ├── customers/      # CustomerForm, CustomerSearch
│   │   ├── accounts/       # BCWeeklyForm, MonthlyInterestForm, InstallmentPreviewTable
│   │   ├── payments/       # PaymentModal
│   │   ├── reminders/      # WhatsAppReminderButton
│   │   └── shared/         # StatusBadge, CsvExportButton, LanguageToggle
│   ├── pages/              # One file per route
│   ├── App.tsx             # Routing
│   └── main.tsx            # Entry point
├── .env.example
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## Business rules implemented

### BC Weekly Plan
- Owner gives `amount_given` (e.g. ₹45,000)
- Customer repays `total_repayment_amount` (e.g. ₹50,000)
- Over `term_weeks` (default 10)
- `weekly_due = total_repayment_amount / term_weeks` (= ₹5,000)
- `profit = total_repayment_amount - amount_given` (= ₹5,000)
- On save, app creates `term_weeks` installment rows, one per week from `start_date`

### Monthly Interest Plan
- Customer holds `principal_amount` (e.g. ₹100,000)
- Pays interest each month at `apr` (default 24%)
- `monthly_interest = principal * apr / 12 / 100` (= ₹2,000)
- Each month, a new installment is generated for the interest (handled by a DB function — see `003_functions_and_triggers.sql`)
- Principal stays open until manually closed or reduced via a "Principal Payment" entry

### Payment posting
- Payment can be full (`= due_amount`) or partial (`< due_amount`)
- Updates `installments.paid_amount` and `status`:
  - `paid_amount >= due_amount` → `PAID`
  - `0 < paid_amount < due_amount` → `PARTIAL`
- Overpayment carries to next installment (configurable in `settings`)
- Every payment is logged in `audit_logs`

### Overdue
- Computed at read time: `due_date < today AND status IN ('PENDING','PARTIAL')`
- No background job needed for MVP

### Reminders
- WhatsApp only, manual trigger
- Opens `https://wa.me/<phone>?text=<encoded_message>` — no third-party API, completely free
- Templates are configurable in Settings, with placeholders `{customerName}`, `{amount}`, `{dueDate}`

---

## Security

- ✅ Row Level Security (RLS) enabled on every table
- ✅ Policies require `auth.uid()` — anonymous reads/writes are denied
- ✅ Only the `anon` key is in the frontend; the `service_role` key never leaves your Supabase dashboard
- ✅ Audit log captures every payment and account edit
- ✅ Soft delete on customers (`status='INACTIVE'`) rather than hard delete

For Phase 2 multi-user staff support, the `owner_user_id` column is already on each row — you just need to extend the RLS policies. See comments in `002_rls_policies.sql`.

---

## Scripts

```bash
npm run dev          # Local dev server with HMR
npm run build        # Production build → dist/
npm run preview      # Preview production build locally
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
```

---

## Phase 2 roadmap

Already scaffolded but not wired up:

- [ ] Automated WhatsApp reminders via WhatsApp Business Cloud API (free up to 1000 conversations/month)
- [ ] UPI transaction import via CSV
- [ ] Role-based access (admin vs. staff)
- [ ] Customer-facing payment status link (read-only, token-protected)
- [ ] Android wrapper via Capacitor
- [ ] Offline mode (TanStack Query persister + IndexedDB)
- [ ] Backup export to Google Drive

---

## License

Private — for personal/family business use. Not for redistribution.
