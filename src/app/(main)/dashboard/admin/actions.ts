"use server";

import { revalidatePath } from "next/cache";

import { isAdminEmail } from "@/lib/admin";
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import type { FeedbackReport } from "@/lib/supabase/types";

const feedbackStatuses = new Set(["open", "reviewing", "resolved", "closed"]);

export async function updateFeedbackStatusAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isAdminEmail(user?.email)) {
    return;
  }

  const service = createSupabaseServiceRoleClient();

  if (!service) {
    return;
  }

  const id = String(formData.get("id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim() as FeedbackReport["status"];

  if (!(id && feedbackStatuses.has(status))) {
    return;
  }

  await service.from("feedback_reports").update({ status }).eq("id", id);

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/settings/feedback");
}
