import { redirect } from "next/navigation";

import { TasksAdmin } from "@/app/(main)/dashboard/admin/tasks/_components/tasks-admin";
import { getTaskAdminData } from "@/lib/data/team";

export const dynamic = "force-dynamic";

export default async function TeamTasksPage() {
  const { access, feedback, members, tasks } = await getTaskAdminData();

  if (!access?.canManageTasks) {
    redirect("/unauthorized?reason=task_access_denied");
  }

  return <TasksAdmin feedback={feedback} members={members} tasks={tasks} />;
}
