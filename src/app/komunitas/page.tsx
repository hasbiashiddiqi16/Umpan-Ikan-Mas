import type { Metadata } from "next";
import { PageShell } from "@/components/navigation";
import { Footer } from "@/components/shared";
import { CommunityView } from "@/components/community-view";

export const metadata: Metadata = {
  title: "Cerita Pemancing & Hasil Mancing",
  description: "Baca pengalaman pemancing ikan mas tentang racikan, cuaca, kondisi air, dan hasil sesi mereka.",
};

export default function CommunityPage() {
  return <PageShell><main className="mx-auto min-h-[70vh] max-w-7xl px-5 pb-16 pt-10 sm:px-8 sm:pt-14"><CommunityView /></main><Footer /></PageShell>;
}
