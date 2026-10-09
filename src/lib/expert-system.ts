import { fishingReports } from "@/data/fishingReports";
import { ingredientKnowledge, type IngredientKnowledge } from "@/data/ingredient-knowledge";
import { recipes, type Recipe } from "@/data/recipes";
import { reviews, type RecipeReview } from "@/data/reviews";
import { calculateMatchScore, filterRecipesByBudget, type UserPreferences } from "@/lib/recommendation";

export type ExpertRecipeResult = { recipe: Recipe; score: number; ingredientFit: number; communityFit: number; contextScore: number };
export type BlendItem = IngredientKnowledge & { percent: number; grams: number };
export type ExpertBlendResult = {
  title: string;
  ingredients: BlendItem[];
  warnings: string[];
  reasoning: string[];
  recipeMatches: ExpertRecipeResult[];
  evidenceCount: number;
};

const normalise = (value: string) => value.toLocaleLowerCase("id-ID").normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export function recipeIngredientIds(recipe: Recipe): string[] {
  const text = normalise(`${recipe.name} ${recipe.ingredients.map((item) => `${item.name} ${item.brand}`).join(" ")}`);
  return ingredientKnowledge.filter((ingredient) => ingredient.keywords.some((keyword) => text.includes(normalise(keyword)))).map((ingredient) => ingredient.id);
}

function getIngredientFit(recipe: Recipe, selectedIds: string[]): number {
  if (!selectedIds.length) return 70;
  const recipeIds = new Set(recipeIngredientIds(recipe));
  return Math.round((selectedIds.filter((id) => recipeIds.has(id)).length / selectedIds.length) * 100);
}

function getCommunityFit(recipe: Recipe, preferences: UserPreferences, communityReviews: RecipeReview[]): number {
  const evidence = communityReviews.filter((review) => review.recipeSlug === recipe.slug);
  if (!evidence.length) return Math.round(recipe.rating * 20);
  const averageRating = evidence.reduce((sum, review) => sum + review.rating, 0) / evidence.length;
  const contextPoints = evidence.map((review) => {
    let checks = 0;
    let matched = 0;
    if (preferences.weather) { checks += 1; if (review.weather === preferences.weather) matched += 1; }
    if (preferences.water) { checks += 1; if (review.water === preferences.water) matched += 1; }
    if (preferences.fishingType && review.fishingType) { checks += 1; if (review.fishingType === preferences.fishingType) matched += 1; }
    return checks ? matched / checks : 0.5;
  });
  const contextAverage = contextPoints.reduce((sum, value) => sum + value, 0) / contextPoints.length;
  return Math.round((averageRating / 5) * 70 + contextAverage * 30);
}

export function rankExpertRecipes(
  preferences: UserPreferences,
  selectedIds: string[] = [],
  communityReviews: RecipeReview[] = reviews,
  sourceRecipes: Recipe[] = recipes,
): ExpertRecipeResult[] {
  const inBudget = filterRecipesByBudget(sourceRecipes, preferences.budget);
  const candidateRecipes = inBudget.length ? inBudget : sourceRecipes;
  return candidateRecipes.map((recipe) => {
    const contextScore = calculateMatchScore(recipe, preferences);
    const ingredientFit = getIngredientFit(recipe, selectedIds);
    const communityFit = getCommunityFit(recipe, preferences, communityReviews);
    // Context rules retain the product's weighted score; recipe/ingredient evidence refines the ranking.
    const score = Math.max(0, Math.min(100, Math.round(contextScore * 0.8 + ingredientFit * 0.12 + communityFit * 0.08)));
    return { recipe, score, ingredientFit, communityFit, contextScore };
  }).sort((a, b) => b.score - a.score || b.recipe.rating - a.recipe.rating || b.recipe.users - a.recipe.users);
}

