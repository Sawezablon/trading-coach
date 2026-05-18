"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

type FeedbackState = {
  error?: string;
  message?: string;
};

const feedbackTypes = new Set(["bug", "improvement"]);
const severities = new Set(["low", "medium", "high", "blocking"]);

function cleanText(value: FormDataEntryValue | null, maxLength: number) {
  return String(value ?? "")
    .trim()
    .slice(0, maxLength);
}

function optionalNumber(value: FormDataEntryValue | null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export async function submitFeedbackAction(_prevState: FeedbackState, formData: FormData): Promise<FeedbackState> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return { error: "Supabase is not configured yet." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Please sign in before sending feedback." };
  }

  const type = cleanText(formData.get("type"), 32);
  const severity = cleanText(formData.get("severity"), 32);
  const category = cleanText(formData.get("category"), 80) || "other";
  const title = cleanText(formData.get("title"), 120);
  const message = cleanText(formData.get("message"), 4000);

  if (!feedbackTypes.has(type)) {
    return { error: "Choose whether this is an issue or an improvement idea." };
  }

  if (!severities.has(severity)) {
    return { error: "Choose a valid priority." };
  }

  if (message.length < 10) {
    return { error: "Add a little more detail so we can understand what happened." };
  }

  const { error } = await supabase.from("feedback_reports").insert({
    user_id: user.id,
    type: type as "bug" | "improvement",
    severity: severity as "low" | "medium" | "high" | "blocking",
    category,
    title: title || null,
    message,
    page_url: cleanText(formData.get("page_url"), 500) || null,
    user_agent: cleanText(formData.get("user_agent"), 500) || null,
    browser_language: cleanText(formData.get("browser_language"), 80) || null,
    viewport_width: optionalNumber(formData.get("viewport_width")),
    viewport_height: optionalNumber(formData.get("viewport_height")),
  });

  if (error) {
    return { error: error.message };
  }

  return {
    message:
      type === "bug"
        ? "Issue sent. Thank you, this helps us harden V1."
        : "Idea sent. Thank you, this helps shape the next version.",
  };
}
