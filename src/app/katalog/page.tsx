import type { Metadata } from "next";
import { PageShell } from "@/components/navigation";
import { Footer } from "@/components/shared";
import { CatalogView } from "@/components/catalog-view";
import { createPageMetadata } from "@/lib/seo";
import { getPublicRecipeData } from "@/lib/public-recipes";

export const metadata: Metadata = createPageMetadata({
  title: "Katalog Resep Umpan Ikan Mas",
  description: "Jelajahi resep umpan ikan mas, saring berdasarkan bahan, cuaca, kondisi air, budget, jenis kolam, dan provinsi — plus baca cerita dan ulasan komunitas pemancing.",
  path: "/katalog",
});

/**
 * ISR satu jam (plus revalidasi on-demand saat resep disimpan dari
 * dashboard): daftar awal katalog dirender server dari sumber resep
 * publik yang sama dengan dashboard, jadi hitungan "racikan ditemukan"
 * dan per kategorinya sudah benar sejak HTML pertama — bukan menunggu
 * pengambilan data di peramban.
 */
export const revalidate = 3600;

export default async function KatalogPage() {
  const data = await getPublicRecipeData();
  return <PageShell><main className="mx-auto min-h-[70vh] max-w-7xl px-5 py-10 sm:px-8 sm:py-14"><CatalogView initialRecipes={data.recipes} initialManagedSlugs={data.managedSlugs} /></main><Footer /></PageShell>;
}
