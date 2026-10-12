import type { Metadata } from "next";
import { PageShell } from "@/components/navigation";
import { Footer } from "@/components/shared";
import { AIWizard } from "@/components/ai-wizard";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Rekomendasi Umpan Ikan Mas",
  description: "Temukan rekomendasi racikan umpan ikan mas berdasarkan lokasi, cuaca, kondisi air, jenis kolam, dan budget memancingmu.",
  path: "/ai-umpan",
});

export default function AIUmpanPage() {
  return <PageShell><main className="mx-auto min-h-[70vh] max-w-7xl px-5 pb-16 pt-10 sm:px-8 sm:pt-14"><AIWizard /></main><Footer /></PageShell>;
}
