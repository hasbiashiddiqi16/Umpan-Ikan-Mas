import type { Recipe } from "@/data/recipes";

export function searchRecipes(recipes: Recipe[], query: string): Recipe[] {
  const normalizedQuery = query.trim().toLocaleLowerCase("id-ID");
  if (!normalizedQuery) return recipes;

  return recipes.filter((recipe) => {
    const searchableText = [
      recipe.name,
      recipe.category,
      recipe.provinces.join(" "),
      recipe.ingredients.map((ingredient) => `${ingredient.name} ${ingredient.brand}`).join(" "),
      recipe.summary,
    ].join(" ").toLocaleLowerCase("id-ID");
    return searchableText.includes(normalizedQuery);
  });
}
