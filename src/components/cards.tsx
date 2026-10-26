import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check, Cloud, CloudRain, CloudSun, MapPin, Medal, Sun, Users } from "lucide-react";
import type { Recipe } from "@/data/recipes";
import type { Province } from "@/data/provinces";
import { Badge, RecipeRating } from "@/components/shared";
import { describeRating } from "@/lib/rating-utils";
import { fishingTypeTag, recipeBadge } from "@/lib/recipe-badge";
import { formatCount } from "@/lib/utils";

/**
 * Jumlah "N racikan" di kartu cuaca **dihitung dari daftar resep publik**
 * yang dioper pemanggil, bukan ditulis manual: satu sumber dengan hasil
 * penyaringan di halaman cuaca.
 * "Musim Hujan"/"Musim Panas" adalah nama musim, "Mendung"/"Cerah" nama cuaca.
 */
export const weatherStyles = [
  { name: "Musim Hujan", slug: "musim-hujan", icon: CloudRain, color: "bg-[#e8f0ef] text-[#456e70]", description: "Racikan yang banyak digunakan saat hujan dan suhu air berubah.", musim: ["Musim Hujan"], cuaca: ["Hujan"] },
  { name: "Musim Panas", slug: "musim-panas", icon: Sun, color: "bg-[#f8efd9] text-[#86652b] (4.61:1 terburuk)", description: "Pilihan beraroma ringan untuk hari cerah dan air lebih hangat.", musim: ["Musim Panas", "Kemarau"], cuaca: ["Panas", "Cerah"] },
  { name: "Mendung", slug: "mendung", icon: Cloud, color: "bg-[#edf0ed] text-[#5d6f64] (4.59:1 terburuk)", description: "Racikan fleksibel untuk cuaca teduh dan kondisi yang berubah.", musim: [], cuaca: ["Mendung", "Berawan"] },
  { name: "Cerah", slug: "cerah", icon: CloudSun, color: "bg-[#f5f0e1] text-[#7d6737] (4.66:1 terburuk)", description: "Racikan natural untuk visibilitas air yang cenderung lebih baik.", musim: [], cuaca: ["Cerah", "Panas"] },
];

export function jumlahRacikanUntuk(item: (typeof weatherStyles)[number], publicRecipes: readonly Recipe[]) {
  return publicRecipes.filter(
    (recipe) => recipe.seasons.some((musim) => item.musim.includes(musim)) || recipe.weather.some((cuaca) => item.cuaca.includes(cuaca)),
  ).length;
}

