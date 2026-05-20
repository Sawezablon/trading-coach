# Qyvex Edge

Qyvex is the parent brand. Qyvex Edge is the first product: an MVP SaaS app for traders who want to follow their own rules more consistently.

Qyvex Edge is not a trading bot, signal provider, prediction platform, broker integration, or copy-trading tool. It is a discipline assistant, AI trading journal, rule violation detector, and execution coach.

## V1.0 Features

- Supabase Auth signup/login flow
- Protected dashboard shell
- Adaptive command center with review mode, risk mode, account health, and next-best action
- Dashboard analytics for discipline, rule pressure, monthly plan tracking, review debt, risk efficiency, and P/L
- Trade journal with trade details, edit, close, outcome, and delete flows
- Chart screenshot upload flow with trade notes, pair, risk, RR, session, selected emotions, and confirmation status
- Rules settings for system checks and user checklist rules
- Performance Plan settings for monthly targets, drawdown limits, trade caps, and review standards
- In-app feedback reports for bugs, confusing UX, and improvement ideas
- Deterministic rule engine for checklist pass/fail and MT5 system-review checks
- MT5 read-only sync foundation with multi-account support, duplicate protection, manual resync requests, and imported-trade review workflow
- AI analysis pipeline using OpenAI when configured
- Mock AI responses when `OPENAI_API_KEY` is missing
- Supabase schema for `profiles`, `trades`, `trading_rules`, `performance_plans`, `ai_analysis`, `mt5_connections`, `mt5_sync_requests`, and `feedback_reports`

## Tech Stack

- Next.js App Router
- TypeScript
- TailwindCSS
- shadcn/ui
- Supabase Auth, database, storage
- OpenAI API
- Vercel-ready deployment shape

## Getting Started

Install dependencies:

```bash
npm install
```

Create environment variables:

```bash
cp .env.example .env.local
```

Fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Run the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Supabase Setup

### 1. Create and link a project

Create a new project from the Supabase dashboard, then install/login to the Supabase CLI if needed:

```bash
npm install -g supabase
supabase login
```

Link this repo to your Supabase project:

```bash
supabase link --project-ref YOUR_PROJECT_REF
```

`YOUR_PROJECT_REF` is the short ref in your Supabase project URL, for example `abcdefghijklmno`.

### 2. Apply database migrations

Run all migrations in [supabase/migrations](./supabase/migrations):

```bash
supabase db push
```

This creates and updates:

- `profiles`
- `trades`
- `trading_rules`
- `performance_plans`
- `ai_analysis`
- `mt5_connections`
- `mt5_sync_requests`
- `feedback_reports`
- chart screenshot storage policies
- trade lifecycle fields
- trade timezone support
- checklist fields
- MT5 sync fields, risk estimation fields, and system review data
- selected MT5 account context
- performance plan targets
- `updated_at` triggers
- Row Level Security policies
- indexes for user-owned dashboard and journal queries
- an auth trigger that creates a `profiles` row, default `trading_rules`, and default `performance_plans` row when a user signs up

If you prefer the dashboard SQL editor, paste and run [supabase/schema.sql](./supabase/schema.sql) instead.

### 3. Configure Auth

In Supabase Dashboard:

1. Go to **Authentication > URL Configuration**.
2. For local development, set **Site URL** to `http://localhost:3000`.
3. For production, set **Site URL** to `https://qyvexedge.com`.
4. Add redirect URLs:

```text
http://localhost:3000/**
https://qyvexedge.com/**
https://www.qyvexedge.com/**
```

Qyvex Edge passes an explicit redirect URL for signup confirmation, Google OAuth, and password reset emails using `NEXT_PUBLIC_APP_URL`. If Supabase emails are opening `localhost`, check both **Site URL** in Supabase and `NEXT_PUBLIC_APP_URL` in Vercel.

Email/password auth is enough for this MVP. Google login can be enabled in Supabase Auth providers when needed.

### 4. Create storage bucket

In Supabase Dashboard:

1. Go to **Storage**.
2. Create a bucket named `chart-screenshots`.
3. Set it to public for MVP screenshot previews.

The current API stores chart screenshots at:

```text
chart-screenshots/{user_id}/{random_file_name}
```

### 5. Add environment variables

In Supabase Dashboard, go to **Project Settings > API** and copy:

- Project URL
- anon public key
- service role key

