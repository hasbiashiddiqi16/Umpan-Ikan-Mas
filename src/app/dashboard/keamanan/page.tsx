import { redirect } from "next/navigation";
import { SecurityManager } from "@/components/admin/security-manager";
import { getAdminSession } from "@/lib/admin-auth";

export const metadata = { title: "Keamanan | UMPAN MAS" };

export default async function SecurityPage() {
  // Menu Keamanan hanya untuk Pemilik (Task 114); ditegakkan juga di API.
  const session = await getAdminSession();
  if (!session) redirect("/login");
  if (session.role !== "pemilik") redirect("/dashboard");
  return <SecurityManager />;
}
