import type { Metadata } from "next";
import { Footer } from "@/components/shared";
import { PageShell } from "@/components/navigation";
import { ExpertSystem } from "@/components/expert-system";

export const metadata: Metadata = {
  title: "Sistem Pakar Racikan Umpan Ikan Mas",
  description: "Racik umpan ikan mas dari bahan yang tersedia. Sistem pakar menggabungkan aturan kondisi, fungsi bahan, resep, ulasan, dan laporan pemancing.",
};

export default function ExpertSystemPage() {
  return <PageShell><main className="mx-auto min-h-[70vh] max-w-7xl px-5 pb-16 pt-8 sm:px-8 sm:pt-12"><ExpertSystem /></main><Footer /></PageShell>;
}
