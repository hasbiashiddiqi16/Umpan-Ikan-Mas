import { getRatingSummary } from "@/lib/review-summary";

export const dynamic = "force-dynamic";

/**
 * Ringkasan rating per resep untuk kartu katalog.
 *
 * Hanya ulasan asli yang sudah disetujui dan tidak bertanggal masa depan.
 * Selain peta rating, endpoint ini mengirim `global` (rata-rata seluruh ulasan =
 * nilai `C` pada rata-rata Bayesian) dan `minReviews` (= `m`) supaya urutan
 * "Rating Tertinggi" di katalog memakai angka yang sama dengan server.
 */
export async function GET() {
  const { ratings, global, minReviews } = await getRatingSummary();
  return Response.json({ ratings, global, minReviews }, { headers: { "Cache-Control": "no-store" } });
}
