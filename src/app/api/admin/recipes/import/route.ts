import { inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { cmsRecipes, cmsReviews } from "@/db/schema";
import { normalizeFishingText, normalizeFishingType, normalizeFishingTypes } from "@/data/recipes";
import { recipes } from "@/data/recipes";
import { reviews } from "@/data/reviews";
import { requireAdminApi } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const reviewSyncBatchSize = 500;
const months: Record<string, number> = {
  Januari: 0,
  Februari: 1,
  Maret: 2,
  April: 3,
  Mei: 4,
  Juni: 5,
  Juli: 6,
  Agustus: 7,
  September: 8,
  Oktober: 9,
  November: 10,
  Desember: 11,
};

function seedReviewDate(value: string) {
  const [day, month, year] = value.split(" ");
  const monthIndex = months[month];
  const timestamp = Date.UTC(Number(year), monthIndex, Number(day), 12);
  return Number.isFinite(timestamp) ? new Date(timestamp) : new Date("2026-01-01T12:00:00.000Z");
}

/**
 * Sinkronisasi ini sengaja eksplisit dari Content Studio: resep sumber diperbarui
 * mengikuti katalog terkini dan ulasan contoh memakai seed_key agar aman dijalankan
 * berulang kali tanpa menduplikasi 5.000 data awal.
 */
export async function POST() {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;

  try {
    const recipeValues = recipes.map((recipe) => ({
      slug: recipe.slug,
      title: recipe.name,
      summary: normalizeFishingText(recipe.summary),
      category: recipe.category,
      status: "published",
      image: recipe.image,
      price: recipe.price,
      priceValue: recipe.priceValue,
      difficulty: recipe.difficulty,
      rating: Math.round(recipe.rating * 10),
      reviewCount: recipe.reviewCount,
      users: recipe.users,
      popularity: recipe.popularity,
      weather: recipe.weather,
      water: recipe.water,
      fishingTypes: normalizeFishingTypes(recipe.fishingTypes),
      provinces: recipe.provinces,
      seasons: recipe.seasons,
      ingredients: recipe.ingredients,
      steps: recipe.steps,
      suitable: recipe.suitable.map(normalizeFishingText),
      notSuitable: recipe.notSuitable.map(normalizeFishingText),
      author: "Tim UMPAN MAS",
    }));
    const existingRecipes = await db.select({ slug: cmsRecipes.slug }).from(cmsRecipes).where(inArray(cmsRecipes.slug, recipes.map((recipe) => recipe.slug)));
    const existingRecipeSlugs = new Set(existingRecipes.map((recipe) => recipe.slug));
    const now = new Date();
    await db.insert(cmsRecipes).values(recipeValues).onConflictDoUpdate({
      target: cmsRecipes.slug,
      set: {
        title: sql`excluded.title`,
        summary: sql`excluded.summary`,
        category: sql`excluded.category`,
        status: sql`excluded.status`,
        image: sql`excluded.image`,
        price: sql`excluded.price`,
        priceValue: sql`excluded.price_value`,
        difficulty: sql`excluded.difficulty`,
        rating: sql`excluded.rating_tenths`,
        reviewCount: sql`excluded.review_count`,
        users: sql`excluded.users`,
        popularity: sql`excluded.popularity`,
        weather: sql`excluded.weather`,
        water: sql`excluded.water`,
        fishingTypes: sql`excluded.fishing_types`,
        provinces: sql`excluded.provinces`,
        seasons: sql`excluded.seasons`,
        ingredients: sql`excluded.ingredients`,
        steps: sql`excluded.steps`,
        suitable: sql`excluded.suitable`,
        notSuitable: sql`excluded.not_suitable`,
        author: sql`excluded.author`,
        updatedAt: now,
      },
    });

    const reviewValues = reviews.map((review) => {
      if (!review.seedKey) throw new Error("Kunci ulasan katalog tidak tersedia.");
      return {
        seedKey: review.seedKey,
        recipeSlug: review.recipeSlug,
        name: review.name,
        location: review.location,
        rating: review.rating,
        weather: review.weather,
        water: review.water,
        fishingType: normalizeFishingType(review.fishingType ?? "Harian"),
        catchCount: review.catchCount ?? null,
        comment: review.comment,
        status: "approved",
        createdAt: seedReviewDate(review.date),
      };
    });
    let importedReviews = 0;
    for (let offset = 0; offset < reviewValues.length; offset += reviewSyncBatchSize) {
      const batch = reviewValues.slice(offset, offset + reviewSyncBatchSize);
      const inserted = await db.insert(cmsReviews).values(batch).onConflictDoNothing({ target: cmsReviews.seedKey }).returning({ id: cmsReviews.id });
      importedReviews += inserted.length;
    }

    return Response.json({
      recipes: {
        total: recipes.length,
        created: recipes.length - existingRecipeSlugs.size,
        updated: existingRecipeSlugs.size,
      },
      reviews: {
        total: reviews.length,
        created: importedReviews,
        existing: reviews.length - importedReviews,
      },
    });
  } catch {
    return Response.json({ error: "Katalog dashboard belum dapat disinkronkan. Coba lagi." }, { status: 503 });
  }
}