Then fill `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
OPENAI_API_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Restart the dev server after changing env vars:

```bash
npm run dev
```

The app will run in demo mode without Supabase variables, but real auth and persistence require Supabase.

For Vercel production, set:

```bash
NEXT_PUBLIC_APP_URL=https://qyvexedge.com
NEXT_PUBLIC_MT5_SYNC_URL=https://sync.qyvexedge.com/api/mt5/sync
```

Feedback submitted in-app is stored in `feedback_reports`. Users can see reports submitted from their own account in
**Settings > Feedback**. For V1.0, owner-wide triage can be reviewed directly in Supabase.

## AI Setup

Add `OPENAI_API_KEY` to enable OpenAI analysis. Without it, Qyvex Edge returns deterministic mock coaching feedback so the product flow remains usable during local development.

## Verification

```bash
npx tsc --noEmit
npm run lint -- --no-errors-on-unmatched
npm run build
```

This Windows workspace currently needs Webpack mode for Next builds, so the build script uses `next build --webpack`.

## V1.0 Release Checklist

Before calling a deployment production-ready:

1. Apply every Supabase migration through `supabase db push` or the dashboard SQL editor.
2. Confirm the `performance_plans` table exists in Supabase. The dashboard can fall back to a default plan, but saving Performance Plan settings requires the table.
3. Confirm the `chart-screenshots` bucket exists and is public for MVP previews.
4. In Supabase Auth, set production redirect URLs:

```text
Site URL: https://qyvexedge.com

https://qyvexedge.com/**
https://www.qyvexedge.com/**
```

5. In Vercel, set the production environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
NEXT_PUBLIC_APP_URL=https://qyvexedge.com
NEXT_PUBLIC_MT5_SYNC_URL=https://sync.qyvexedge.com/api/mt5/sync
```

6. Confirm the MT5 sync domain is configured in Vercel and DNS:

```text
https://sync.qyvexedge.com
```

7. Smoke test the core flow:

- Create account
- Log out and log back in
- Generate MT5 connection key
- Sync MT5 trades through the EA
- Confirm imported trades appear in Journal
- Review an imported trade
- Set Trading Rules
- Set Performance Plan
- Confirm Dashboard loads without server errors
- Open Settings > Feedback inbox and confirm reports can be read
- Confirm `/privacy`, `/terms`, and `/disclaimer` load
- Delete a test trade

## MT5 Sync Developer Test

Start the app locally:

```bash
npm run dev
```

In another terminal, run:

```bash
npm run test:mt5-sync
```

The script seeds a development MT5 API key for a Supabase user, sends:

- 1 open trade
- 1 closed winning trade
- 1 closed losing trade

Then it sends the same payload again and verifies duplicate sync updates the existing trades instead of creating duplicates. It also checks the synced trades match the journal lifecycle states and dashboard metrics.

Optional environment variables:

```bash
MT5_TEST_USER_EMAIL=your-test-user@example.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
MT5_TEST_HTTP=1
```

If `MT5_TEST_USER_EMAIL` is not set, the script uses the first Supabase auth user in the project. By default the script tests the shared sync handler directly so it matches your local code; set `MT5_TEST_HTTP=1` when you specifically want it to POST to `NEXT_PUBLIC_APP_URL`.

## MT5 Expert Advisor Setup

The read-only Expert Advisor is available at:

```text
mt5/QyvexEdgeSyncEA.mq5
public/downloads/QyvexEdgeSyncEA.mq5
```

To install it:

1. In MetaTrader 5, open **File > Open Data Folder**.
2. Copy `QyvexEdgeSyncEA.mq5` into `MQL5/Experts`.
3. Open MetaEditor and compile the EA.
4. In MT5 Navigator, right-click **Expert Advisors** and select **Refresh**.
5. Attach **QyvexEdgeSyncEA** to any chart.
6. In Qyvex Edge, open **Settings > MT5 Sync**, generate an API key, and copy the Sync URL.
7. In the EA inputs, set:

```text
QyvexApiKey = your generated API key
SyncUrl = https://sync.qyvexedge.com/api/mt5/sync
SyncIntervalMinutes = 5
InitialHistoryLookbackDays = 365
SyncOverlapMinutes = 10
ClosedTradeDetailLookupDays = 30
```

Before the EA can send data, enable WebRequest in MetaTrader:

1. Go to **Tools > Options > Expert Advisors**.
2. Enable **Allow WebRequest for listed URL**.
3. Add your Qyvex domain URL, for example:

```text
https://sync.qyvexedge.com
```

Keep the public app on `https://qyvexedge.com`. The dedicated `sync.qyvexedge.com` endpoint is used for MT5 WebRequest traffic.

The EA is read-only. On first run, it sends closed trade history from `InitialHistoryLookbackDays`. After a successful sync, it stores the last successful sync time locally in MT5, then future syncs send open positions plus closed deals since the last successful sync minus `SyncOverlapMinutes`. For closed trades, `ClosedTradeDetailLookupDays` lets the EA look farther back to recover the original entry price, stop loss, and take profit for trades that were opened before the latest sync window. If MT5 is closed for days, the next launch catches up from the last successful sync. Qyvex Edge handles duplicate MT5 tickets by updating the existing journal row.

If synced MT5 trades are deleted from Qyvex, open **Settings > MT5 Sync** and click **Request 365-day resync**. The EA checks for pending resync requests on every sync, sends the requested history once, and Qyvex marks the request completed after receiving it.
