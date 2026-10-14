import { getRecipeRatings } from "@/lib/review-summary";

export const dynamic = "force-dynamic";

/**
 * Ringkasan rating per resep untuk kartu katalog.
 * Hanya ulasan asli yang sudah disetujui dan tidak bertanggal masa depan.
 */
export async function GET() {
  return Response.json({ ratings: await getRecipeRatings() }, { headers: { "Cache-Control": "no-store" } });
}
