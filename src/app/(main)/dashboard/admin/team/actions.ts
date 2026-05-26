"use server";

import { revalidatePath } from "next/cache";

import { getTeamAccess } from "@/lib/data/team";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import type { TeamMemberStatus } from "@/lib/supabase/types";
import { isTeamRole } from "@/lib/team-constants";

function cleanText(value: FormDataEntryValue | null, maxLength: number) {
  return String(value ?? "")
    .trim()
    .slice(0, maxLength);
}

export async function upsertTeamMemberAction(formData: FormData) {
  const access = await getTeamAccess();
  const service = createSupabaseServiceRoleClient();

  if (!(access?.canManageTeam && service)) {
    return;
  }

  const email = cleanText(formData.get("email"), 240).toLowerCase();
  const role = cleanText(formData.get("role"), 40);

  if (!(email && isTeamRole(role))) {
    return;
  }

  await service.from("team_members").upsert(
    {
      email,
      full_name: cleanText(formData.get("full_name"), 160) || null,
      invited_by: access.userId,
      job_title: cleanText(formData.get("job_title"), 120) || null,
      role,
      status: "active",
    },
    { onConflict: "email" },
  );

  revalidatePath("/dashboard/admin/team");
  revalidatePath("/dashboard/admin/tasks");
}

export async function updateTeamMemberStatusAction(formData: FormData) {
  const access = await getTeamAccess();
  const service = createSupabaseServiceRoleClient();

  if (!(access?.canManageTeam && service)) {
    return;
  }

  const id = cleanText(formData.get("id"), 80);
  const status = cleanText(formData.get("status"), 40);

  if (!(id && ["active", "inactive", "invited"].includes(status))) {
    return;
  }

  await service
    .from("team_members")
    .update({ status: status as TeamMemberStatus })
    .eq("id", id);

  revalidatePath("/dashboard/admin/team");
  revalidatePath("/dashboard/admin/tasks");
}
