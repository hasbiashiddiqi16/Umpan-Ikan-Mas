import { db } from "@/db";
import { cmsRecipes } from "@/db/schema";
import { recipes } from "@/data/recipes";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const values = recipes.map((recipe) => ({
      slug: recipe.slug,
      title: recipe.name,
      summary: recipe.summary,
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
      fishingTypes: recipe.fishingTypes,
      provinces: recipe.provinces,
      seasons: recipe.seasons,
      ingredients: recipe.ingredients,
      steps: recipe.steps,
      suitable: recipe.suitable,
      notSuitable: recipe.notSuitable,
      author: "Tim UMPAN MAS",
    }));
    const inserted = await db.insert(cmsRecipes).values(values).onConflictDoNothing({ target: cmsRecipes.slug }).returning({ id: cmsRecipes.id });
    return Response.json({ imported: inserted.length, skipped: recipes.length - inserted.length, total: recipes.length });
  } catch {
    return Response.json({ error: "Resep contoh belum dapat diimpor. Coba lagi." }, { status: 503 });
  }
}
