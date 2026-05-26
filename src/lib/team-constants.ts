import type { TeamRole, TeamTaskPriority, TeamTaskStatus, TeamTaskType } from "@/lib/supabase/types";

export const teamRoles = ["owner", "admin", "manager", "staff", "viewer"] as const;
export const teamTaskStatuses = ["todo", "in_progress", "blocked", "submitted", "approved", "done"] as const;
export const teamTaskPriorities = ["low", "medium", "high", "urgent"] as const;
export const teamTaskTypes = ["general", "bug", "feature", "qa", "content", "support", "design", "ops"] as const;

export function isTeamTaskStatus(value: string): value is TeamTaskStatus {
  return teamTaskStatuses.includes(value as TeamTaskStatus);
}

export function isTeamTaskPriority(value: string): value is TeamTaskPriority {
  return teamTaskPriorities.includes(value as TeamTaskPriority);
}

export function isTeamTaskType(value: string): value is TeamTaskType {
  return teamTaskTypes.includes(value as TeamTaskType);
}

export function isTeamRole(value: string): value is TeamRole {
  return teamRoles.includes(value as TeamRole);
}
