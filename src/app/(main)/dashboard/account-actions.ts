"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function switchActiveMt5AccountAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  const connectionId = String(formData.get("mt5_connection_id") ?? "").trim();

  if (!connectionId) {
    return;
  }

  const { data: connection, error: connectionError } = await supabase
    .from("mt5_connections")
    .select("id")
    .eq("id", connectionId)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (connectionError || !connection) {
    return;
  }

  await supabase.from("profiles").upsert({
    id: user.id,
    email: user.email,
    selected_mt5_connection_id: connection.id,
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/journal");
  revalidatePath("/dashboard/upload");
}
