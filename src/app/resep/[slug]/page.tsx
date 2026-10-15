import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, CloudRain, Droplets, Fish, Gauge, MapPin, PenLine, Sparkles, Wallet, Waves } from "lucide-react";
import { PageShell } from "@/components/navigation";
import { Footer, SectionHeader } from "@/components/shared";
import { FavoriteButton } from "@/components/favorite-button";
import { IngredientTable, PreparationSteps, ConditionTags } from "@/components/recipe-details";
import { LiveRecipeRating, RecipeReviewSection } from "@/components/recipe-review-section";
import { MatchOrPopularBox, MatchOrPopularChip } from "@/components/match-or-popular";
import { recipeBadge } from "@/lib/recipe-badge";
import { RecipeCard } from "@/components/recipe-card";
import { recipes } from "@/data/recipes";
import { reviews } from "@/data/reviews";
import { db } from "@/db";
import { cmsRecipes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { cmsRecipeToRecipe, type CmsRecipeRecord } from "@/lib/cms";
import { formatCount } from "@/lib/utils";
import { JsonLd } from "@/components/json-ld";
import { absoluteUrl, createPageMetadata, siteOrigin } from "@/lib/seo";

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
  if (!recipe) {
    return { title: "Resep tidak ditemukan", robots: { index: false, follow: false } };
  }

  return createPageMetadata({
    title: `Resep Umpan Ikan Mas ${recipe.name}`,
    description: `${recipe.summary} Lihat bahan, takaran, dan langkah meraciknya.`,
    path: `/resep/${recipe.slug}`,
    image: recipe.image,
    imageAlt: recipe.imageAlt,
    openGraphType: "article",
  });
}

export function generateStaticParams() {
  return recipes.map((recipe) => ({ slug: recipe.slug }));
}

