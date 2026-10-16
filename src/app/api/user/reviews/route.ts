import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { cmsRecipes, cmsReviews } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth-user";
import { databaseErrorResponse } from "@/lib/database-status";

export const dynamic = "force-dynamic";

/** Ulasan yang pernah dikirim pengguna (semua status moderasi). */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Masuk dulu untuk melanjutkan." }, { status: 401 });
  try {
    const rows = await db.select().from(cmsReviews).where(eq(cmsReviews.userId, user.id)).orderBy(desc(cmsReviews.createdAt));
    const slugs = [...new Set(rows.map((row) => row.recipeSlug))];
    const judul = new Map<string, string>();
    if (slugs.length) {
      const resep = await db.select({ slug: cmsRecipes.slug, title: cmsRecipes.title }).from(cmsRecipes).where(inArray(cmsRecipes.slug, slugs));
      resep.forEach((item) => judul.set(item.slug, item.title));
    }
    return Response.json({
      reviews: rows.map((row) => ({
        id: row.id,
        recipeSlug: row.recipeSlug,
        recipeTitle: judul.get(row.recipeSlug) ?? row.recipeSlug,
        rating: row.rating,
        comment: row.comment,
        status: row.status,
        createdAt: row.createdAt,
        location: row.location,
        weather: row.weather,
        water: row.water,
        fishingType: row.fishingType,
      })),
    });
  } catch (error) {
    return databaseErrorResponse(error, "Ulasan kamu belum dapat dimuat.");
  }
}
