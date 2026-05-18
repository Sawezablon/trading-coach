import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getFeedbackInbox } from "@/lib/data/feedback";
import type { FeedbackReport } from "@/lib/supabase/types";

function formatFeedbackDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function severityClass(severity: FeedbackReport["severity"]) {
  if (severity === "blocking") {
    return "border-destructive/30 bg-destructive/10 text-destructive";
  }

  if (severity === "high") {
    return "border-[#F59E0B]/30 bg-[#F59E0B]/10 text-[#F59E0B]";
  }

  return "border-border bg-secondary text-muted-foreground";
}

export default async function FeedbackInboxPage() {
  const { error, reports, isAdminView } = await getFeedbackInbox();
  const bugCount = reports.filter((report) => report.type === "bug").length;
  const ideaCount = reports.filter((report) => report.type === "improvement").length;
  const blockingCount = reports.filter((report) => report.severity === "blocking").length;

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <div className="text-muted-foreground text-sm">Settings</div>
          <h1 className="font-semibold text-4xl tracking-tight">Feedback inbox</h1>
          <p className="max-w-2xl text-muted-foreground text-sm">
            Review bug reports and improvement ideas submitted from inside Qyvex Edge.
          </p>
        </div>
        <Link
          href="/dashboard/settings"
          className="inline-flex h-8 items-center justify-center rounded-xl border border-border bg-secondary/80 px-2.5 font-medium text-sm transition hover:border-primary/40 hover:bg-card"
        >
          Back to settings
        </Link>
      </div>

      <section className="grid gap-3 md:grid-cols-3">
        <SummaryCard label="Bugs" value={bugCount} />
        <SummaryCard label="Ideas" value={ideaCount} />
        <SummaryCard label="Blocking" value={blockingCount} />
      </section>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>{isAdminView ? "All user reports" : "Your reports"}</CardTitle>
              <CardDescription>
                {isAdminView
                  ? "Owner-wide feedback review is enabled."
                  : "This view shows feedback submitted from your account."}
              </CardDescription>
            </div>
            <span className="inline-flex h-5 items-center rounded-full border border-border px-2 py-0.5 font-medium text-xs">
              {reports.length} total
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {error ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-5">
              <h2 className="font-semibold text-destructive">Feedback inbox is not ready yet</h2>
              <p className="mt-2 text-muted-foreground text-sm leading-6">
                Supabase returned: <span className="text-foreground">{error}</span>
              </p>
              <p className="mt-2 text-muted-foreground text-sm leading-6">
                Apply the latest feedback migration:
                <span className="ml-1 text-foreground">
                  supabase/migrations/202605180001_create_feedback_reports.sql
                </span>
              </p>
            </div>
          ) : reports.length ? (
            reports.map((report) => <FeedbackReportRow key={report.id} report={report} />)
          ) : (
            <div className="rounded-2xl border border-dashed p-6 text-center">
              <div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <span className="font-semibold text-xs">FB</span>
              </div>
              <h2 className="mt-3 font-semibold">No feedback yet</h2>
              <p className="mx-auto mt-1 max-w-md text-muted-foreground text-sm">
                Reports submitted from the sidebar and Settings page will appear here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-muted-foreground text-sm">{label}</div>
        <div className="mt-2 font-semibold text-3xl">{value}</div>
      </CardContent>
    </Card>
  );
}

function FeedbackReportRow({ report }: { report: FeedbackReport }) {
  return (
    <article className="rounded-2xl border bg-secondary/35 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={
            report.type === "bug"
              ? "inline-flex h-5 items-center rounded-full bg-destructive/10 px-2 py-0.5 font-medium text-destructive text-xs"
              : "inline-flex h-5 items-center rounded-full bg-primary/15 px-2 py-0.5 font-medium text-primary text-xs ring-1 ring-primary/25"
          }
        >
          {report.type === "bug" ? "Bug" : "Idea"}
        </span>
        <span
          className={`inline-flex h-5 items-center rounded-full border px-2 py-0.5 font-medium text-xs ${severityClass(report.severity)}`}
        >
          {report.severity}
        </span>
        <span className="inline-flex h-5 items-center rounded-full border border-border px-2 py-0.5 font-medium text-xs">
          {report.category.replaceAll("_", " ")}
        </span>
        <span className="ml-auto text-muted-foreground text-xs">{formatFeedbackDate(report.created_at)}</span>
      </div>
      <h2 className="mt-3 font-semibold">{report.title ?? "Untitled report"}</h2>
      <p className="mt-2 whitespace-pre-wrap text-muted-foreground text-sm leading-6">{report.message}</p>
      {report.page_url ? (
        <div className="mt-3 truncate text-muted-foreground text-xs">
          Page: <span className="text-foreground">{report.page_url}</span>
        </div>
      ) : null}
    </article>
  );
}
