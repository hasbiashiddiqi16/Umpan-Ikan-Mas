import type { Metadata } from "next";
import { PageShell } from "@/components/navigation";
import { Footer } from "@/components/shared";
import { CatalogView } from "@/components/catalog-view";

export const metadata: Metadata = {
  title: "Katalog Umpan Ikan Mas | UMPAN MAS",
  description: "Jelajahi dan saring racikan umpan ikan mas berdasarkan bahan, cuaca, air, budget, dan jenis kolam.",
};

export default function KatalogPage() {
  return <PageShell><main className="mx-auto min-h-[70vh] max-w-7xl px-5 py-10 sm:px-8 sm:py-14"><CatalogView /></main><Footer /></PageShell>;
}
