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
- Supabase schema for `profiles`, `trades`, `rules`, `ai_analysis`, and `sessions`

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

1. Create a Supabase project.
2. Open the SQL editor.
3. Run [supabase/schema.sql](./supabase/schema.sql).
4. Confirm the `chart-screenshots` storage bucket exists.
5. Add your Supabase URL and anon key to `.env.local`.

The app will run in demo mode without Supabase variables, but real auth and persistence require Supabase.

## AI Setup

Add `OPENAI_API_KEY` to enable OpenAI analysis. Without it, TradeGuardian returns deterministic mock coaching feedback so the product flow remains usable during local development.

## Verification

```bash
npx tsc --noEmit
npm run build
```

This Windows workspace currently needs Webpack mode for Next builds, so the build script uses `next build --webpack`.
