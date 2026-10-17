import { and, count, desc, eq, isNull, isNotNull, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { cmsReviewReports, cmsReviews } from "@/db/schema";
import { normalizeFishingType } from "@/data/recipes";
import { requireAdminApi } from "@/lib/admin-auth";
import { databaseErrorResponse } from "@/lib/database-status";

export const dynamic = "force-dynamic";

export async function GET() {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;

  try {
    const [reviews, catalogSummary, laporanRows] = await Promise.all([
      // Moderasi hanya memuat kiriman komunitas. Ulasan contoh telah disetujui
      // saat sinkronisasi dan tidak perlu ditinjau satu per satu. Ulasan bertanggal
      // masa depan disembunyikan dari daftar sampai tanggalnya masuk akal.
      db.select().from(cmsReviews).where(and(isNull(cmsReviews.seedKey), lte(cmsReviews.createdAt, sql`now()`))).orderBy(desc(cmsReviews.createdAt)).limit(250),
      db.select({ total: count() }).from(cmsReviews).where(isNotNull(cmsReviews.seedKey)),
      db.select({ reviewId: cmsReviewReports.reviewId, total: count() }).from(cmsReviewReports).where(eq(cmsReviewReports.status, "open")).groupBy(cmsReviewReports.reviewId),
    ]);
    const laporanMap = new Map(laporanRows.map((row) => [row.reviewId, Number(row.total)]));
    return Response.json({
      // Ulasan lama bisa tersimpan dengan sebutan "Galat"; ditampilkan sebagai "Galatama".
      reviews: reviews.map((review) => ({ ...review, fishingType: normalizeFishingType(review.fishingType), laporanTerbuka: laporanMap.get(review.id) ?? 0 })),
      catalogReviewCount: Number(catalogSummary[0]?.total ?? 0),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return databaseErrorResponse(error, "Ulasan belum dapat dimuat.");
  }
}
