import { isAdminEmail } from "@/lib/admin";
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import type { FeedbackReport, Mt5Connection, Trade } from "@/lib/supabase/types";

export type AdminProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  selected_mt5_connection_id: string | null;
  timezone: string;
  created_at: string;
  updated_at: string;
};

export type AdminDashboardData = {
  authorized: boolean;
  authorizationReason: "allowed" | "email_not_allowed" | "missing_session" | "missing_supabase";
  configurationError: string;
  counts: {
    activeMt5Connections: number;
    feedbackOpen: number;
    feedbackTotal: number;
    profiles: number;
    reviewedTrades: number;
    trades: number;
    unreviewedTrades: number;
  };
  feedback: FeedbackReport[];
  recentProfiles: AdminProfile[];
  recentTrades: Trade[];
  syncConnections: Mt5Connection[];
};

const emptyCounts = {
  activeMt5Connections: 0,
  feedbackOpen: 0,
  feedbackTotal: 0,
  profiles: 0,
  reviewedTrades: 0,
  trades: 0,
  unreviewedTrades: 0,
};

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return getEmptyAdminDashboardData({
      authorized: false,
      authorizationReason: "missing_supabase",
      configurationError: "Supabase authentication is not configured.",
    });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return getEmptyAdminDashboardData({
      authorized: false,
      authorizationReason: "missing_session",
      configurationError: "",
    });
  }

  if (!isAdminEmail(user.email)) {
    return getEmptyAdminDashboardData({
      authorized: false,
      authorizationReason: "email_not_allowed",
      configurationError: "",
    });
  }

  const service = createSupabaseServiceRoleClient();

  if (!service) {
    return getEmptyAdminDashboardData({
      authorized: true,
      authorizationReason: "allowed",
      configurationError: "SUPABASE_SERVICE_ROLE_KEY is required for the admin dashboard.",
    });
  }

  const [
    profilesCount,
    tradesCount,
    reviewedTradesCount,
    unreviewedTradesCount,
    feedbackCount,
    openFeedbackCount,
    activeMt5ConnectionsCount,
    feedback,
    recentProfiles,
    recentTrades,
    syncConnections,
  ] = await Promise.all([
    service.from("profiles").select("id", { count: "exact", head: true }),
    service.from("trades").select("id", { count: "exact", head: true }),
    service.from("trades").select("id", { count: "exact", head: true }).eq("review_status", "reviewed"),
    service.from("trades").select("id", { count: "exact", head: true }).eq("review_status", "needs_review"),
    service.from("feedback_reports").select("id", { count: "exact", head: true }),
    service.from("feedback_reports").select("id", { count: "exact", head: true }).in("status", ["open", "reviewing"]),
    service.from("mt5_connections").select("id", { count: "exact", head: true }).eq("is_active", true),
    service.from("feedback_reports").select("*").order("created_at", { ascending: false }).limit(8),
    service
      .from("profiles")
      .select("id,email,full_name,selected_mt5_connection_id,timezone,created_at,updated_at")
      .order("created_at", { ascending: false })
      .limit(8),
    service.from("trades").select("*").order("created_at", { ascending: false }).limit(8),
    service.from("mt5_connections").select("*").order("last_sync_at", { ascending: false, nullsFirst: false }).limit(8),
  ]);

  return {
    authorized: true,
    authorizationReason: "allowed",
    configurationError: firstError([
      profilesCount.error?.message,
      tradesCount.error?.message,
      feedback.error?.message,
      recentProfiles.error?.message,
      recentTrades.error?.message,
      syncConnections.error?.message,
    ]),
    counts: {
      activeMt5Connections: activeMt5ConnectionsCount.count ?? 0,
      feedbackOpen: openFeedbackCount.count ?? 0,
      feedbackTotal: feedbackCount.count ?? 0,
      profiles: profilesCount.count ?? 0,
      reviewedTrades: reviewedTradesCount.count ?? 0,
      trades: tradesCount.count ?? 0,
      unreviewedTrades: unreviewedTradesCount.count ?? 0,
    },
    feedback: (feedback.data ?? []) as FeedbackReport[],
    recentProfiles: (recentProfiles.data ?? []) as AdminProfile[],
    recentTrades: (recentTrades.data ?? []) as Trade[],
    syncConnections: (syncConnections.data ?? []) as Mt5Connection[],
  };
}

function getEmptyAdminDashboardData({
  authorized,
  authorizationReason,
  configurationError,
}: {
  authorized: boolean;
  authorizationReason: AdminDashboardData["authorizationReason"];
  configurationError: string;
}): AdminDashboardData {
  return {
    authorized,
    authorizationReason,
    configurationError,
    counts: emptyCounts,
    feedback: [],
    recentProfiles: [],
    recentTrades: [],
    syncConnections: [],
  };
}

function firstError(errors: Array<string | undefined>) {
  return errors.find(Boolean) ?? "";
}
