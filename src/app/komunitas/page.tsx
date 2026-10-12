import type { Metadata } from "next";
import { PageShell } from "@/components/navigation";
import { Footer } from "@/components/shared";
import { CommunityView } from "@/components/community-view";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Cerita Pemancing Ikan Mas",
  description: "Baca dan bagikan pengalaman meracik umpan ikan mas, kondisi kolam, cuaca, dan sesi memancing dari komunitas.",
  path: "/komunitas",
});

export default function CommunityPage() {
  return <PageShell><main className="mx-auto min-h-[70vh] max-w-7xl px-5 pb-16 pt-10 sm:px-8 sm:pt-14"><CommunityView /></main><Footer /></PageShell>;
}
