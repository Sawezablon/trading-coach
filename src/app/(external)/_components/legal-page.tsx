import type { ReactNode } from "react";

import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";

type LegalSection = {
  title: string;
  body: ReactNode;
};

export function LegalPage({ eyebrow, sections, title }: { eyebrow: string; sections: LegalSection[]; title: string }) {
  return (
    <main className="min-h-dvh bg-background px-6 py-6 text-foreground lg:px-14">
      <nav className="mx-auto flex max-w-5xl items-center justify-between rounded-2xl border border-border/80 bg-card/50 px-4 py-3 backdrop-blur">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-xl bg-primary font-semibold text-primary-foreground text-sm">
            QE
          </div>
          <div>
            <div className="font-semibold leading-none">Qyvex Edge</div>
            <div className="text-muted-foreground text-xs">by Qyvex</div>
          </div>
        </Link>
        <Link
          href="/auth/v2/register"
          className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-border bg-secondary/80 px-2.5 font-medium text-sm transition hover:border-primary/40 hover:bg-card"
        >
          Start free
          <span aria-hidden="true">→</span>
        </Link>
      </nav>

      <section className="mx-auto max-w-5xl py-12">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-medium text-primary text-xs uppercase">
            <span className="size-1.5 rounded-full bg-primary" />
            {eyebrow}
          </div>
          <h1 className="max-w-3xl font-semibold text-4xl tracking-tight md:text-6xl">{title}</h1>
          <p className="max-w-2xl text-muted-foreground text-sm leading-7">
            Last updated May 18, 2026. These pages are written for a V1 product and should be reviewed by a qualified
            legal professional before scaling paid or regulated operations.
          </p>
        </div>

        <Card className="mt-8">
          <CardContent className="divide-y p-0">
            {sections.map((section) => (
              <section key={section.title} className="space-y-3 p-6">
                <h2 className="font-semibold text-xl">{section.title}</h2>
                <div className="text-muted-foreground text-sm leading-7">{section.body}</div>
              </section>
            ))}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