export function buildExpertBlend(
  selectedIds: string[],
  preferences: UserPreferences,
  communityReviews: RecipeReview[] = reviews,
  sourceRecipes: Recipe[] = recipes,
): ExpertBlendResult | null {
  const uniqueIds = [...new Set(selectedIds)];
  const selected = uniqueIds.map((id) => ingredientKnowledge.find((item) => item.id === id)).filter((item): item is IngredientKnowledge => Boolean(item));
  if (selected.length < 2) return null;

  const totalWeight = selected.reduce((sum, item) => sum + item.weight, 0);
  const rawParts = selected.map((item) => ({ item, exact: (item.weight / totalWeight) * 100 }));
  const parts = rawParts.map(({ item, exact }) => ({ item, amount: Math.floor(exact), remainder: exact - Math.floor(exact) }));
  let remaining = 100 - parts.reduce((sum, part) => sum + part.amount, 0);
  [...parts].sort((a, b) => b.remainder - a.remainder).forEach((part) => {
    if (remaining > 0) { part.amount += 1; remaining -= 1; }
  });
  const blend: BlendItem[] = parts.map(({ item, amount }) => ({ ...item, percent: amount, grams: amount }));
  const roles = new Set(selected.map((item) => item.role));
  const warnings: string[] = [];
  if (!roles.has("Dasar")) warnings.push("Belum ada bahan dasar. Tambahkan pelet ikan atau roti tawar agar campuran punya fondasi.");
  if (!roles.has("Pengikat")) warnings.push("Belum ada bahan pengikat. Sedikit tapioka, terigu, atau telur dapat membantu tekstur lebih menyatu.");
  if (!roles.has("Pelembap")) warnings.push("Tambahkan air atau santan sedikit demi sedikit saat mengaduk; takaran cairan tidak perlu dihabiskan.");
  if (selected.some((item) => item.id === "pandan")) warnings.push("Jika pandan yang dipakai berupa essen, takar dalam tetes terpisah—jangan dihitung sebagai gram adonan.");

  const reasoning: string[] = [
    `Basis racikan memakai ${selected.filter((item) => item.role === "Dasar").map((item) => item.name.toLowerCase()).join(" dan ") || "bahan pilihanmu"}.`,
    roles.has("Pengikat") ? "Bahan pengikat sudah dipilih; uleni perlahan dan sesuaikan kelembapan." : "Kombinasi belum memiliki pengikat, jadi tekstur mungkin lebih mudah lepas.",
  ];
  if (preferences.water === "Keruh") reasoning.push("Air keruh dipilih: mulai dari karakter aroma yang mudah dikenali, lalu uji sedikit demi sedikit di kolam.");
  else if (preferences.water === "Jernih") reasoning.push("Air jernih dipilih: gunakan aroma secara ringan dan hindari menambah banyak essen sekaligus.");
  else if (preferences.water) reasoning.push(`Kondisi air ${preferences.water.toLowerCase()} menjadi konteks; karakter air nyata tiap kolam tetap perlu diamati.`);
  if (preferences.weather === "Hujan") reasoning.push("Cuaca hujan: cek perubahan suhu dan arus, lalu atur adonan agar cukup melekat pada kail.");
  if (preferences.fishingType === "Lomba") reasoning.push("Untuk lomba, ubah satu variabel setiap percobaan agar respons racikan lebih mudah dibandingkan.");
  if (preferences.budget) reasoning.push(`Budget ${preferences.budget} dipakai untuk menyaring alternatif resep yang mendekati pilihanmu.`);

  const recipeMatches = rankExpertRecipes(preferences, uniqueIds, communityReviews, sourceRecipes).slice(0, 3);
  const evidenceCount = communityReviews.filter((review) => recipeMatches.some((match) => match.recipe.slug === review.recipeSlug)).length;
  const aroma = selected.find((item) => item.role === "Aroma" || item.role === "Protein");
  const base = selected.find((item) => item.role === "Dasar");
  const title = aroma && base ? `Racikan ${base.name.replace(/ ikan/i, "")} ${aroma.name}` : base ? `Racikan Seimbang ${base.name.replace(/ ikan/i, "")}` : `Campuran ${selected[0].name} & ${selected[1].name}`;
  return { title, ingredients: blend, warnings, reasoning, recipeMatches, evidenceCount };
}

export function getExpertKnowledgeStats(localReviewCount = 0, activeRecipeCount = recipes.length, approvedReviewCount = 0) {
  return {
    recipes: activeRecipeCount,
    ingredients: ingredientKnowledge.length,
    reviews: reviews.length + localReviewCount + approvedReviewCount,
    reports: fishingReports.length,
    sources: 3,
  };
}

export function getKnowledgeEvidenceDescription(localReviewCount = 0, activeRecipeCount = recipes.length, approvedReviewCount = 0): string {
  const total = reviews.length + localReviewCount + approvedReviewCount;
  return `${activeRecipeCount} resep terkurasi, ${total} ulasan, ${fishingReports.length} laporan mancing, serta ${ingredientKnowledge.length} bahan dengan peran yang dipetakan.`;
}
