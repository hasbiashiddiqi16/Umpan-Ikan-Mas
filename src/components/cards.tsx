import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Cloud, CloudRain, CloudSun, MapPin, Sun, Users } from "lucide-react";
import type { Recipe } from "@/data/recipes";
import type { Province } from "@/data/provinces";
import type { FishingReport } from "@/data/fishingReports";
import { Badge, Rating } from "@/components/shared";
import { formatCount } from "@/lib/utils";

const weatherStyles = [
  { name: "Musim Hujan", slug: "musim-hujan", icon: CloudRain, emoji: "🌧️", color: "bg-[#e8f0ef] text-[#456e70]", description: "Racikan yang banyak digunakan saat hujan dan suhu air berubah.", count: 48 },
  { name: "Musim Panas", slug: "musim-panas", icon: Sun, emoji: "☀️", color: "bg-[#f8efd9] text-[#926e2f]", description: "Pilihan beraroma ringan untuk hari cerah dan air lebih hangat.", count: 36 },
  { name: "Mendung", slug: "mendung", icon: Cloud, emoji: "☁️", color: "bg-[#edf0ed] text-[#5f7166]", description: "Racikan fleksibel untuk cuaca teduh dan kondisi yang berubah.", count: 42 },
  { name: "Cerah", slug: "cerah", icon: CloudSun, emoji: "🌤️", color: "bg-[#f5f0e1] text-[#8e753e]", description: "Racikan natural untuk visibilitas air yang cenderung lebih baik.", count: 31 },
];

