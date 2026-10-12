import type { Metadata } from "next";
import { PageShell } from "@/components/navigation";
import { Footer } from "@/components/shared";
import { CatalogView } from "@/components/catalog-view";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Katalog Resep Umpan Ikan Mas",
  description: "Jelajahi resep umpan ikan mas dan saring berdasarkan bahan, cuaca, kondisi air, budget, jenis kolam, serta provinsi.",
  path: "/katalog",
});

export default function KatalogPage() {
  return <PageShell><main className="mx-auto min-h-[70vh] max-w-7xl px-5 py-10 sm:px-8 sm:py-14"><CatalogView /></main><Footer /></PageShell>;
}
