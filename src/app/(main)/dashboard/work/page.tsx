import { redirect } from "next/navigation";

import { MyWork } from "@/app/(main)/dashboard/work/_components/my-work";
import { getMyWorkData } from "@/lib/data/team";

export const dynamic = "force-dynamic";

export default async function MyWorkPage() {
  const { access, tasks } = await getMyWorkData();

  if (!access?.canViewWork) {
    redirect("/unauthorized?reason=work_access_denied");
  }

  return <MyWork tasks={tasks} />;
}
