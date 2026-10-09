import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";

export default async function DashboardLayout({ children }: Readonly<{ children: ReactNode }>) {
  if (!await isAdminAuthenticated()) redirect("/login");
  return children;
}
