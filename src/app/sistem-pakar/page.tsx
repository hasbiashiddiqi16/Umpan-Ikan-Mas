import type { Metadata } from "next";
import { Footer } from "@/components/shared";
import { PageShell } from "@/components/navigation";
import { ExpertSystem } from "@/components/expert-system";
import { createPageMetadata } from "@/lib/seo";
import { getPublicRecipeData } from "@/lib/public-recipes";

export const metadata: Metadata = createPageMetadata({
  title: "Sistem Pakar Racikan Umpan Ikan Mas",
  description: "Racik umpan ikan mas dari bahan yang tersedia dengan panduan kondisi kolam, fungsi bahan, dan resep komunitas.",
  path: "/sistem-pakar",
});

/** ISR satu jam + revalidasi on-demand: basis pengetahuan awal berasal dari sumber resep publik yang sama dengan dashboard. */
export const revalidate = 3600;

export default async function ExpertSystemPage() {
  const data = await getPublicRecipeData();
  return <PageShell><main className="mx-auto min-h-[70vh] max-w-7xl px-5 pb-16 pt-8 sm:px-8 sm:pt-12"><ExpertSystem initialRecipes={data.recipes} initialManagedSlugs={data.managedSlugs} /></main><Footer /></PageShell>;
}
