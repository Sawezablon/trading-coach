"use client";

import Link from "next/link";

import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    title: "Rules before results",
    description: "Log the trade plan, risk, setup context, emotions, and checklist before outcome bias creeps in.",
    icon: ShieldCheck,
  },
  {
    title: "Deterministic rule engine",
    description: "Risk, RR, session, pair, direction, screenshot, and checklist checks are scored without prediction.",
    icon: CheckCircle2,
  },
  {
    title: "AI execution review",
    description: "Get concise coaching feedback after your rules have already been evaluated by deterministic logic.",
    icon: Sparkles,
  },
];

const metrics = [
  { value: "0", label: "Signals generated" },
  { value: "100%", label: "Your rules first" },
  { value: "24/7", label: "Journal access" },
];

export default function Home() {
  return (
    <main className="min-h-dvh overflow-hidden bg-background text-foreground">
      <section className="relative px-6 pt-6 lg:px-14">
        <nav className="mx-auto flex max-w-7xl items-center justify-between rounded-2xl border border-border/80 bg-card/50 px-4 py-3 backdrop-blur">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-xl bg-primary font-semibold text-primary-foreground text-sm">
              QE
            </div>
            <div>
              <div className="font-semibold leading-none">Qyvex Edge</div>
              <div className="text-muted-foreground text-xs">by Qyvex</div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <Link href="/auth/v2/login">Login</Link>
            </Button>
            <Button asChild>
              <Link href="/auth/v2/register">Start free</Link>
            </Button>
          </div>
        </nav>

        <div className="mx-auto grid max-w-7xl gap-10 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:py-28">
          <div className="flex flex-col justify-center gap-8">
            <div className="space-y-6">
              <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
                AI Trading Discipline Assistant
              </Badge>
              <div className="space-y-4">
                <h1 className="max-w-3xl font-semibold text-5xl tracking-tight md:text-7xl">Qyvex Edge</h1>
                <p className="max-w-2xl font-medium text-2xl text-foreground md:text-3xl">
                  Stop Breaking Your Trading Rules
                </p>
              </div>
              <p className="max-w-2xl text-lg text-muted-foreground leading-8">
                A calm execution coach for traders who already have a plan. Journal decisions, detect discipline breaks,
                and review behavior without signals, predictions, or broker execution.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/auth/v2/register">
                  Start journaling
                  <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/auth/v2/login">Open dashboard</Link>
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-8 rounded-full bg-primary/20 blur-3xl" />
            <Card className="relative border-primary/10 bg-card/80">
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

                <div className="grid grid-cols-3 gap-3 border-t pt-5">
                  <MiniStat value="12" label="Trades" />
                  <MiniStat value="3" label="Failed rules" />
                  <MiniStat value="2.1R" label="Avg final RR" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="border-y border-border/80 bg-secondary/40 px-6 py-10 lg:px-14">
        <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-3">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-2xl border bg-card/50 p-5">
              <div className="font-semibold text-3xl">{metric.value}</div>
              <div className="mt-1 text-muted-foreground text-sm">{metric.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 py-20 lg:px-14">
        <div className="mx-auto max-w-7xl space-y-10">
          <div className="max-w-2xl space-y-3">
            <Badge variant="outline">Built for execution discipline</Badge>
            <h2 className="font-semibold text-3xl tracking-tight md:text-5xl">A journal that respects your edge.</h2>
            <p className="text-muted-foreground leading-7">
              Qyvex Edge keeps the product focused: no noisy market theater, no alerts to chase, no social feed. Just
              structured review for the decisions you actually control.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.title}>
                <CardContent className="space-y-4 p-6">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <feature.icon className="size-5" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">{feature.title}</h3>
                    <p className="text-muted-foreground text-sm leading-6">{feature.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-20 lg:px-14">
        <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-3">
          {["Funded account trader", "London session scalper", "Swing trader"].map((role) => (
            <Card key={role} className="bg-card/60">
              <CardContent className="space-y-4 p-6">
                <div className="flex items-center gap-2 text-primary">
                  <Sparkles className="size-4" />
                  <span className="font-medium text-sm">{role}</span>
                </div>
                <p className="text-muted-foreground text-sm leading-6">
                  “A disciplined review loop without hype. The checklist makes it harder to rationalize weak trades.”
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="px-6 pb-16 lg:px-14">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 rounded-3xl border bg-card/70 p-8 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-semibold text-2xl tracking-tight">Make discipline measurable.</h2>
            <p className="mt-2 text-muted-foreground">Start with a journal built for rule-following, not prediction.</p>
          </div>
          <Button asChild size="lg">
            <Link href="/auth/v2/register">
              Create account
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>

      <footer className="border-t px-6 py-6 text-muted-foreground text-sm lg:px-14">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <span>Qyvex Edge by Qyvex</span>
          <span>No signals. No predictions. Discipline first.</span>
        </div>
      </footer>
    </main>
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
