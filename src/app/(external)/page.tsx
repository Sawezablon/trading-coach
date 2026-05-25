"use client";

import Link from "next/link";

import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Brain,
  CheckCircle2,
  ClipboardList,
  Database,
  type LucideIcon,
  ShieldCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const navItems = [
  { label: "Product", href: "#product" },
  { label: "How it works", href: "#how-it-works" },
  { label: "MT5 Sync", href: "#mt5-sync" },
  { label: "Insights", href: "/insights" },
];

const productHighlights = [
  {
    title: "System checks",
    description: "MT5 facts and trade inputs are checked with deterministic logic before AI feedback runs.",
    icon: ClipboardList,
  },
  {
    title: "Trader checklist",
    description: "Confirm the personal rules only you can judge, from candle close to emotional state.",
    icon: CheckCircle2,
  },
  {
    title: "Behavior review",
    description: "See review debt, rule pressure, emotional patterns, and execution quality in one calm dashboard.",
    icon: Brain,
  },
];

const workflowSteps = [
  {
    title: "Connect MT5",
    description: "Use the read-only Expert Advisor to import account history without placing or modifying trades.",
  },
  {
    title: "Review decisions",
    description: "Complete the checklist, add notes, upload charts, and separate clean trades from pressure trades.",
  },
  {
    title: "Improve discipline",
    description: "Track whether your rules are actually being followed across sessions, pairs, and losing streaks.",
  },
];

const insightCards = [
  {
    title: "Why traders break rules after one loss",
    category: "Trading psychology",
    description: "A practical review framework for spotting revenge trading before it becomes a streak.",
  },
  {
    title: "How to review a losing streak",
    category: "Execution review",
    description: "Move from P/L emotions to facts: risk, rule pressure, setup quality, and recovery mode.",
  },
  {
    title: "Why Qyvex Edge is not a signal service",
    category: "Product principles",
    description: "The product exists to protect discipline, not to predict markets or tell traders what to buy.",
  },
];

const metrics = [
  { value: "0", label: "Signals generated" },
  { value: "100%", label: "Your rules first" },
  { value: "Read-only", label: "MT5 sync mode" },
];

const trendBars = [
  { id: "mon", height: 44 },
  { id: "tue", height: 58 },
  { id: "wed", height: 50 },
  { id: "thu", height: 72 },
  { id: "fri", height: 64 },
  { id: "sat", height: 82 },
  { id: "sun", height: 76 },
  { id: "next", height: 88 },
];

