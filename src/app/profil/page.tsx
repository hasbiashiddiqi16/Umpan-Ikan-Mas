import type { Metadata } from "next";
import { PageShell } from "@/components/navigation";
import { Footer } from "@/components/shared";
import { ProfileView } from "@/components/profile-view";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Profil dan Resep Favorit",
  description: "Kelola resep umpan ikan mas favorit yang tersimpan secara lokal di perangkatmu.",
  path: "/profil",
  noIndex: true,
});

export default function ProfilePage() {
  return <PageShell><main className="mx-auto min-h-[70vh] max-w-7xl px-5 pb-16 pt-10 sm:px-8 sm:pt-14"><ProfileView /></main><Footer /></PageShell>;
}
