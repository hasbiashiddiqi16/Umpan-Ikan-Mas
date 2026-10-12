import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";

export const metadata: Metadata = {
  title: "Content Studio",
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default async function DashboardLayout({ children }: Readonly<{ children: ReactNode }>) {
  if (!await isAdminAuthenticated()) redirect("/login");
  return children;
}
