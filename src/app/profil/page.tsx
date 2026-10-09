import type { Metadata } from "next";
import { PageShell } from "@/components/navigation";
import { Footer } from "@/components/shared";
import { ProfileView } from "@/components/profile-view";

export const metadata: Metadata = {
  title: "Profil & Resep Favorit",
  description: "Lihat resep umpan ikan mas yang tersimpan di perangkatmu.",
};

export default function ProfilePage() {
  return <PageShell><main className="mx-auto min-h-[70vh] max-w-7xl px-5 pb-16 pt-10 sm:px-8 sm:pt-14"><ProfileView /></main><Footer /></PageShell>;
}
