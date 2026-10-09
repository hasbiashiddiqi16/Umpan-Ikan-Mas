import type { Recipe } from "@/data/recipes";
import { calculateMatchScore, type UserPreferences } from "@/lib/recommendation";
import { EmptyState } from "@/components/shared";
import { RecipeCard } from "@/components/recipe-card";

export function RecipeGrid({ recipes, preferences, featuredSlug }: { recipes: Recipe[]; preferences?: UserPreferences; featuredSlug?: string }) {
  if (recipes.length === 0) return <EmptyState />;
  const sorted = preferences
    ? [...recipes].sort((a, b) => calculateMatchScore(b, preferences) - calculateMatchScore(a, preferences))
    : recipes;
  return <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{sorted.map((recipe, index) => <RecipeCard key={recipe.slug} recipe={recipe} matchScore={preferences ? calculateMatchScore(recipe, preferences) : undefined} featured={recipe.slug === featuredSlug || (!featuredSlug && index === 0)} />)}</div>;
}
