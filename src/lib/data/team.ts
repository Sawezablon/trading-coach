import { isAdminEmail } from "@/lib/admin";
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import type { FeedbackReport, TaskComment, TeamMember, TeamRole, TeamTask } from "@/lib/supabase/types";

export type TeamAccess = {
  userId: string;
  email: string;
  isOwnerAdmin: boolean;
  member: TeamMember | null;
  canManageTeam: boolean;
  canManageTasks: boolean;
  canViewWork: boolean;
};

export type TeamTaskWithRelations = TeamTask & {
  assignee: TeamMember | null;
  feedback: FeedbackReport | null;
  comments: TaskComment[];
};

const managerRoles = new Set<TeamRole>(["owner", "admin", "manager"]);

export async function getTeamAccess(): Promise<TeamAccess | null> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!(user?.email && user.id)) {
    return null;
  }

  const service = createSupabaseServiceRoleClient();
  const email = user.email.toLowerCase();
  const isOwnerAdmin = isAdminEmail(email);
  const member = service
    ? await service
        .from("team_members")
        .select("*")
        .or(`user_id.eq.${user.id},email.ilike.${email}`)
        .maybeSingle()
        .then(({ data }) => (data ?? null) as TeamMember | null)
    : null;

  return {
    userId: user.id,
    email,
    isOwnerAdmin,
    member,
    canManageTeam: isOwnerAdmin || member?.role === "owner" || member?.role === "admin",
    canManageTasks: isOwnerAdmin || Boolean(member && managerRoles.has(member.role)),
    canViewWork: isOwnerAdmin || Boolean(member && member.status === "active"),
  };
}

export async function getTeamAdminData() {
  const access = await getTeamAccess();
  const service = createSupabaseServiceRoleClient();

  if (!(access?.canManageTeam && service)) {
    return { access, members: [] as TeamMember[] };
  }

  const { data } = await service.from("team_members").select("*").order("created_at", { ascending: false });

  return {
    access,
    members: (data ?? []) as TeamMember[],
  };
}

export async function getTaskAdminData() {
  const access = await getTeamAccess();
  const service = createSupabaseServiceRoleClient();

  if (!(access?.canManageTasks && service)) {
    return {
      access,
      feedback: [] as FeedbackReport[],
      members: [] as TeamMember[],
      tasks: [] as TeamTaskWithRelations[],
    };
  }

  const [members, tasks, feedback, comments] = await Promise.all([
    service.from("team_members").select("*").order("email", { ascending: true }),
    service.from("team_tasks").select("*").order("created_at", { ascending: false }).limit(80),
    service
      .from("feedback_reports")
      .select("*")
      .in("status", ["open", "reviewing"])
      .order("created_at", { ascending: false })
      .limit(80),
    service.from("task_comments").select("*").order("created_at", { ascending: false }).limit(300),
  ]);

  const teamMembers = (members.data ?? []) as TeamMember[];
  const reports = (feedback.data ?? []) as FeedbackReport[];
  const taskComments = (comments.data ?? []) as TaskComment[];

  return {
    access,
    feedback: reports,
    members: teamMembers,
    tasks: hydrateTasks({
      comments: taskComments,
      feedback: reports,
      members: teamMembers,
      tasks: (tasks.data ?? []) as TeamTask[],
    }),
  };
}

export async function getMyWorkData() {
  const access = await getTeamAccess();
  const service = createSupabaseServiceRoleClient();

  if (!(access?.canViewWork && access.member && service)) {
    return {
      access,
      tasks: [] as TeamTaskWithRelations[],
    };
  }

  const [tasks, comments, feedback] = await Promise.all([
    service
      .from("team_tasks")
      .select("*")
      .eq("assigned_to", access.member.id)
      .order("created_at", { ascending: false })
      .limit(80),
    service.from("task_comments").select("*").order("created_at", { ascending: false }).limit(300),
    service.from("feedback_reports").select("*").order("created_at", { ascending: false }).limit(80),
  ]);

  return {
    access,
    tasks: hydrateTasks({
      comments: (comments.data ?? []) as TaskComment[],
      feedback: (feedback.data ?? []) as FeedbackReport[],
      members: [access.member],
      tasks: (tasks.data ?? []) as TeamTask[],
    }),
  };
}

function hydrateTasks({
  comments,
  feedback,
  members,
  tasks,
}: {
  comments: TaskComment[];
  feedback: FeedbackReport[];
  members: TeamMember[];
  tasks: TeamTask[];
}) {
  return tasks.map((task) => ({
    ...task,
    assignee: members.find((member) => member.id === task.assigned_to) ?? null,
    comments: comments.filter((comment) => comment.task_id === task.id),
    feedback: feedback.find((report) => report.id === task.related_feedback_id) ?? null,
  }));
}
