import { redirect } from "next/navigation";

import { AdminDashboard } from "@/app/(main)/dashboard/admin/_components/admin-dashboard";
import { getAdminDashboardData } from "@/lib/data/admin";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const data = await getAdminDashboardData();

  if (!data.authorized) {
    redirect("/unauthorized");
  }

  return <AdminDashboard data={data} />;
}
