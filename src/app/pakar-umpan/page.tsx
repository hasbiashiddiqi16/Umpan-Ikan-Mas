import type { Metadata } from "next";
import { Footer } from "@/components/shared";
import { PageShell } from "@/components/navigation";
import { PakarUmpan } from "@/components/pakar-umpan";
import { createPageMetadata } from "@/lib/seo";
import { readAppearance } from "@/lib/appearance-server";
import { HERO_ALT } from "@/lib/brand";
import { getPublicRecipeData } from "@/lib/public-recipes";

export async function generateMetadata(): Promise<Metadata> {
  const { hero } = await readAppearance();
  return createPageMetadata({
    title: "Pakar Umpan Ikan Mas",
    description: "Pilih bahan yang tersedia, lalu terima contoh komposisi 150 g, kondisi dominan dari resep terdekat, dan resep yang paling mendekati pilihanmu.",
    path: "/pakar-umpan",
    image: hero.url,
    imageAlt: HERO_ALT,
  });
}

/** ISR satu jam + revalidasi on-demand: basis pengetahuan awal berasal dari sumber resep publik yang sama dengan dashboard. */
export const revalidate = 3600;

export default async function PakarUmpanPage() {
  const data = await getPublicRecipeData();
  return <PageShell><main className="mx-auto min-h-[70vh] max-w-7xl px-5 pb-16 pt-8 sm:px-8 sm:pt-12"><PakarUmpan initialRecipes={data.recipes} initialManagedSlugs={data.managedSlugs} /></main><Footer /></PageShell>;
}
