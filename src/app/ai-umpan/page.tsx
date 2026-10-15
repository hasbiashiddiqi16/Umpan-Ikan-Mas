import type { Metadata } from "next";
import { PageShell } from "@/components/navigation";
import { Footer } from "@/components/shared";
import { AIWizard } from "@/components/ai-wizard";
import { createPageMetadata } from "@/lib/seo";
import { getPublicRecipeData } from "@/lib/public-recipes";

export const metadata: Metadata = createPageMetadata({
  title: "Rekomendasi Umpan Ikan Mas",
  description: "Temukan rekomendasi racikan umpan ikan mas berdasarkan lokasi, cuaca, kondisi air, jenis kolam, dan budget memancingmu.",
  path: "/ai-umpan",
});

/** ISR satu jam + revalidasi on-demand: kolam rekomendasi awal berasal dari sumber resep publik yang sama dengan dashboard. */
export const revalidate = 3600;

export default async function AIUmpanPage() {
  const data = await getPublicRecipeData();
  return <PageShell><main className="mx-auto min-h-[70vh] max-w-7xl px-5 pb-16 pt-10 sm:px-8 sm:pt-14"><AIWizard initialRecipes={data.recipes} initialManagedSlugs={data.managedSlugs} /></main><Footer /></PageShell>;
}