export function WeatherCard({ index = 0 }: { index?: number }) {
  const item = weatherStyles[index % weatherStyles.length];
  const Icon = item.icon;
  return (
    <Link id={item.slug} href={`/cuaca#${item.slug}`} className="group flex min-h-[220px] flex-col justify-between rounded-[22px] border border-[#e6eae3] bg-white p-5 transition hover:-translate-y-1 hover:shadow-[0_15px_36px_rgba(36,56,40,.09)] sm:p-6">
      <div>
        <div className="flex items-center justify-between">
          <span className={`grid h-12 w-12 place-items-center rounded-2xl ${item.color}`}><Icon size={23} strokeWidth={1.8} /></span>
          <span className="text-2xl" aria-hidden="true">{item.emoji}</span>
        </div>
        <h3 className="mt-5 text-lg font-extrabold text-[#293b2c]">{item.name}</h3>
        <p className="mt-2 min-h-12 text-sm leading-5 text-[#778076]">{item.description}</p>
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-[#edf0eb] pt-4">
        <span className="text-xs font-semibold text-[#899187]">{item.count} racikan</span>
        <span className="inline-flex items-center gap-1 text-xs font-bold text-[#375e3d]">Lihat umpan <ArrowRight size={14} className="transition group-hover:translate-x-1" /></span>
      </div>
    </Link>
  );
}

export function ProvinceCard({ province, compact = false }: { province: Province; compact?: boolean }) {
  return (
    <Link href={`/provinsi/${province.slug}`} className={`group relative flex min-h-[126px] flex-col justify-between overflow-hidden rounded-[20px] border border-[#e5e9e2] bg-white p-4 transition hover:-translate-y-0.5 hover:border-[#cbd8c9] hover:shadow-[0_12px_28px_rgba(37,55,40,.08)] ${compact ? "min-w-[205px]" : ""}`}>
      <div className="absolute -right-6 -top-8 h-24 w-24 rounded-full bg-[#eef3e9] transition group-hover:scale-125" />
      <div className="relative flex items-start justify-between gap-2">
        <div><p className="max-w-[165px] text-sm font-extrabold text-[#2b3c2e]">{province.name}</p><p className="mt-1 text-xs text-[#848c83]">{province.recipeCount} racikan</p></div>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#f7f8f4] text-[#607260] transition group-hover:bg-[#31593a] group-hover:text-white"><ArrowUpRight size={15} /></span>
      </div>
      {!compact && <div className="relative mt-4 flex items-center gap-1.5 text-[11px] text-[#838a80]"><MapPin size={12} /> Populer: <span className="truncate font-semibold text-[#536252]">{province.popularRecipe}</span></div>}
      {compact && <p className="relative mt-3 text-[11px] font-semibold text-[#667166]">{formatCount(province.reportCount)} cerita pemancing</p>}
    </Link>
  );
}

export function CommunityCard({ report, showPhoto = false }: { report: FishingReport; showPhoto?: boolean }) {
  const photo = report.recipeSlug.includes("jagung") ? "/images/recipe-jagung.jpg" : report.recipeSlug.includes("pandan") ? "/images/recipe-pelet.jpg" : "/images/recipe-putih.jpg";
  return (
    <article className="overflow-hidden rounded-[22px] border border-[#e6eae3] bg-white shadow-[0_8px_26px_rgba(41,55,43,.04)]">
      {showPhoto && <div className="relative h-48 overflow-hidden bg-[#e9e6da]"><Image src={photo} alt={`Racikan ${report.recipe} yang digunakan oleh ${report.name}`} fill sizes="(max-width: 768px) 90vw, 35vw" className="object-cover" /></div>}
      <div className="p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-xs font-bold text-[#405543]" style={{ backgroundColor: report.color }}>{report.initials}</span>
          <div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div><h3 className="text-sm font-extrabold text-[#2b3b2d]">{report.name}</h3><p className="mt-1 flex items-center gap-1 text-xs text-[#879087]"><MapPin size={12} />{report.location}</p></div><span className="shrink-0 text-[11px] text-[#a0a69d]">{report.date}</span></div></div>
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5"><Badge>{report.weather === "Hujan" ? "🌧️" : report.weather === "Cerah" ? "☀️" : "☁️"} {report.weather}</Badge><Badge tone="cream">💧 {report.water}</Badge><Badge tone="cream">🎣 {report.fishingType}</Badge></div>
        <div className="mt-4 flex items-center justify-between rounded-xl bg-[#f6f8f4] px-3.5 py-3"><div><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#8b9489]">Racikan dicoba</p><Link href={`/resep/${report.recipeSlug}`} className="mt-0.5 block text-sm font-bold text-[#35573a] hover:underline">{report.recipe}</Link></div><div className="text-right"><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#8b9489]">Hasil sesi</p><p className="mt-0.5 text-sm font-extrabold text-[#2b3b2d]">{report.catchCount} ekor</p></div></div>
        <p className="mt-4 text-sm leading-6 text-[#687268]">“{report.comment}”</p>
        <div className="mt-4 flex items-center justify-between border-t border-[#edf0eb] pt-3"><Rating value={report.rating} compact /><Link href={`/resep/${report.recipeSlug}`} className="text-xs font-bold text-[#35573a] hover:underline">Lihat detail <ArrowRight size={13} className="ml-1 inline" /></Link></div>
      </div>
    </article>
  );
}

export function RecommendationCard({ recipe, score, isPrimary = false }: { recipe: Recipe; score: number; isPrimary?: boolean }) {
  return (
    <article className={`overflow-hidden rounded-[26px] border bg-white ${isPrimary ? "border-[#d7e1d3] shadow-[0_18px_50px_rgba(39,68,44,.09)]" : "border-[#e8ebe5]"}`}>
      <div className={`grid md:grid-cols-[.88fr_1.12fr] ${isPrimary ? "" : ""}`}>
        <div className="relative min-h-[220px] bg-[#e5e5d7] md:min-h-[280px]">
          <Image src={recipe.image} alt={`Racikan ${recipe.name}`} fill sizes="(max-width: 768px) 100vw, 38vw" className="object-cover" />
          <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1.5 text-xs font-extrabold text-[#35573a] shadow-sm">{isPrimary ? "🥇 TERBAIK UNTUKMU" : "ALTERNATIF"}</span>
          <span className="absolute bottom-4 right-4 grid h-[66px] w-[66px] place-items-center rounded-full border-4 border-white bg-[#244732] text-center text-white shadow-lg"><span><strong className="block text-xl leading-none">{score}%</strong><small className="mt-1 block text-[8px] font-bold uppercase tracking-wider text-white/75">match</small></span></span>
        </div>
        <div className="p-5 sm:p-7">
          <div className="flex flex-wrap items-center gap-2"><Badge tone="gold">{isPrimary ? "Rekomendasi utama" : "Pilihan lain"}</Badge><Rating value={recipe.rating} count={recipe.reviewCount} /></div>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-[#25372a] sm:text-3xl">{recipe.name}</h2>
          <p className="mt-2 text-sm leading-6 text-[#6c776c]">{recipe.summary}</p>
          {isPrimary && <div className="mt-4 rounded-xl bg-[#f3f7f1] p-3.5 text-sm leading-6 text-[#526653]">Racikan ini paling mendekati kondisi pilihanmu. Rekomendasi mempertimbangkan kecocokan cuaca, air, jenis kolam, daerah, rating, dan pengalaman komunitas.</div>}
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-[#566456] sm:grid-cols-4">
            <span className="rounded-lg bg-[#f5f7f3] px-2.5 py-2">✓ {recipe.weather[0]}</span><span className="rounded-lg bg-[#f5f7f3] px-2.5 py-2">✓ Air {recipe.water[0].toLowerCase()}</span><span className="rounded-lg bg-[#f5f7f3] px-2.5 py-2">✓ {recipe.fishingTypes[0]}</span><span className="rounded-lg bg-[#f5f7f3] px-2.5 py-2">✓ {recipe.difficulty}</span>
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#edf0eb] pt-4">
            <div><p className="text-[10px] font-bold uppercase tracking-[.13em] text-[#949c92]">Estimasi biaya</p><p className="mt-0.5 text-sm font-extrabold text-[#293a2c]">{recipe.price}</p></div>
            <Link href={`/resep/${recipe.slug}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#294b34] px-5 text-sm font-bold text-white transition hover:bg-[#203d29]">Lihat Resep <ArrowRight size={16} /></Link>
          </div>
          {isPrimary && <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-[#919a90]"><Users size={13} /> Dicoba {formatCount(recipe.users)} pemancing</p>}
        </div>
      </div>
    </article>
  );
}