export function WeatherCard({ index = 0, count = 0 }: { index?: number; count?: number }) {
  const item = weatherStyles[index % weatherStyles.length];
  const Icon = item.icon;
  return (
    <Link id={item.slug} href={`/cuaca#${item.slug}`} className="group flex h-full min-h-[220px] flex-col justify-between rounded-[22px] border border-[#e6eae3] bg-white p-5 transition hover:-translate-y-1 hover:shadow-[0_15px_36px_rgba(36,56,40,.09)] sm:p-6">
      <div>
        <div className="flex items-center justify-between">
          <span className={`grid h-12 w-12 place-items-center rounded-2xl ${item.color}`}><Icon size={23} strokeWidth={1.8} /></span>
        </div>
        <h3 className="mt-5 text-lg font-extrabold text-[#293b2c]">{item.name}</h3>
        <p className="mt-2 min-h-12 text-sm leading-5 text-[#646d64] (4.60:1 terburuk)">{item.description}</p>
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-[#edf0eb] pt-4">
        <span className="text-xs font-semibold text-[#676d66] (4.55:1 terburuk)" title="Jumlah racikan katalog yang cocok dengan cuaca atau musim ini">{count} racikan</span>
        <span className="inline-flex items-center gap-1 text-xs font-bold text-[#375e3d]">Lihat umpan <ArrowRight size={14} className="transition group-hover:translate-x-1" /></span>
      </div>
    </Link>
  );
}

export function ProvinceCard({ province, compact = false, popularRecipe }: { province: Province; compact?: boolean; popularRecipe?: string }) {
  return (
    <Link href={`/provinsi/${province.slug}`} className={`group relative flex h-full min-h-[126px] flex-col justify-between overflow-hidden rounded-[20px] border border-[#e5e9e2] bg-white p-4 transition hover:-translate-y-0.5 hover:border-[#cbd8c9] hover:shadow-[0_12px_28px_rgba(37,55,40,.08)] ${compact ? "min-w-[205px]" : ""}`}>
      <div className="absolute -right-6 -top-8 h-24 w-24 rounded-full bg-[#eef3e9] transition group-hover:scale-125" />
      <div className="relative flex items-start justify-between gap-2">
        <div><p className="max-w-[165px] text-sm font-extrabold text-[#2b3c2e]">{province.name}</p><p className="mt-1 text-xs text-[#666d65] (4.57:1 terburuk)">{province.recipeCount} racikan</p></div>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#f7f8f4] text-[#5e705e] (4.55:1 terburuk) transition group-hover:bg-[#31593a] group-hover:text-white"><ArrowUpRight size={15} /></span>
      </div>
      {!compact && <div className="relative mt-4 flex items-center gap-1.5 text-[11px] text-[#676d66] (4.55:1 terburuk)"><MapPin size={12} /> {popularRecipe ? <>Populer: <span className="truncate font-semibold text-[#536252]">{popularRecipe}</span></> : <span className="font-semibold text-[#626c62] (4.69:1 terburuk)">Belum ada ulasan pengunjung</span>}</div>}
      {compact && <p className="relative mt-3 truncate text-[11px] font-semibold text-[#626c62] (4.69:1 terburuk)">{popularRecipe ? `Populer: ${popularRecipe}` : "Belum ada ulasan pengunjung"}</p>}
    </Link>
  );
}

export function RecommendationCard({ recipe, score, isPrimary = false, rating }: { recipe: Recipe; score: number; isPrimary?: boolean; rating?: { count: number; average: number } }) {
  // Badge dari field data resep (jenis pemancingan), bukan tulisan per kartu.
  const badge = recipeBadge(recipe);
  return (
    <article className={`overflow-hidden rounded-[26px] border bg-white ${isPrimary ? "border-[#d7e1d3] shadow-[0_18px_50px_rgba(39,68,44,.09)]" : "border-[#e8ebe5]"}`}>
      <div className={`grid md:grid-cols-[.88fr_1.12fr] ${isPrimary ? "" : ""}`}>
        <div className="relative min-h-[220px] bg-[#e5e5d7] md:min-h-[280px]">
          <Image src={recipe.image} alt={recipe.imageAlt} fill sizes="(max-width: 768px) 100vw, (max-width: 1280px) 44vw, 560px" className="object-cover" />
          <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1.5 text-xs font-extrabold text-[#35573a] shadow-sm">{isPrimary ? <span className="inline-flex items-center gap-1.5"><Medal size={13} aria-hidden="true" /> TERBAIK UNTUKMU</span> : "ALTERNATIF"}</span>
          <span className="absolute bottom-4 right-4 grid h-[66px] w-[66px] place-items-center rounded-full border-4 border-white bg-[#244732] text-center text-white shadow-lg"><span><strong className="block text-xl leading-none">{score}%</strong><small className="mt-1 block text-[8px] font-bold uppercase tracking-wider text-white/75">match</small></span></span>
        </div>
        <div className="p-5 sm:p-7">
          <div className="flex flex-wrap items-center gap-2"><Badge tone={badge.tone} title={badge.title}>{badge.label}</Badge><RecipeRating rating={rating} /></div>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-[#25372a] sm:text-3xl">{recipe.name}</h2>
          <p className="mt-2 text-sm leading-6 text-[#636d63] (4.62:1 terburuk)">{recipe.summary}</p>
          {isPrimary && <div className="mt-4 rounded-xl bg-[#f3f7f1] p-3.5 text-sm leading-6 text-[#526653]">Racikan ini paling dekat dengan kondisi pilihanmu, dari kecocokan cuaca, air, jenis kolam, daerah, rating, dan pengalaman komunitas.</div>}
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-[#566456] sm:grid-cols-4">
            <span className="inline-flex items-center gap-1 rounded-lg bg-[#f5f7f3] px-2.5 py-2"><Check size={12} aria-hidden="true" /> {recipe.weather[0]}</span><span className="inline-flex items-center gap-1 rounded-lg bg-[#f5f7f3] px-2.5 py-2"><Check size={12} aria-hidden="true" /> Air {recipe.water[0].toLowerCase()}</span><span className="inline-flex items-center gap-1 rounded-lg bg-[#f5f7f3] px-2.5 py-2"><Check size={12} aria-hidden="true" /> {fishingTypeTag(recipe)}</span><span className="inline-flex items-center gap-1 rounded-lg bg-[#f5f7f3] px-2.5 py-2"><Check size={12} aria-hidden="true" /> {recipe.difficulty}</span>
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#edf0eb] pt-4">
            <div><p className="text-[10px] font-bold uppercase tracking-[.13em] text-[#949c92]">Estimasi biaya</p><p className="mt-0.5 text-sm font-extrabold text-[#293a2c]">{recipe.price}</p></div>
            <Link href={`/resep/${recipe.slug}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#294b34] px-5 text-sm font-bold text-white transition hover:bg-[#203d29]">Lihat Resep <ArrowRight size={16} /></Link>
          </div>
          {isPrimary && rating && rating.count > 0 && <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-[#919a90]" title={describeRating(rating)}><Users size={13} /> {formatCount(rating.count)} pemancing mencoba</p>}
        </div>
      </div>
    </article>
  );
}
