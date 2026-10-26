"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, FlaskConical, ListOrdered, RefreshCw } from "lucide-react";
import { ChartHeading } from "@/components/admin/analytics-charts";

type HitRate = { evaluable: number; hits: number; hitRate: number | null };

export type RecommendationEvalPayload = {
  generatedAt: string;
  weightsVersion: string;
  weights: Record<string, number>;
  topK: number;
  minRating: number;
  highCatchMin: number;
  minStrictReviewsForTuning: number;
  criteria: { minRating: number; highCatchPerHourMin: number; minSessionMinutesForRate: number; highCatchMin: number };
  ringkasan: {
    approvedRealReviews: number;
    withCatchCount: number;
    withSessionMinutes: number;
    withRodCount: number;
    strictSuccess: number;
    ratingSuccess: number;
    strictAbsoluteOnly: number;
    skippedUnknownRecipe: number;
  };
  current: { strict: HitRate; ratingOnly: HitRate };
  candidates: { nama: string; strict: HitRate; ratingOnly: HitRate }[];
  recommendation: { dapatDituning: boolean; namaTerbaik: string | null; selisihHitRate: number | null; alasan: string };
};

const LABELS: Record<string, string> = {
  waterBody: "Tipe air",
  water: "Kondisi air",
  weather: "Cuaca",
  fishingType: "Jenis pemancingan",
  season: "Musim",
  province: "Provinsi",
};

export function formatHitRate(hasil: HitRate): string {
  if (hasil.hitRate === null) return "—";
  return `${(hasil.hitRate * 100).toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`;
}

