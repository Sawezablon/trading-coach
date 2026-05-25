"use client";

import Link from "next/link";

import { BookOpen, ChevronLeft } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const articles = [
  {
    title: "Why traders break rules after one loss",
    category: "Trading psychology",
    description: "A simple way to review the moment where one losing trade becomes a revenge-trading sequence.",
    readTime: "4 min read",
  },
  {
    title: "How to review a losing streak without chasing",
    category: "Execution review",
    description: "Separate clean losses from rule-pressure trades so recovery starts with behavior, not bigger risk.",
    readTime: "5 min read",
  },
  {
    title: "What read-only MT5 sync should and should not do",
    category: "Product principles",
    description:
      "Why Qyvex Edge imports facts for review while avoiding execution, signals, copy trading, and predictions.",
    readTime: "3 min read",
  },
  {
    title: "A monthly plan for funded account discipline",
    category: "Risk management",
    description:
      "Use trade limits, drawdown pressure, review debt, and reduced-risk mode before the account gets emotional.",
    readTime: "6 min read",
  },
];

export default function InsightsPage() {
  return (
    <main className="min-h-dvh bg-background px-5 py-6 text-foreground lg:px-14">
      <div className="mx-auto max-w-6xl space-y-10">
        <nav className="flex items-center justify-between rounded-2xl border bg-card/60 px-4 py-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-muted-foreground text-sm transition hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
            Qyvex Edge
          </Link>
          <Link href="/auth/v2/register" className="font-medium text-primary text-sm">
            Start free
          </Link>
        </nav>

        <section className="space-y-5 py-10">
          <Badge variant="outline" className="w-fit">
            Insights
          </Badge>
          <div className="max-w-3xl space-y-4">
            <h1 className="font-semibold text-4xl tracking-tight md:text-6xl">
              Practical notes for disciplined traders.
            </h1>
            <p className="text-lg text-muted-foreground leading-8">
              Short, useful thinking on trading psychology, prop firm pressure, risk review, and product updates. No
              signal calls. No market predictions.
            </p>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {articles.map((article) => (
            <Card key={article.title} className="bg-card/70 transition hover:border-primary/35">
              <CardContent className="space-y-5 p-6">
                <div className="flex items-center justify-between gap-4">
                  <Badge variant="outline">{article.category}</Badge>
                  <span className="text-muted-foreground text-xs">{article.readTime}</span>
                </div>
                <div className="space-y-2">
                  <h2 className="font-semibold text-2xl leading-8">{article.title}</h2>
                  <p className="text-muted-foreground text-sm leading-6">{article.description}</p>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <BookOpen className="size-4" />
                  Coming soon
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      </div>
    </main>
  );
}
