# TradeGuardian AI

TradeGuardian AI is an MVP SaaS app for traders who want to follow their own rules more consistently. It is not a trading bot, signal provider, prediction platform, broker integration, or copy-trading tool.

The product is a discipline assistant, AI trading journal, rule violation detector, and execution coach.

## MVP Features

- Supabase Auth signup/login flow
- Protected dashboard shell
- Dashboard metrics for total trades, win rate, rule violations, best setup, and discipline score
- Trade journal with recent trades and trade detail pages
- Chart screenshot upload flow with trade notes, pair, risk, RR, session, emotions, and confirmation status
- Rules settings for max risk, minimum RR, allowed sessions, confirmation requirement, and max trades per day
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

Run the migration in [supabase/migrations/202605130001_create_tradeguardian_core.sql](./supabase/migrations/202605130001_create_tradeguardian_core.sql):

```bash
supabase db push
```

This creates:

- `profiles`
- `trades`
- `trading_rules`
- `ai_analysis`
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

Email/password auth is enough for this MVP.

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

Add `OPENAI_API_KEY` to enable OpenAI analysis. Without it, TradeGuardian returns deterministic mock coaching feedback so the product flow remains usable during local development.

## Verification

```bash
npx tsc --noEmit
npm run build
```

This Windows workspace currently needs Webpack mode for Next builds, so the build script uses `next build --webpack`.
