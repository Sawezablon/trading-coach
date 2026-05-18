import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { FeedbackReport } from "@/lib/supabase/types";

export type FeedbackInbox = {
  reports: FeedbackReport[];
  isAdminView: boolean;
  error: string;
};

export async function getFeedbackInbox(): Promise<FeedbackInbox> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return { reports: [], isAdminView: false, error: "" };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { reports: [], isAdminView: false, error: "" };
  }

  const { data, error } = await supabase
    .from("feedback_reports")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return { reports: [], isAdminView: false, error: error.message };
  }

  return {
    reports: (data ?? []) as FeedbackReport[],
    isAdminView: false,
    error: "",
  };
}
