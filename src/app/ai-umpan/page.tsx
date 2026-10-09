import type { Metadata } from "next";
import { PageShell } from "@/components/navigation";
import { Footer } from "@/components/shared";
import { AIWizard } from "@/components/ai-wizard";

export const metadata: Metadata = {
  title: "AI Umpan — Rekomendasi Racikan Ikan Mas",
  description: "Ceritakan lokasi, cuaca, kondisi air, jenis kolam, dan budget untuk menemukan rekomendasi umpan ikan mas.",
};

export default function AIUmpanPage() {
  return <PageShell><main className="mx-auto min-h-[70vh] max-w-7xl px-5 pb-16 pt-10 sm:px-8 sm:pt-14"><AIWizard /></main><Footer /></PageShell>;
}