export default function Home() {
  return (
    <main className="min-h-dvh overflow-hidden bg-background text-foreground">
      <section className="relative px-5 pt-5 lg:px-14">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(circle_at_50%_0%,rgb(124_92_255_/_0.22),transparent_34rem)]" />
        <PublicNav />

        <div className="relative mx-auto grid max-w-7xl gap-10 py-16 lg:grid-cols-[1.04fr_0.96fr] lg:py-24">
          <div className="flex flex-col justify-center gap-8">
            <div className="space-y-6">
              <Badge variant="outline" className="w-fit border-primary/30 bg-primary/10 text-primary">
                AI Trading Discipline Assistant
              </Badge>
              <div className="space-y-4">
                <h1 className="max-w-3xl font-semibold text-5xl tracking-tight md:text-7xl">Qyvex Edge</h1>
                <p className="max-w-2xl font-medium text-2xl md:text-3xl">Stop Breaking Your Trading Rules</p>
              </div>
              <p className="max-w-2xl text-lg text-muted-foreground leading-8">
                A calm execution coach for traders who already have a plan. Sync trades, review decisions, detect rule
                pressure, and improve discipline without signals, predictions, or broker execution.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/auth/v2/register">
                  Start free
                  <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/auth/v2/login">Open dashboard</Link>
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {metrics.map((metric) => (
                <div key={metric.label} className="rounded-2xl border border-border/80 bg-card/50 p-4">
                  <div className="font-semibold text-2xl">{metric.value}</div>
                  <div className="mt-1 text-muted-foreground text-xs">{metric.label}</div>
                </div>
              ))}
            </div>
          </div>

          <DashboardPreview />
        </div>
      </section>

      <section id="product" className="border-border/80 border-y bg-secondary/30 px-5 py-16 lg:px-14">
        <div className="mx-auto max-w-7xl space-y-10">
          <SectionHeading
            eyebrow="Built for execution discipline"
            title="A trading journal that respects your edge."
            description="Qyvex Edge keeps the product focused: no noisy market theater, no alerts to chase, no social feed. Just structured review for the decisions you actually control."
          />
          <div className="grid gap-4 md:grid-cols-3">
            {productHighlights.map((item) => (
              <FeatureCard key={item.title} {...item} />
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="px-5 py-20 lg:px-14">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHeading
            eyebrow="How it works"
            title="From trade history to discipline clarity."
            description="The workflow is intentionally simple: connect the account, review the decisions, then watch the patterns that actually affect consistency."
          />
          <div className="grid gap-4">
            {workflowSteps.map((step, index) => (
              <div key={step.title} className="rounded-3xl border bg-card/70 p-5">
                <div className="flex gap-4">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{step.title}</h3>
                    <p className="mt-1 text-muted-foreground text-sm leading-6">{step.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="mt5-sync" className="px-5 pb-20 lg:px-14">
        <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="overflow-hidden border-primary/20 bg-card/70">
            <CardContent className="space-y-8 p-7">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-[#5EEAD4]/10 text-[#5EEAD4]">
                  <Database className="size-5" />
                </div>
                <div>
                  <Badge variant="outline">MT5 Sync</Badge>
                  <h2 className="mt-2 font-semibold text-3xl tracking-tight">Read-only trade import.</h2>
                </div>
              </div>
              <p className="max-w-3xl text-muted-foreground leading-7">
                Qyvex Edge imports trade facts from MetaTrader 5 so traders can spend less time typing and more time
                reviewing behavior. It does not place, modify, or close trades.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  "Open and closed trades",
                  "Broker and account separation",
                  "Risk estimate from balance and symbol specs",
                  "Review queue for imported trades",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2 rounded-2xl border bg-secondary/40 p-3 text-sm">
                    <CheckCircle2 className="size-4 text-[#22C55E]" />
                    {item}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/60">
            <CardContent className="space-y-4 p-7">
              <ShieldCheck className="size-8 text-primary" />
              <h3 className="font-semibold text-2xl">Not a signal platform.</h3>
              <p className="text-muted-foreground text-sm leading-6">
                Qyvex Edge does not predict markets, provide entries, copy trades, or execute orders. It helps traders
                follow their own plan and review what happened after the decision.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="border-border/80 border-y bg-secondary/30 px-5 py-16 lg:px-14">
        <div className="mx-auto max-w-7xl space-y-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <SectionHeading
              eyebrow="Insights"
              title="Useful thinking for disciplined traders."
              description="Short practical notes for trading psychology, prop firm pressure, risk review, and product updates."
            />
            <Button asChild variant="outline">
              <Link href="/insights">
                View insights
                <BookOpen />
              </Link>
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {insightCards.map((item) => (
              <Card key={item.title} className="bg-card/70 transition hover:border-primary/35">
                <CardContent className="space-y-4 p-6">
                  <Badge variant="outline">{item.category}</Badge>
                  <h3 className="font-semibold text-lg leading-6">{item.title}</h3>
                  <p className="text-muted-foreground text-sm leading-6">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-16 lg:px-14">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 rounded-3xl border border-primary/20 bg-card/70 p-8 md:flex-row md:items-center md:justify-between">
          <div>
            <Badge variant="outline" className="mb-4">
              Public beta
            </Badge>
            <h2 className="font-semibold text-3xl tracking-tight">Make discipline measurable.</h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Start with a journal built for rule-following, not prediction. Qyvex Edge is free while V1 improves.
            </p>
          </div>
          <Button asChild size="lg">
            <Link href="/auth/v2/register">
              Create account
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}

function PublicNav() {
  return (
    <nav className="relative mx-auto flex max-w-7xl items-center justify-between rounded-2xl border border-border/80 bg-card/60 px-4 py-3 backdrop-blur">
      <Link href="/" className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-xl bg-primary font-semibold text-primary-foreground text-sm">
          QE
        </div>
        <div>
          <div className="font-semibold leading-none">Qyvex Edge</div>
          <div className="text-muted-foreground text-xs">by Qyvex</div>
        </div>
      </Link>
      <div className="hidden items-center gap-6 text-muted-foreground text-sm md:flex">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} className="transition hover:text-foreground">
            {item.label}
          </Link>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost">
          <Link href="/auth/v2/login">Login</Link>
        </Button>
        <Button asChild>
          <Link href="/auth/v2/register">Start free</Link>
        </Button>
      </div>
    </nav>
  );
}

function DashboardPreview() {
  return (
    <div className="relative">
      <div className="absolute inset-8 rounded-full bg-primary/20 blur-3xl" />
      <Card className="relative overflow-hidden border-primary/15 bg-card/80">
        <CardContent className="space-y-6 p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-muted-foreground text-sm">Today</div>
              <div className="font-semibold text-2xl">Execution review</div>
            </div>
            <div className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 font-medium text-primary text-sm">
              86%
            </div>
          </div>

          <div className="grid gap-3">
            <ReviewItem label="Risk within plan" state="pass" />
            <ReviewItem label="Minimum RR respected" state="pass" />
            <ReviewItem label="London session only" state="pass" />
            <ReviewItem label="Emotional state high-risk" state="warn" />
          </div>

          <div className="grid gap-3 border-t pt-5 sm:grid-cols-3">
            <MiniStat value="12" label="Trades reviewed" />
            <MiniStat value="3" label="Failed rules" />
            <MiniStat value="2.1R" label="Avg final RR" />
          </div>

          <div className="rounded-2xl border bg-secondary/40 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Discipline trend</span>
              <BarChart3 className="size-4 text-[#5EEAD4]" />
            </div>
            <div className="flex h-24 items-end gap-2">
              {trendBars.map((bar) => (
                <div key={bar.id} className="flex-1 rounded-t-xl bg-primary/20">
                  <div
                    className="mt-auto rounded-t-xl bg-gradient-to-t from-primary to-[#5EEAD4]"
                    style={{ height: `${bar.height}%` }}
                  />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function FeatureCard({ title, description, icon: Icon }: { title: string; description: string; icon: LucideIcon }) {
  return (
    <Card className="bg-card/70 transition hover:border-primary/35">
      <CardContent className="space-y-4 p-6">
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">{title}</h3>
          <p className="text-muted-foreground text-sm leading-6">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="max-w-2xl space-y-3">
      <Badge variant="outline">{eyebrow}</Badge>
      <h2 className="font-semibold text-3xl tracking-tight md:text-5xl">{title}</h2>
      <p className="text-muted-foreground leading-7">{description}</p>
    </div>
  );
}

function ReviewItem({ label, state }: { label: string; state: "pass" | "warn" }) {
  return (
    <div className="flex items-center justify-between rounded-xl border bg-secondary/50 p-3">
      <span className="text-sm">{label}</span>
      <span
        className={
          state === "pass"
            ? "rounded-full bg-[#22C55E]/10 px-2 py-1 text-[#22C55E] text-xs"
            : "rounded-full bg-[#F59E0B]/10 px-2 py-1 text-[#F59E0B] text-xs"
        }
      >
        {state === "pass" ? "Passed" : "Watch"}
      </span>
    </div>
  );
}

function MiniStat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="font-semibold">{value}</div>
      <div className="text-muted-foreground text-xs">{label}</div>
    </div>
  );
}

function PublicFooter() {
  return (
    <footer className="border-t px-5 py-6 text-muted-foreground text-sm lg:px-14">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span>Qyvex Edge by Qyvex</span>
        <div className="flex flex-wrap gap-4">
          <Link href="/insights" className="transition hover:text-foreground">
            Insights
          </Link>
          <Link href="/privacy" className="transition hover:text-foreground">
            Privacy
          </Link>
          <Link href="/terms" className="transition hover:text-foreground">
            Terms
          </Link>
          <Link href="/disclaimer" className="transition hover:text-foreground">
            Disclaimer
          </Link>
        </div>
      </div>
    </footer>
  );
}