export function RecommendationEvalPanel() {
  const [data, setData] = useState<RecommendationEvalPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError("");
      void fetch("/api/admin/recommendation-eval", { cache: "no-store", signal: controller.signal })
        .then(async (response) => {
          const body = await response.json() as RecommendationEvalPayload & { error?: string };
          if (!response.ok) throw new Error(body.error ?? "Evaluasi rekomendasi belum dapat dimuat.");
          return body;
        })
        .then((payload) => setData(payload))
        .catch((caught) => { if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "Evaluasi rekomendasi belum dapat dimuat."); })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [refreshToken]);

  const bobot = Object.entries(data?.weights ?? {}).sort((a, b) => b[1] - a[1]);

  return (
    <section className="mt-4 rounded-[20px] border border-[#e7ebe5] bg-white p-4 sm:p-5 lg:p-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <ChartHeading icon={ListOrdered} label={`Uji urutan rekomendasi · hit-rate@${data?.topK ?? 3}`} note={`Apakah resep yang berhasil (rating ≥ ${data?.criteria?.minRating ?? 4} dan laju tangkapan ≥ ${data?.criteria?.highCatchPerHourMin ?? 1.5} ekor/jam, sesi ≥ ${data?.criteria?.minSessionMinutesForRate ?? 60} menit) muncul di ${data?.topK ?? 3} teratas?`} />
        <button type="button" onClick={() => setRefreshToken((value) => value + 1)} className="inline-flex min-h-9 shrink-0 items-center justify-center gap-2 self-start rounded-lg border border-[#e3e8e1] bg-white px-3 text-[10px] font-bold text-[#59685a] hover:bg-[#f6f8f4]"><RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Hitung ulang</button>
      </div>

      {error && <p role="alert" className="mt-4 rounded-xl border border-[#eedbd3] bg-[#fbf1ed] px-4 py-3 text-xs font-semibold text-[#995744]">{error}</p>}

      {data && (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-[#f5f7f3] p-3.5"><p className="text-[10px] font-bold text-[#666d64] (4.58:1 terburuk)">Hit-rate@3 (ketat)</p><p className="mt-1 text-2xl font-black text-[#2d402f]">{loading ? "—" : formatHitRate(data.current.strict)}</p><p className="mt-1 text-[10px] text-[#666d65] (4.57:1 terburuk)">{data.current.strict.evaluable ? `${data.current.strict.hits} dari ${data.current.strict.evaluable} ulasan berhasil` : "Belum ada ulasan yang bisa dinilai"}</p></div>
            <div className="rounded-xl bg-[#f5f7f3] p-3.5"><p className="text-[10px] font-bold text-[#666d64] (4.58:1 terburuk)">Hit-rate@3 (rating saja)</p><p className="mt-1 text-2xl font-black text-[#2d402f]">{loading ? "—" : formatHitRate(data.current.ratingOnly)}</p><p className="mt-1 text-[10px] text-[#666d65] (4.57:1 terburuk)">{data.current.ratingOnly.evaluable ? `${data.current.ratingOnly.hits} dari ${data.current.ratingOnly.evaluable} ulasan` : "Belum ada ulasan rating ≥ 4"}</p></div>
            <div className="rounded-xl bg-[#f5f7f3] p-3.5"><p className="text-[10px] font-bold text-[#666d64] (4.58:1 terburuk)">Ringkasan ulasan nyata</p><p className="mt-1 text-2xl font-black text-[#2d402f]">{data.ringkasan.approvedRealReviews}</p><p className="mt-1 text-[10px] leading-4 text-[#666d65] (4.57:1 terburuk)">{data.ringkasan.withCatchCount} menyertakan angka tangkapan · {data.ringkasan.withSessionMinutes} menyebut durasi · {data.ringkasan.withRodCount} menyebut jumlah joran · {data.ringkasan.strictSuccess} dinilai berhasil</p></div>
          </div>

          <div className={`mt-4 flex items-start gap-2 rounded-xl border px-4 py-3 text-[11px] leading-5 ${data.recommendation.dapatDituning ? "border-[#cfe0cb] bg-[#f1f7ef] text-[#43603f]" : "border-[#eadfc2] bg-[#fbf7ec] text-[#776a45]"}`}>
            {data.recommendation.dapatDituning ? <CheckCircle2 size={14} className="mt-0.5 shrink-0" /> : <AlertTriangle size={14} className="mt-0.5 shrink-0" />}
            <span>
              <strong className="font-extrabold">{data.recommendation.dapatDituning ? `Ringkasan sudah cukup: kandidat “${data.recommendation.namaTerbaik}” terbaik` : "Bobot belum bisa dituning"}</strong> — {data.recommendation.alasan}
            </span>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
            <div>
              <p className="text-[11px] font-extrabold text-[#435445]">Bobot yang dipakai sekarang <span className="font-semibold text-[#666d65] (4.57:1 terburuk)">· {data.weightsVersion}</span></p>
              <ul className="mt-2 divide-y divide-[#eff1ed] rounded-xl border border-[#eef0ec]">
                {bobot.map(([key, nilai]) => <li key={key} className="flex items-center justify-between gap-3 px-3.5 py-2 text-[11px]"><span className="font-semibold text-[#4b5b4d]">{LABELS[key] ?? key}</span><span className="font-black tabular-nums text-[#31593a]">{nilai}</span></li>)}
              </ul>
              <p className="mt-2 text-[10px] leading-5 text-[#666d65] (4.57:1 terburuk)">Bobot ini masih dugaan awal dan hanya berubah lewat <code className="rounded bg-[#f2f5f0] px-1">src/lib/recommendation-config.ts</code> setelah evaluasi.</p>
            </div>
            <div>
              <p className="text-[11px] font-extrabold text-[#435445]">Kandidat bobot yang diuji</p>
              <ul className="mt-2 divide-y divide-[#eff1ed] rounded-xl border border-[#eef0ec]">
                {data.candidates.map((kandidat) => <li key={kandidat.nama} className="flex items-center justify-between gap-3 px-3.5 py-2 text-[11px]"><span className="min-w-0 truncate font-semibold text-[#4b5b4d]">{kandidat.nama}</span><span className="shrink-0 font-black tabular-nums text-[#31593a]">{formatHitRate(kandidat.strict)}</span></li>)}
              </ul>
              <p className="mt-2 text-[10px] leading-5 text-[#666d65] (4.57:1 terburuk)">{data.ringkasan.skippedUnknownRecipe ? `${data.ringkasan.skippedUnknownRecipe} ulasan dilewati karena resepnya tidak ada di katalog. ` : ""}Ulasan tanpa durasi sesi belum bisa dibandingkan, jadi tidak dihitung sebagai &ldquo;tangkapan tinggi&rdquo;{data.ringkasan.strictAbsoluteOnly ? ` — ada ${data.ringkasan.strictAbsoluteOnly} ulasan seperti itu` : ""}. Semuanya tetap ikut hit-rate versi longgar (rating saja).</p>
            </div>
          </div>
        </>
      )}

      {!data && !error && <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-[#666d64] (4.58:1 terburuk)"><FlaskConical size={14} /> Menghitung hit-rate@3 dari ulasan nyata…</div>}

      <p className="mt-4 rounded-xl bg-[#f6f8f4] px-3.5 py-3 text-[10px] leading-5 text-[#646d63] (4.61:1 terburuk)">
        Angka ini dihitung dari ulasan nyata yang sudah disetujui, dan ulasan yang sedang diuji selalu dikeluarkan dari bukti pemutus seri.
      </p>
    </section>
  );
}
