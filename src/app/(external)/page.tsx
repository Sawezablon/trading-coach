import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <section className="grid min-h-dvh content-center gap-10 px-6 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:px-14">
        <div className="flex max-w-3xl flex-col justify-center gap-8">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-muted-foreground text-sm">
              Discipline assistant for rule-based traders
            </div>
            <div className="space-y-3">
              <h1 className="max-w-2xl font-semibold text-5xl tracking-tight md:text-6xl">Qyvex Edge</h1>
              <p className="font-medium text-xl">AI Trading Discipline Assistant</p>
            </div>
            <p className="max-w-xl text-lg text-muted-foreground">
              An AI trading journal that helps traders stop breaking their own rules. No signals, no execution, no
              market predictions.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/auth/v2/register">Start journaling</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/auth/v2/login">Login</Link>
            </Button>
          </div>
        </div>

        <div className="grid content-end gap-4">
          <div className="rounded-lg border bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-muted-foreground text-sm">Today</div>
                <div className="font-medium text-xl">Execution review</div>
              </div>
              <div className="rounded-full bg-primary px-3 py-1 text-primary-foreground text-sm">72%</div>
            </div>
            <div className="grid gap-3">
              <Feature label="Journal every trade" />
              <Feature label="Detect emotional drift" />
              <Feature label="Audit risk, session, RR, and confirmation" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Stat value="31" label="Trades" />
            <Stat value="8" label="Violations" />
            <Stat value="XAUUSD" label="Best setup" />
          </div>
        </div>
      </section>
      <footer className="border-t px-6 py-5 text-muted-foreground text-sm lg:px-14">Qyvex Edge by Qyvex</footer>
    </main>
  );
}

function Feature({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-md border bg-background p-3">
      <span className="size-2 rounded-full bg-primary" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="font-semibold">{value}</div>
      <div className="text-muted-foreground text-xs">{label}</div>
    </div>
  );
}
