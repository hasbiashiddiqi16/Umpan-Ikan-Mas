import { Check, Clock3, Minus, X } from "lucide-react";
import type { Ingredient } from "@/data/recipes";
import type { RecipeReview } from "@/data/reviews";
import { Badge, Rating } from "@/components/shared";

export function IngredientTable({ ingredients }: { ingredients: Ingredient[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#e6eae3] bg-white">
      <div className="flex items-center justify-between border-b border-[#edf0eb] bg-[#f7f9f5] px-4 py-3.5 sm:px-5">
        <p className="text-sm font-bold text-[#304334]">Bahan racikan</p>
        <Badge tone="sage">{ingredients.length} bahan</Badge>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead className="bg-white text-[10px] font-bold uppercase tracking-[.12em] text-[#90988e]"><tr><th className="px-4 py-3 sm:px-5">Bahan</th><th className="px-4 py-3">Merek / catatan</th><th className="px-4 py-3 text-right sm:px-5">Takaran</th></tr></thead>
          <tbody className="divide-y divide-[#eff1ed]">
            {ingredients.map((ingredient, index) => <tr key={`${ingredient.name}-${index}`} className="transition hover:bg-[#fafbf8]"><td className="px-4 py-3.5 font-semibold text-[#354639] sm:px-5"><span className="mr-3 inline-grid h-6 w-6 place-items-center rounded-lg bg-[#eff4ec] text-[10px] font-bold text-[#668068]">{String(index + 1).padStart(2, "0")}</span>{ingredient.name}</td><td className="px-4 py-3.5 text-[#818a80]">{ingredient.brand}</td><td className="px-4 py-3.5 text-right font-bold text-[#405241] sm:px-5">{ingredient.amount}</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function PreparationSteps({ steps }: { steps: string[] }) {
  return (
    <div className="rounded-2xl border border-[#e6eae3] bg-white p-4 sm:p-5">
      <div className="mb-5 flex items-center justify-between"><h3 className="font-bold text-[#304334]">Cara meracik</h3><span className="inline-flex items-center gap-1.5 rounded-full bg-[#f5f4ed] px-3 py-1.5 text-xs font-semibold text-[#737a68]"><Clock3 size={13} /> ± 25 menit</span></div>
      <ol className="space-y-4">
        {steps.map((step, index) => <li key={step} className="flex gap-3.5"><span className={`relative grid h-9 w-9 shrink-0 place-items-center rounded-xl text-xs font-extrabold ${index === steps.length - 1 ? "bg-[#294b34] text-white" : "bg-[#edf3e9] text-[#47684b]"}`}>{String(index + 1).padStart(2, "0")}{index < steps.length - 1 && <span className="absolute -bottom-4 left-1/2 h-4 w-px bg-[#dce6d9]" />}</span><p className="pt-1 text-sm leading-6 text-[#5e6a5e]">{step}</p></li>)}
      </ol>
    </div>
  );
}

export function ConditionTags({ suitable, notSuitable }: { suitable: string[]; notSuitable: string[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-2xl border border-[#dce9d9] bg-[#f4f8f2] p-4 sm:p-5"><h3 className="flex items-center gap-2 text-sm font-bold text-[#365d3c]"><span className="grid h-7 w-7 place-items-center rounded-full bg-[#e1efdf]"><Check size={15} /></span>Cocok untuk</h3><ul className="mt-4 grid gap-2.5">{suitable.map((item) => <li key={item} className="flex items-center gap-2 text-sm text-[#566857]"><Check size={14} className="text-[#5f8a5c]" />{item}</li>)}</ul></div>
      <div className="rounded-2xl border border-[#eee7db] bg-[#fbf8f2] p-4 sm:p-5"><h3 className="flex items-center gap-2 text-sm font-bold text-[#766346]"><span className="grid h-7 w-7 place-items-center rounded-full bg-[#f2eadd]"><Minus size={15} /></span>Kurang direkomendasikan</h3><ul className="mt-4 grid gap-2.5">{notSuitable.map((item) => <li key={item} className="flex items-center gap-2 text-sm text-[#777164]"><X size={14} className="text-[#b28a55]" />{item}</li>)}</ul></div>
    </div>
  );
}

export function ReviewCard({ review }: { review: RecipeReview }) {
  return (
    <article className="rounded-2xl border border-[#e7eae4] bg-white p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-bold text-[#304033]">{review.name}</h3><p className="mt-1 text-xs text-[#8c948b]">{review.location} · {review.date}</p></div><Rating value={review.rating} compact /></div>
      <div className="mt-3 flex flex-wrap gap-1.5"><Badge>{review.weather === "Hujan" ? "🌧️" : review.weather === "Cerah" ? "☀️" : "☁️"} {review.weather}</Badge><Badge tone="cream">💧 {review.water}</Badge>{review.fishingType && <Badge tone="cream">🎣 {review.fishingType}</Badge>}{typeof review.catchCount === "number" && <Badge tone="cream">🐟 {review.catchCount} ekor</Badge>}</div>
      <p className="mt-4 text-sm leading-6 text-[#647064]">“{review.comment}”</p>
    </article>
  );
}
