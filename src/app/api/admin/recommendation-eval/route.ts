import { and, eq, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { cmsRecipes, cmsReviews } from "@/db/schema";
import { requireAdminApi } from "@/lib/admin-auth";
import { cmsRecipeToRecipe, normalizeCmsRecipeRecord, type CmsRecipeRecord } from "@/lib/cms";
import { databaseErrorResponse } from "@/lib/database-status";
import { buildRecommendationEvalReport, type EvalReview } from "@/lib/recommendation-eval";

export const dynamic = "force-dynamic";

/**
 * Laporan evaluasi hit-rate@3 untuk urutan rekomendasi.
 *
 * Dipakai dashboard dan `npm run eval:rekomendasi`. Sumbernya sama dengan
 * halaman publik: resep basis data yang dipublikasikan dan ulasan nyata
 * yang sudah disetujui. Ulasan tanpa persetujuan tidak pernah ikut dihitung.
 */
export async function GET() {
  const unauthorized = await requireAdminApi("konten");
  if (unauthorized) return unauthorized;

  try {
    const [managedRows, reviewRows] = await Promise.all([
      db.select().from(cmsRecipes).where(eq(cmsRecipes.status, "published")),
      db
        .select({
          recipeSlug: cmsReviews.recipeSlug,
          rating: cmsReviews.rating,
          weather: cmsReviews.weather,
          water: cmsReviews.water,
          waterBody: cmsReviews.waterBody,
          fishingType: cmsReviews.fishingType,
          location: cmsReviews.location,
          catchCount: cmsReviews.catchCount,
          sessionMinutes: cmsReviews.sessionMinutes,
          rodCount: cmsReviews.rodCount,
        })
        .from(cmsReviews)
        .where(and(eq(cmsReviews.status, "approved"), lte(cmsReviews.createdAt, sql`now()`))),
    ]);

    const managed = managedRows.map((row) => cmsRecipeToRecipe(normalizeCmsRecipeRecord(row as unknown as CmsRecipeRecord)));
    const catalog = managed;

    const report = buildRecommendationEvalReport(catalog, reviewRows as EvalReview[]);
    return Response.json(report, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return databaseErrorResponse(error, "Evaluasi rekomendasi belum dapat dihitung.");
  }
}
