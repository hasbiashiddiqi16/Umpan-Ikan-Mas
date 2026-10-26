import { redirect } from "next/navigation";
import { RegisteredUsersManager } from "@/components/admin/users-manager";
import { getAdminSession } from "@/lib/admin-auth";

export const metadata = { title: "Pengguna Terdaftar | UMPAN MAS CMS" };

export default async function DashboardUsersPage() {
  // Menu Pengguna hanya untuk Pemilik (Task 114); ditegakkan juga di API.
  const session = await getAdminSession();
  if (!session) redirect("/login");
  if (session.role !== "pemilik") redirect("/dashboard");
  return <RegisteredUsersManager />;
}