export default async function RecipeDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const recipe = await findRecipe(slug);
  if (!recipe) notFound();
  // Hanya contoh ulasan berlabel yang dikirim ke halaman: bukan bukti komunitas.
  const sampleReviews = reviews.filter((review) => review.recipeSlug === recipe.slug && review.sample);
  const recipeUrl = absoluteUrl(`/resep/${recipe.slug}`);
  const homeUrl = absoluteUrl("/");
  const catalogUrl = absoluteUrl("/katalog");
  const recipeImageUrl = absoluteUrl(recipe.image);
  const breadcrumbStructuredData = recipeUrl && homeUrl && catalogUrl
    ? {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Beranda", item: homeUrl },
          { "@type": "ListItem", position: 2, name: "Katalog Umpan", item: catalogUrl },
          { "@type": "ListItem", position: 3, name: recipe.name, item: recipeUrl },
        ],
      }
    : undefined;
  const recipeStructuredData = recipeUrl && recipeImageUrl
    ? {
        "@context": "https://schema.org",
        "@type": "Recipe",
        name: recipe.name,
        description: recipe.summary,
        image: [recipeImageUrl],
        url: recipeUrl,
        recipeCuisine: "Indonesia",
        recipeCategory: recipe.category,
        recipeYield: "1 sesi mancing",
        prepTime: "PT25M",
        totalTime: "PT25M",
        recipeIngredient: recipe.ingredients.map((ingredient) =>
          `${ingredient.amount} ${ingredient.name}${ingredient.brand && ingredient.brand !== "-" ? ` (${ingredient.brand})` : ""}${ingredient.optional ? " — opsional" : ""}`,
        ),
        recipeInstructions: recipe.steps.map((text, index) => ({
          "@type": "HowToStep",
          position: index + 1,
          text,
        })),
        keywords: ["umpan ikan mas", recipe.name, recipe.category, ...recipe.weather, ...recipe.water, ...recipe.provinces].join(", "),
        ...(siteOrigin ? { isPartOf: { "@id": `${siteOrigin}/#website` } } : {}),
      }
    : undefined;
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
      {recipeStructuredData && <JsonLd data={recipeStructuredData} />}
      {breadcrumbStructuredData && <JsonLd data={breadcrumbStructuredData} />}
      <main className="mx-auto min-w-0 max-w-7xl px-4 pb-40 pt-6 sm:px-8 sm:pt-9 lg:pb-16">
        <nav aria-label="Breadcrumb" className="mb-5 text-xs font-medium text-[#636d63] (4.62:1 terburuk)">
          <ol className="flex min-w-0 items-center gap-2">
            <li><Link href="/" className="hover:text-[#31593a]">Beranda</Link></li>
            <li aria-hidden="true">/</li>
            <li><Link href="/katalog" className="hover:text-[#31593a]">Katalog Umpan</Link></li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="truncate text-[#536253]">{recipe.name}</li>
          </ol>
        </nav>
        <section className="min-w-0 overflow-hidden rounded-[28px] border border-[#e5e9e2] bg-white shadow-[0_12px_38px_rgba(38,55,40,.07)]">
          <div className="grid lg:grid-cols-[.95fr_1.05fr]">
            <div className="relative min-h-[270px] overflow-hidden bg-[#e4e3d6] sm:min-h-[380px] lg:min-h-[440px]"><Image src={recipe.image} alt={recipe.imageAlt} fill sizes="(max-width: 1023px) 100vw, 48vw" className="object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-[#1b3022]/35 via-transparent to-transparent" /><span title={recipeBadge(recipe).title} className="absolute bottom-4 left-4 max-w-[calc(100%-2rem)] break-words rounded-full border border-white/60 bg-white/90 px-3 py-1.5 text-xs font-bold text-[#3a513d] backdrop-blur-sm">{recipeBadge(recipe).label} · Ikan mas</span></div>
            <div className="min-w-0 flex flex-col justify-center p-5 sm:p-8 lg:p-10">
              <div className="flex flex-wrap items-center gap-2"><span title="Resep dari katalog UMPAN MAS yang dikurasi redaksi — bukan kiriman pengunjung" className="rounded-full bg-[#f6efdb] px-3 py-1.5 text-xs font-bold text-[#846621] (4.62:1 terburuk)">Racikan katalog</span><MatchOrPopularChip recipe={recipe} /></div>
              <h1 className="mt-4 break-words text-3xl font-black tracking-[-.04em] text-[#213426] sm:text-4xl lg:text-[2.75rem]">{recipe.name}</h1>
              <p className="mt-3 max-w-xl break-words text-sm leading-6 text-[#636d63] (4.62:1 terburuk)">{recipe.summary}</p>
              <div className="mt-4 min-w-0"><LiveRecipeRating recipe={recipe} /></div>
              <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3">{information.map(({ label, value, icon: Icon }) => <div key={label} className="min-w-0 rounded-xl border border-[#edf0eb] bg-[#fafbf8] p-3"><Icon size={16} className="text-[#5c705c] (4.59:1 terburuk)" /><p className="mt-2 text-[10px] font-bold uppercase tracking-[.1em] text-[#969d94]">{label}</p><p className="mt-1 break-words text-xs font-bold leading-5 text-[#405142]">{value}</p></div>)}</div>
              <div className="mt-6 flex flex-wrap gap-2"><Link href="#bahan" className="inline-flex min-h-11 max-w-full items-center justify-center gap-2 rounded-xl bg-[#294b34] px-5 text-sm font-bold text-white transition hover:bg-[#1f3c29]"><Fish size={16} aria-hidden="true" /> Gunakan Resep Ini</Link><FavoriteButton recipeSlug={recipe.slug} className="inline-flex min-h-11 max-w-full items-center justify-center gap-2 rounded-xl border border-[#e2e8df] bg-white px-4 text-sm font-bold text-[#526352] transition hover:bg-[#f5f8f2]" /><Link href="#ulasan" className="inline-flex min-h-11 max-w-full items-center justify-center gap-2 rounded-xl border border-[#e2e8df] bg-white px-4 text-sm font-bold text-[#526352] transition hover:bg-[#f5f8f2]"><PenLine size={15} aria-hidden="true" /> Tulis ulasan</Link></div>
              <p className="mt-4 flex min-w-0 items-start gap-2 text-xs leading-5 text-[#91988f]"><MapPin size={14} className="mt-0.5 shrink-0" />Cocok dicoba di beberapa daerah. Karakter air dan respons ikan dapat berbeda di tiap kolam.</p>
            </div>
          </div>
        </section>

        <div className="mt-10 grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-10">
            <section id="bahan" className="scroll-mt-24"><SectionHeader eyebrow="Siapkan sebelum berangkat" title="Bahan yang dibutuhkan" subtitle="Takaran untuk satu sesi. Sesuaikan kelembapan adonan sedikit demi sedikit." /><IngredientTable ingredients={recipe.ingredients} /></section>
            <section><SectionHeader eyebrow="Ikuti langkahnya" title="Cara meracik" subtitle="Persiapan sekitar 25 menit, termasuk waktu mengukus bila dibutuhkan." /><PreparationSteps steps={recipe.steps} /></section>
            <section><SectionHeader eyebrow="Catatan kondisi" title="Cocok untuk kondisi apa?" subtitle="Gunakan ini sebagai titik awal dan sesuaikan dengan karakter kolammu." /><ConditionTags suitable={recipe.suitable} notSuitable={recipe.notSuitable} /></section>
            <RecipeReviewSection recipe={recipe} sampleReviews={sampleReviews} />
          </div>
          <aside className="min-w-0 space-y-5 lg:sticky lg:top-24 lg:self-start">
            <div className="min-w-0 rounded-[22px] border border-[#e1e8dd] bg-[#f4f8f1] p-5"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e6efe1] text-[#49694b]"><Sparkles size={19} /></span><h2 className="mt-4 text-lg font-extrabold text-[#304333]">Kenapa direkomendasikan?</h2><p className="mt-2 text-sm leading-6 text-[#616e62] (4.60:1 terburuk)">Skor kecocokan hanya menghitung kondisi yang kamu isi sendiri: air, cuaca, jenis pemancingan, provinsi, dan musim. Tanpa isian, tidak ada persentase yang ditampilkan. Ini panduan awal, bukan jaminan hasil.</p><div className="mt-4"><MatchOrPopularBox recipe={recipe} /></div></div>
            <div className="min-w-0 rounded-[22px] border border-[#e7eae4] bg-white p-5"><h2 className="text-sm font-extrabold text-[#304033]">Saran kecil sebelum mancing</h2><ul className="mt-4 space-y-3 text-sm leading-5 text-[#636d63] (4.62:1 terburuk)"><li className="flex gap-2"><Check size={15} className="mt-0.5 shrink-0 text-[#597059] (4.64:1 terburuk)" />Siapkan air tambahan untuk mengatur tekstur.</li><li className="flex gap-2"><Check size={15} className="mt-0.5 shrink-0 text-[#597059] (4.64:1 terburuk)" />Gunakan essen sedikit dulu, lalu sesuaikan.</li><li className="flex gap-2"><Check size={15} className="mt-0.5 shrink-0 text-[#597059] (4.64:1 terburuk)" />Catat cuaca dan kondisi kolam saat mencoba.</li></ul></div>
          </aside>
        </div>
        <section className="mt-16"><SectionHeader eyebrow="Mungkin juga cocok" title="Racikan lainnya" action={<Link href="/katalog" className="text-sm font-bold text-[#365b3b]">Lihat katalog <ArrowLeft className="ml-1 inline rotate-180" size={14} /></Link>} /><div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{recipes.filter((item) => item.slug !== recipe.slug).slice(0, 3).map((item, index) => <RecipeCard key={item.slug} recipe={item} />)}</div></section>
      </main>
      <div className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-40 border-t border-[#e5e9e2] bg-white/95 p-3 backdrop-blur-lg sm:px-6 lg:hidden"><Link href="#bahan" className="mx-auto flex min-h-12 max-w-xl items-center justify-center rounded-xl bg-[#294b34] text-sm font-bold text-white shadow-lg"><Fish size={16} aria-hidden="true" /> Gunakan Resep Ini</Link></div>
      <Footer />
    </PageShell>
  );
}
