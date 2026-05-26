import { redirect } from "next/navigation";

import { TeamAdmin } from "@/app/(main)/dashboard/admin/team/_components/team-admin";
import { getTeamAdminData } from "@/lib/data/team";

export const dynamic = "force-dynamic";

export default async function TeamAdminPage() {
  const { access, members } = await getTeamAdminData();

  if (!access?.canManageTeam) {
    redirect("/unauthorized?reason=team_access_denied");
  }

  return <TeamAdmin members={members} />;
}
