import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, CloudRain, Droplets, Fish, Gauge, MapPin, Sparkles, Wallet, Waves } from "lucide-react";
import { PageShell } from "@/components/navigation";
import { Footer, SectionHeader } from "@/components/shared";
import { FavoriteButton } from "@/components/favorite-button";
import { IngredientTable, PreparationSteps, ConditionTags } from "@/components/recipe-details";
import { LiveRecipeRating, RecipeReviewSection } from "@/components/recipe-review-section";
import { RecipeCard } from "@/components/recipe-card";
import { recipes, defaultPreferences } from "@/data/recipes";
import { reviews } from "@/data/reviews";
import { db } from "@/db";
import { cmsRecipes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { cmsRecipeToRecipe, type CmsRecipeRecord } from "@/lib/cms";
import { calculateMatchScore } from "@/lib/recommendation";
import { formatCount } from "@/lib/utils";

export const dynamicParams = true;

async function findRecipe(slug: string) {
  try {
    const [record] = await db.select().from(cmsRecipes).where(eq(cmsRecipes.slug, slug)).limit(1);
    if (record) return record.status === "published" ? cmsRecipeToRecipe(record as CmsRecipeRecord) : undefined;
  } catch {
    // Seed recipes remain available when PostgreSQL is temporarily unavailable.
  }
  return recipes.find((item) => item.slug === slug);
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const recipe = await findRecipe(slug);
  return recipe ? { title: `${recipe.name} — Resep Umpan Ikan Mas`, description: recipe.summary } : { title: "Resep tidak ditemukan" };
}

export function generateStaticParams() {
  return recipes.map((recipe) => ({ slug: recipe.slug }));
}

export default async function RecipeDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const recipe = await findRecipe(slug);
  if (!recipe) notFound();
  const matchScore = calculateMatchScore(recipe, defaultPreferences);
  const recipeReviews = reviews.filter((review) => review.recipeSlug === recipe.slug);
  const information = [
    { label: "Target", value: "Ikan mas", icon: Fish },
    { label: "Cuaca", value: recipe.weather.slice(0, 2).join(" · "), icon: CloudRain },
    { label: "Kondisi air", value: recipe.water.join(" · "), icon: Droplets },
    { label: "Jenis kolam", value: recipe.fishingTypes.join(" · "), icon: Waves },
    { label: "Budget", value: recipe.price, icon: Wallet },
    { label: "Kesulitan", value: recipe.difficulty, icon: Gauge },
  ];
  return (
    <PageShell>
      <main className="mx-auto max-w-7xl px-5 pb-32 pt-6 sm:px-8 sm:pt-9 lg:pb-16">
        <div className="mb-5 flex items-center gap-2 text-xs font-medium text-[#849084]"><Link href="/katalog" className="inline-flex items-center gap-1 hover:text-[#31593a]"><ArrowLeft size={14} /> Katalog</Link><span>/</span><span className="truncate text-[#536253]">{recipe.name}</span></div>
        <section className="overflow-hidden rounded-[28px] border border-[#e5e9e2] bg-white shadow-[0_12px_38px_rgba(38,55,40,.07)]">
          <div className="grid lg:grid-cols-[.95fr_1.05fr]">
            <div className="relative min-h-[270px] overflow-hidden bg-[#e4e3d6] sm:min-h-[380px] lg:min-h-[440px]"><Image src={recipe.image} alt={`Bahan racikan ${recipe.name}`} fill priority sizes="(max-width: 1024px) 100vw, 48vw" className="object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-[#1b3022]/35 via-transparent to-transparent" /><span className="absolute bottom-4 left-4 rounded-full border border-white/60 bg-white/90 px-3 py-1.5 text-xs font-bold text-[#3a513d] backdrop-blur-sm">{recipe.category} · Ikan mas</span></div>
            <div className="flex flex-col justify-center p-5 sm:p-8 lg:p-10">
              <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#f6efdb] px-3 py-1.5 text-xs font-bold text-[#876822]">🏆 Racikan komunitas</span><span className="rounded-full bg-[#eaf2e8] px-3 py-1.5 text-xs font-bold text-[#416245]">{matchScore}% match</span></div>
              <h1 className="mt-4 text-3xl font-black tracking-[-.04em] text-[#213426] sm:text-4xl lg:text-[2.75rem]">{recipe.name}</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[#758075]">{recipe.summary}</p>
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2"><LiveRecipeRating recipe={recipe} /></div>
              <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3">{information.map(({ label, value, icon: Icon }) => <div key={label} className="rounded-xl border border-[#edf0eb] bg-[#fafbf8] p-3"><Icon size={16} className="text-[#6d856d]" /><p className="mt-2 text-[10px] font-bold uppercase tracking-[.1em] text-[#969d94]">{label}</p><p className="mt-1 text-xs font-bold leading-5 text-[#405142]">{value}</p></div>)}</div>
              <div className="mt-6 flex flex-wrap gap-2"><Link href="#bahan" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#294b34] px-5 text-sm font-bold text-white transition hover:bg-[#1f3c29]">🎣 Gunakan Resep Ini</Link><FavoriteButton recipeSlug={recipe.slug} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#e2e8df] bg-white px-4 text-sm font-bold text-[#526352] transition hover:bg-[#f5f8f2]" /><Link href="#ulasan" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#e2e8df] bg-white px-4 text-sm font-bold text-[#526352] transition hover:bg-[#f5f8f2]">✍️ Tulis ulasan</Link></div>
              <p className="mt-4 inline-flex items-start gap-2 text-xs leading-5 text-[#91988f]"><MapPin size={14} className="mt-0.5 shrink-0" />Cocok dicoba di beberapa daerah. Karakter air dan respons ikan dapat berbeda di tiap kolam.</p>
            </div>
          </div>
        </section>

        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-10">
            <section id="bahan" className="scroll-mt-24"><SectionHeader eyebrow="Siapkan sebelum berangkat" title="Bahan yang dibutuhkan" subtitle="Takaran untuk satu sesi. Sesuaikan kelembapan adonan sedikit demi sedikit." /><IngredientTable ingredients={recipe.ingredients} /></section>
            <section><SectionHeader eyebrow="Ikuti langkahnya" title="Cara meracik" subtitle="Persiapan sekitar 25 menit, termasuk waktu mengukus bila dibutuhkan." /><PreparationSteps steps={recipe.steps} /></section>
            <section><SectionHeader eyebrow="Catatan kondisi" title="Cocok untuk kondisi apa?" subtitle="Gunakan ini sebagai titik awal dan sesuaikan dengan karakter kolammu." /><ConditionTags suitable={recipe.suitable} notSuitable={recipe.notSuitable} /></section>
            <RecipeReviewSection recipe={recipe} seedReviews={recipeReviews} />
          </div>
          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-[22px] border border-[#e1e8dd] bg-[#f4f8f1] p-5"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e6efe1] text-[#49694b]"><Sparkles size={19} /></span><h2 className="mt-4 text-lg font-extrabold text-[#304333]">Kenapa direkomendasikan?</h2><p className="mt-2 text-sm leading-6 text-[#69786a]">Skor kecocokan menghitung kesesuaian cuaca, air, jenis kolam, daerah, rating, dan popularitas. Ini panduan awal, bukan jaminan hasil.</p><div className="mt-4 flex items-center gap-2 rounded-xl bg-white px-3.5 py-3"><span className="text-2xl font-black text-[#31593a]">{matchScore}%</span><div><p className="text-xs font-bold text-[#415342]">Match pilihan awal</p><p className="text-[10px] text-[#8b9489]">Jawa Barat · Hujan · Keruh</p></div></div></div>
            <div className="rounded-[22px] border border-[#e7eae4] bg-white p-5"><h2 className="text-sm font-extrabold text-[#304033]">Saran kecil sebelum mancing</h2><ul className="mt-4 space-y-3 text-sm leading-5 text-[#697469]"><li className="flex gap-2"><Check size={15} className="mt-0.5 shrink-0 text-[#678267]" />Siapkan air tambahan untuk mengatur tekstur.</li><li className="flex gap-2"><Check size={15} className="mt-0.5 shrink-0 text-[#678267]" />Gunakan essen sedikit dulu, lalu sesuaikan.</li><li className="flex gap-2"><Check size={15} className="mt-0.5 shrink-0 text-[#678267]" />Catat cuaca dan kondisi kolam saat mencoba.</li></ul></div>
          </aside>
        </div>
        <section className="mt-16"><SectionHeader eyebrow="Mungkin juga cocok" title="Racikan lainnya" action={<Link href="/katalog" className="text-sm font-bold text-[#365b3b]">Lihat katalog <ArrowLeft className="ml-1 inline rotate-180" size={14} /></Link>} /><div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{recipes.filter((item) => item.slug !== recipe.slug).slice(0, 3).map((item, index) => <RecipeCard key={item.slug} recipe={item} matchScore={calculateMatchScore(item, defaultPreferences)} featured={index === 0} />)}</div></section>
      </main>
      <div className="fixed inset-x-0 bottom-[70px] z-40 border-t border-[#e5e9e2] bg-white/95 p-3 backdrop-blur-lg sm:px-6 lg:hidden"><Link href="#bahan" className="mx-auto flex min-h-12 max-w-xl items-center justify-center rounded-xl bg-[#294b34] text-sm font-bold text-white shadow-lg">🎣 Gunakan Resep Ini</Link></div>
      <Footer />
    </PageShell>
  );
}
