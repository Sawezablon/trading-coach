# Qyvex Edge

Qyvex is the parent brand. Qyvex Edge is the first product: an MVP SaaS app for traders who want to follow their own rules more consistently.

Qyvex Edge is not a trading bot, signal provider, prediction platform, broker integration, or copy-trading tool. It is a discipline assistant, AI trading journal, rule violation detector, and execution coach.

## MVP Features

- Supabase Auth signup/login flow
- Protected dashboard shell
- Dashboard metrics for open trades, closed trades, win rate, rule violations, discipline, and P/L
- Trade journal with trade details, edit, close, outcome, and delete flows
- Chart screenshot upload flow with trade notes, pair, risk, RR, session, selected emotions, and confirmation status
- Rules settings for max risk, minimum RR, allowed sessions, allowed pairs, confirmation requirement, strict mode, and max trades per day
- Deterministic rule engine for checklist pass/fail checks
- AI analysis pipeline using OpenAI when configured
- Mock AI responses when `OPENAI_API_KEY` is missing
- Supabase schema for `profiles`, `trades`, `trading_rules`, and `ai_analysis`

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
- `ai_analysis`
- chart screenshot storage policies
- trade lifecycle fields
- trade timezone support
- checklist fields
- `updated_at` triggers
- Row Level Security policies
- indexes for user-owned dashboard and journal queries
- an auth trigger that creates a `profiles` row and default `trading_rules` row when a user signs up

If you prefer the dashboard SQL editor, paste and run [supabase/schema.sql](./supabase/schema.sql) instead.

### 3. Configure Auth

In Supabase Dashboard:

1. Go to **Authentication > URL Configuration**.
2. Set **Site URL** to `http://localhost:3000` for local development.
3. Add redirect URLs:

```text
http://localhost:3000/**
https://YOUR_VERCEL_DOMAIN/**
```

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

## AI Setup

Add `OPENAI_API_KEY` to enable OpenAI analysis. Without it, Qyvex Edge returns deterministic mock coaching feedback so the product flow remains usable during local development.

## Verification

```bash
npx tsc --noEmit
npm run build
```

This Windows workspace currently needs Webpack mode for Next builds, so the build script uses `next build --webpack`.

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
```

If `MT5_TEST_USER_EMAIL` is not set, the script uses the first Supabase auth user in the project.

## MT5 Expert Advisor Setup

The read-only Expert Advisor is available at:

```text
mt5/QyvexEdgeSyncEA.mq5
```

To install it:

1. In MetaTrader 5, open **File > Open Data Folder**.
2. Copy `QyvexEdgeSyncEA.mq5` into `MQL5/Experts`.
3. Open MetaEditor, compile the EA, then attach it to any chart.
4. In Qyvex Edge, open **Settings > MT5 Sync**, generate an API key, and copy the Sync URL.
5. In the EA inputs, set:

```text
QyvexApiKey = your generated API key
SyncUrl = https://trading-coach-six.vercel.app/api/mt5/sync
SyncIntervalMinutes = 5
```

Before the EA can send data, enable WebRequest in MetaTrader:

1. Go to **Tools > Options > Expert Advisors**.
2. Enable **Allow WebRequest for listed URL**.
3. Add your Qyvex domain URL, for example:

```text
https://trading-coach-six.vercel.app
```

The EA is read-only. It collects open positions and recently closed deals, sends them to Qyvex Edge, and never places, modifies, or closes trades.
