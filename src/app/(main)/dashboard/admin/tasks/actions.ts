"use server";

import { revalidatePath } from "next/cache";

import { getTeamAccess } from "@/lib/data/team";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import type { TeamTaskStatus } from "@/lib/supabase/types";
import { isTeamTaskPriority, isTeamTaskStatus, isTeamTaskType } from "@/lib/team-constants";

function cleanText(value: FormDataEntryValue | null, maxLength: number) {
  return String(value ?? "")
    .trim()
    .slice(0, maxLength);
}

function cleanOptionalDate(value: FormDataEntryValue | null) {
  const raw = cleanText(value, 80);

  if (!raw) {
    return null;
  }

  const date = new Date(raw);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export async function createTeamTaskAction(formData: FormData) {
  const access = await getTeamAccess();
  const service = createSupabaseServiceRoleClient();

  if (!(access?.canManageTasks && service)) {
    return;
  }

  const title = cleanText(formData.get("title"), 180);
  const priority = cleanText(formData.get("priority"), 40);
  const taskType = cleanText(formData.get("task_type"), 40);

  if (!(title && isTeamTaskPriority(priority) && isTeamTaskType(taskType))) {
    return;
  }

  await service.from("team_tasks").insert({
    assigned_to: cleanText(formData.get("assigned_to"), 80) || null,
    created_by: access.userId,
    description: cleanText(formData.get("description"), 5000),
    due_at: cleanOptionalDate(formData.get("due_at")),
    page_url: cleanText(formData.get("page_url"), 500) || null,
    priority,
    related_feedback_id: cleanText(formData.get("related_feedback_id"), 80) || null,
    task_type: taskType,
    title,
  });

  revalidatePath("/dashboard/admin/tasks");
  revalidatePath("/dashboard/work");
}

export async function updateTeamTaskStatusAction(formData: FormData) {
  const access = await getTeamAccess();
  const service = createSupabaseServiceRoleClient();

  if (!(access?.canManageTasks && service)) {
    return;
  }

  const id = cleanText(formData.get("id"), 80);
  const status = cleanText(formData.get("status"), 40);

  if (!(id && isTeamTaskStatus(status))) {
    return;
  }

  await service
    .from("team_tasks")
    .update({
      approved_at: status === "approved" || status === "done" ? new Date().toISOString() : null,
      status,
    })
    .eq("id", id);

  await addTaskComment({
    authorEmail: access.email,
    authorUserId: access.userId,
    body: `Status changed to ${status.replaceAll("_", " ")}.`,
    kind: status === "approved" ? "approval" : "status",
    taskId: id,
  });

  revalidatePath("/dashboard/admin/tasks");
  revalidatePath("/dashboard/work");
}

export async function submitTeamTaskUpdateAction(formData: FormData) {
  const access = await getTeamAccess();
  const service = createSupabaseServiceRoleClient();

  if (!(access?.canViewWork && access.member && service)) {
    return;
  }

  const id = cleanText(formData.get("id"), 80);
  const body = cleanText(formData.get("body"), 5000);
  const status = cleanText(formData.get("status"), 40) as TeamTaskStatus;

  if (!(id && body && isTeamTaskStatus(status))) {
    return;
  }

  const { data: task } = await service
    .from("team_tasks")
    .select("id,assigned_to")
    .eq("id", id)
    .eq("assigned_to", access.member.id)
    .maybeSingle();

  if (!task) {
    return;
  }

  await service
    .from("team_tasks")
    .update({
      status,
      submitted_at: status === "submitted" ? new Date().toISOString() : null,
    })
    .eq("id", id);

  await addTaskComment({
    authorEmail: access.email,
    authorUserId: access.userId,
    body,
    kind: status === "submitted" ? "submission" : "comment",
    taskId: id,
  });

  revalidatePath("/dashboard/work");
  revalidatePath("/dashboard/admin/tasks");
}

async function addTaskComment({
  authorEmail,
  authorUserId,
  body,
  kind,
  taskId,
}: {
  authorEmail: string;
  authorUserId: string;
  body: string;
  kind: "approval" | "comment" | "revision" | "status" | "submission";
  taskId: string;
}) {
  const service = createSupabaseServiceRoleClient();

  if (!service) {
    return;
  }

  await service.from("task_comments").insert({
    author_email: authorEmail,
    author_user_id: authorUserId,
    body,
    kind,
    task_id: taskId,
  });
}
