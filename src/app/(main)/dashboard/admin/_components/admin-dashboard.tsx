"use client";

import type React from "react";

import Link from "next/link";

import { AlertTriangle, BarChart3, CircleUser, Database, MessageSquareDot, ShieldCheck } from "lucide-react";

import { updateFeedbackStatusAction } from "@/app/(main)/dashboard/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { AdminDashboardData, AdminProfile } from "@/lib/data/admin";
import type { FeedbackReport, Mt5Connection, Trade } from "@/lib/supabase/types";

export function AdminDashboard({ data }: { data: AdminDashboardData }) {
  const reviewRate = data.counts.trades ? Math.round((data.counts.reviewedTrades / data.counts.trades) * 100) : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="relative overflow-hidden rounded-3xl border border-primary/25 bg-[radial-gradient(circle_at_top_left,rgb(124_92_255/0.22),transparent_36%),linear-gradient(135deg,rgb(23_24_28),rgb(10_10_11))] p-6 shadow-[0_0_70px_rgb(124_92_255/0.12)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-primary text-sm">
              <ShieldCheck className="size-4" />
              Qyvex owner console
            </div>
            <h1 className="mt-3 font-semibold text-4xl tracking-tight">Admin dashboard</h1>
            <p className="mt-2 max-w-2xl text-muted-foreground text-sm">
              Monitor users, MT5 sync health, feedback, and review debt without touching user-owned settings.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/dashboard/settings/feedback">User feedback view</Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard">Back to dashboard</Link>
            </Button>
          </div>
        </div>
        {data.configurationError ? (
          <div className="mt-5 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm">
            <div className="flex items-center gap-2 font-medium text-destructive">
              <AlertTriangle className="size-4" />
              Admin data is incomplete
            </div>
            <p className="mt-2 text-muted-foreground">{data.configurationError}</p>
          </div>
        ) : null}
      </div>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <AdminMetric
          detail={`${data.counts.activeMt5Connections} active MT5 connection${data.counts.activeMt5Connections === 1 ? "" : "s"}`}
          icon={<CircleUser className="size-4" />}
          label="Users"
          value={data.counts.profiles}
        />
        <AdminMetric
          detail={`${data.counts.unreviewedTrades} awaiting review`}
          icon={<BarChart3 className="size-4" />}
          label="Trades"
          value={data.counts.trades}
        />
        <AdminMetric
          detail={`${data.counts.feedbackOpen} open or reviewing`}
          icon={<MessageSquareDot className="size-4" />}
          label="Feedback"
          value={data.counts.feedbackTotal}
        />
        <AdminMetric
          detail={`${reviewRate}% reviewed across all users`}
          icon={<ShieldCheck className="size-4" />}
          label="Review health"
          value={`${reviewRate}%`}
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Feedback triage</CardTitle>
            <CardDescription>Latest issues and ideas from users.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.feedback.length ? (
              data.feedback.map((report) => <FeedbackRow key={report.id} report={report} />)
            ) : (
              <EmptyPanel body="Feedback submitted from the sidebar will appear here." title="No feedback yet" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Platform pulse</CardTitle>
            <CardDescription>Fast read on sync and review health.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <PulseRow label="Reviewed trades" value={`${data.counts.reviewedTrades}/${data.counts.trades}`}>
              <Progress value={reviewRate} />
            </PulseRow>
            <PulseRow label="Open feedback" value={data.counts.feedbackOpen}>
              <Progress
                value={data.counts.feedbackTotal ? (data.counts.feedbackOpen / data.counts.feedbackTotal) * 100 : 0}
              />
            </PulseRow>
            <PulseRow label="Active MT5 accounts" value={data.counts.activeMt5Connections}>
              <Progress value={data.counts.activeMt5Connections ? 100 : 0} />
            </PulseRow>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Recent users</CardTitle>
            <CardDescription>Newest profile records.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.recentProfiles.length ? (
              data.recentProfiles.map((profile) => <ProfileRow key={profile.id} profile={profile} />)
            ) : (
              <EmptyPanel body="New signups will appear after profile creation." title="No users yet" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent trades</CardTitle>
            <CardDescription>Latest journal entries across users.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.recentTrades.length ? (
              data.recentTrades.map((trade) => <TradeRow key={trade.id} trade={trade} />)
            ) : (
              <EmptyPanel body="Trades will appear here after users log or sync them." title="No trades yet" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>MT5 connections</CardTitle>
            <CardDescription>Latest active sync accounts.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.syncConnections.length ? (
              data.syncConnections.map((connection) => <ConnectionRow connection={connection} key={connection.id} />)
            ) : (
              <EmptyPanel body="Connected broker accounts will appear here." title="No connections yet" />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AdminMetric({
  detail,
  icon,
  label,
  value,
}: {
  detail: string;
  icon: React.ReactNode;
  label: string;
  value: number | string;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-muted-foreground text-sm">{label}</div>
            <div className="mt-2 font-semibold text-3xl tracking-tight">{value}</div>
          </div>
          <div className="flex size-10 items-center justify-center rounded-2xl border bg-primary/10 text-primary">
            {icon}
          </div>
        </div>
        <p className="mt-4 text-muted-foreground text-sm">{detail}</p>
      </CardContent>
    </Card>
  );
}

function FeedbackRow({ report }: { report: FeedbackReport }) {
  return (
    <article className="rounded-2xl border bg-secondary/35 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={report.type === "bug" ? "bg-destructive/10 text-destructive" : ""}>
          {report.type === "bug" ? "Bug" : "Idea"}
        </Badge>
        <Badge variant="outline">{report.severity}</Badge>
        <Badge variant="secondary">{report.status}</Badge>
        <span className="ml-auto text-muted-foreground text-xs">{formatDate(report.created_at)}</span>
      </div>
      <h2 className="mt-3 font-semibold">{report.title ?? "Untitled report"}</h2>
      <p className="mt-2 line-clamp-3 text-muted-foreground text-sm leading-6">{report.message}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {(["open", "reviewing", "resolved", "closed"] as const).map((status) => (
          <form action={updateFeedbackStatusAction} key={status}>
            <input name="id" type="hidden" value={report.id} />
            <input name="status" type="hidden" value={status} />
            <Button disabled={report.status === status} size="sm" type="submit" variant="outline">
              {status}
            </Button>
          </form>
        ))}
      </div>
    </article>
  );
}

function ProfileRow({ profile }: { profile: AdminProfile }) {
  return (
    <div className="rounded-2xl border bg-secondary/35 p-4">
      <div className="font-medium">{profile.email ?? "No email"}</div>
      <div className="mt-1 text-muted-foreground text-xs">{profile.full_name ?? "No full name"}</div>
      <div className="mt-3 flex items-center justify-between gap-3 text-muted-foreground text-xs">
        <span>{profile.timezone}</span>
        <span>{formatDate(profile.created_at)}</span>
      </div>
    </div>
  );
}

function TradeRow({ trade }: { trade: Trade }) {
  return (
    <div className="rounded-2xl border bg-secondary/35 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="font-medium">{trade.pair}</div>
        <Badge variant={trade.review_status === "reviewed" ? "default" : "secondary"}>{trade.review_status}</Badge>
      </div>
      <div className="mt-2 text-muted-foreground text-sm">
        {trade.direction} - {trade.status} - {trade.outcome}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 text-muted-foreground text-xs">
        <span>{trade.mt5_broker ?? "Manual"}</span>
        <span>{formatDate(trade.trade_taken_at)}</span>
      </div>
    </div>
  );
}

function ConnectionRow({ connection }: { connection: Mt5Connection }) {
  return (
    <div className="rounded-2xl border bg-secondary/35 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="font-medium">{connection.broker ?? "Pending MT5 account"}</div>
        <Badge className={connection.is_active ? "bg-[#22C55E]/10 text-[#22C55E]" : ""}>
          {connection.is_active ? "Active" : "Inactive"}
        </Badge>
      </div>
      <div className="mt-2 text-muted-foreground text-sm">{connection.account_number ?? "Waiting for first sync"}</div>
      <div className="mt-3 flex items-center gap-2 text-muted-foreground text-xs">
        <Database className="size-3.5" />
        Last sync: {connection.last_sync_at ? formatDate(connection.last_sync_at) : "Never"}
      </div>
    </div>
  );
}

function PulseRow({ children, label, value }: { children: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border bg-secondary/35 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-muted-foreground text-sm">{label}</span>
        <span className="font-semibold">{value}</span>
      </div>
      {children}
    </div>
  );
}

function EmptyPanel({ body, title }: { body: string; title: string }) {
  return (
    <div className="rounded-2xl border border-dashed bg-secondary/20 p-6 text-center">
      <div className="mx-auto flex size-10 items-center justify-center rounded-2xl border bg-secondary text-muted-foreground">
        <MessageSquareDot className="size-4" />
      </div>
      <div className="mt-3 font-medium">{title}</div>
      <p className="mt-1 text-muted-foreground text-sm">{body}</p>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
