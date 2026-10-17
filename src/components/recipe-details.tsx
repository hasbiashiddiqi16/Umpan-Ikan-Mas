import { Check, Clock3, Minus, X } from "lucide-react";
import { ReviewReportButton } from "@/components/review-report-button";
import { OPTIONAL_ADDITIONS_NOTE, type Ingredient } from "@/data/recipes";
import type { RecipeReview } from "@/data/reviews";
import { Badge, CatchIcon, FishingTypeIcon, Rating, WaterBodyIcon, WaterIcon, WeatherIcon } from "@/components/shared";
import { catchBadges } from "@/lib/catch-details";

const cardMetaBadgeClass = "h-7 w-[106px] shrink-0 justify-center justify-self-center whitespace-nowrap !px-2 !text-[11px]";

export function IngredientTable({ ingredients }: { ingredients: Ingredient[] }) {
  const mainIngredients = ingredients.filter((ingredient) => !ingredient.optional);
  const optionalIngredients = ingredients.filter((ingredient) => ingredient.optional);
  return (
    <div className="overflow-hidden rounded-2xl border border-[#e6eae3] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#edf0eb] bg-[#f7f9f5] px-4 py-3.5 sm:px-5">
        <p className="text-sm font-bold text-[#304334]">Bahan racikan</p>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="sage">{mainIngredients.length} bahan</Badge>
          {optionalIngredients.length > 0 && <Badge tone="gold">{optionalIngredients.length} tambahan opsional</Badge>}
        </div>
      </div>

      <ul className="divide-y divide-[#eff1ed] sm:hidden" aria-label="Daftar bahan racikan">
        {mainIngredients.map((ingredient, index) => (
          <li key={`${ingredient.name}-${index}`} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-[#eff4ec] text-[10px] font-bold text-[#5a715c] (4.56:1 terburuk)">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <p className="min-w-0 break-words text-sm font-semibold leading-5 text-[#354639]">{ingredient.name}</p>
              </div>
              <p className="max-w-[42%] shrink-0 break-words text-right text-sm font-bold leading-5 text-[#405241]">{ingredient.amount}</p>
            </div>
            <p className="mt-2 ml-9 break-words text-xs leading-5 text-[#666d65] (4.57:1 terburuk)">
              <span className="mr-1 font-semibold text-[#616d60] (4.66:1 terburuk)">Merek / catatan:</span>{ingredient.brand}
            </p>
          </li>
        ))}
      </ul>

      <div className="hidden sm:block">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead className="bg-white text-[10px] font-bold uppercase tracking-[.12em] text-[#90988e]">
            <tr>
              <th className="px-4 py-3 sm:px-5">Bahan</th>
              <th className="px-4 py-3">Merek / catatan</th>
              <th className="px-4 py-3 text-right sm:px-5">Takaran</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#eff1ed]">
            {mainIngredients.map((ingredient, index) => (
              <tr key={`${ingredient.name}-${index}`} className="transition hover:bg-[#fafbf8]">
                <td className="break-words px-4 py-3.5 font-semibold text-[#354639] sm:px-5">
                  <span className="mr-3 inline-grid h-6 w-6 place-items-center rounded-lg bg-[#eff4ec] text-[10px] font-bold text-[#5a715c] (4.56:1 terburuk)">{String(index + 1).padStart(2, "0")}</span>
                  {ingredient.name}
                </td>
                <td className="break-words px-4 py-3.5 text-[#666d65] (4.57:1 terburuk)">{ingredient.brand}</td>
                <td className="break-words px-4 py-3.5 text-right font-bold text-[#405241] sm:px-5">{ingredient.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {optionalIngredients.length > 0 && (
        <div className="border-t border-[#edf0eb] bg-[#fbf9f2] px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold text-[#55492f]">Tambahan opsional</p>
            <span className="rounded-full bg-[#f6ecd4] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[.1em] text-[#846720] (4.57:1 terburuk)">boleh dilewati</span>
          </div>
          <p className="mt-1.5 text-xs leading-5 text-[#6f6b5e] (4.57:1 terburuk)">Tambahkan bila bahannya tersedia. Resep tetap bisa dipakai tanpa bagian ini.</p>
          <ul className="mt-3 grid gap-2.5 sm:grid-cols-2" aria-label="Tambahan opsional">
            {optionalIngredients.map((ingredient) => (
              <li key={`${ingredient.name}-${ingredient.amount}`} className="flex items-start justify-between gap-3 rounded-xl border border-[#efe7d3] bg-white px-3.5 py-3">
                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold leading-5 text-[#3d4a3f]">{ingredient.name}</p>
                  <p className="mt-0.5 break-words text-xs leading-5 text-[#686c64] (4.60:1 terburuk)">
                    <span className="font-semibold text-[#646e62] (4.56:1 terburuk)">Merek / catatan:</span> {ingredient.brand}
                  </p>
                </div>
                <p className="shrink-0 text-right text-sm font-bold leading-5 text-[#4a5a47]">{ingredient.amount}</p>
              </li>
            ))}
          </ul>
          <p className="mt-3 break-words rounded-xl bg-white px-3.5 py-2.5 text-xs leading-5 text-[#676a63] (4.72:1 terburuk)">{OPTIONAL_ADDITIONS_NOTE}</p>
        </div>
      )}
    </div>
  );
}

export function PreparationSteps({ steps }: { steps: string[] }) {
  return (
    <div className="rounded-2xl border border-[#e6eae3] bg-white p-4 sm:p-5">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-bold text-[#304334]">Cara meracik</h3>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#f5f4ed] px-3 py-1.5 text-xs font-semibold text-[#656c5c] (4.68:1 terburuk)"><Clock3 size={13} /> ± 25 menit</span>
      </div>
      <ol className="space-y-4">
        {steps.map((step, index) => (
          <li key={step} className="flex items-start gap-3.5">
            <span className={`relative grid h-9 w-9 shrink-0 place-items-center rounded-xl text-xs font-extrabold ${index === steps.length - 1 ? "bg-[#294b34] text-white" : "bg-[#edf3e9] text-[#47684b]"}`}>
              {String(index + 1).padStart(2, "0")}
              {index < steps.length - 1 && <span className="absolute -bottom-4 left-1/2 h-4 w-px bg-[#dce6d9]" />}
            </span>
            <p className="min-w-0 break-words pt-1 text-sm leading-6 text-[#5e6a5e]">{step}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function ConditionTags({ suitable, notSuitable }: { suitable: string[]; notSuitable: string[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="min-w-0 rounded-2xl border border-[#dce9d9] bg-[#f4f8f2] p-4 sm:p-5">
        <h3 className="flex items-center gap-2 text-sm font-bold text-[#365d3c]"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#e1efdf]"><Check size={15} /></span>Cocok untuk</h3>
        <ul className="mt-4 grid gap-2.5">
          {suitable.map((item) => <li key={item} className="flex min-w-0 items-start gap-2 text-sm leading-5 text-[#566857]"><Check size={14} className="mt-0.5 shrink-0 text-[#4e724c] (4.70:1 terburuk)" /><span className="min-w-0 break-words">{item}</span></li>)}
        </ul>
      </div>
      <div className="min-w-0 rounded-2xl border border-[#eee7db] bg-[#fbf8f2] p-4 sm:p-5">
        <h3 className="flex items-center gap-2 text-sm font-bold text-[#766346]"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#f2eadd]"><Minus size={15} /></span>Kurang direkomendasikan</h3>
        <ul className="mt-4 grid gap-2.5">
          {notSuitable.map((item) => <li key={item} className="flex min-w-0 items-start gap-2 text-sm leading-5 text-[#706a5e] (4.61:1 terburuk)"><X size={14} className="mt-0.5 shrink-0 text-[#83653f] (4.62:1 terburuk)" /><span className="min-w-0 break-words">{item}</span></li>)}
        </ul>
      </div>
    </div>
  );
}

export function ReviewCard({ review }: { review: RecipeReview }) {
  const idLaporan = typeof review.id === "number" ? review.id : (review as { serverId?: number }).serverId;
  // Ulasan contoh wajib berlabel supaya tidak tertukar dengan kiriman pengunjung.
  return (
    <article className="flex h-full min-w-0 flex-col rounded-2xl border border-[#e7eae4] bg-white p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5"><h3 className="break-words text-sm font-bold text-[#304033]">{review.name}</h3>{review.sample && <Badge tone="cream" className="!text-[10px]">Data contoh</Badge>}{review.status === "pending" && <Badge tone="gold" className="!text-[10px]">Menunggu pemeriksaan</Badge>}</div>
          <p className="mt-1 break-words text-xs text-[#676d66] (4.55:1 terburuk)">{review.location} · {review.date}</p>
        </div>
        <Rating value={review.rating} compact />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-1.5 min-[440px]:grid-cols-3"><Badge className={cardMetaBadgeClass}><WeatherIcon weather={review.weather} /> {review.weather}</Badge><Badge tone="cream" className={cardMetaBadgeClass}><WaterIcon /> {review.water}</Badge>{review.waterBody && <Badge tone="cream" className={cardMetaBadgeClass}><WaterBodyIcon /> {review.waterBody}</Badge>}{review.fishingType && <Badge tone="cream" className={cardMetaBadgeClass}><FishingTypeIcon /> {review.fishingType}</Badge>}{catchBadges(review).map((badge) => <Badge key={badge.label} tone="cream" className={cardMetaBadgeClass}><CatchIcon icon={badge.icon} /> {badge.label}</Badge>)}</div>
      <p className="mt-4 break-words text-sm leading-6 text-[#626e62] (4.59:1 terburuk)">“{review.comment}”</p>
      {idLaporan && !review.sample && review.status !== "pending" ? <ReviewReportButton reviewId={idLaporan} /> : null}
    </article>
  );
}
