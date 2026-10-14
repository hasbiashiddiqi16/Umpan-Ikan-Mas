import { fishingReports } from "@/data/fishingReports";
import { ingredientKnowledge, type IngredientKnowledge } from "@/data/ingredient-knowledge";
import { SESI_GRAM, formatRupiah, wilayahLabel, wilayahUntukProvinsi, type BlendCost, type Wilayah } from "@/data/ingredient-prices";
import { normalizeFishingType, recipes, type Recipe } from "@/data/recipes";
import type { RecipeReview } from "@/data/reviews";
import { BLEND_ROLE_RULES, balanceBlend, type BlendHemat, type BlendItem, type BlendSuggestion, type RoleShare } from "@/lib/blend-rules";
import { budgetRangeFor, calculateMatchScore, filterRecipesByBudget, type UserPreferences } from "@/lib/recommendation";

export type { BlendItem } from "@/lib/blend-rules";

export type ExpertRecipeResult = { recipe: Recipe; score: number; ingredientFit: number; communityFit: number; contextScore: number };
export type ExpertBlendResult = {
  title: string;
  ingredients: BlendItem[];
  warnings: string[];
  reasoning: string[];
  recipeMatches: ExpertRecipeResult[];
  evidenceCount: number;
  /** Porsi per peran + status terhadap aturan min–maks. */
  roleShares: RoleShare[];
  suggestions: BlendSuggestion[];
  hemat: BlendHemat | null;
  cost100g: BlendCost;
  costSesi: BlendCost;
  wilayah: Wilayah;
  wilayahLabel: string;
  basisGram: number;
  sesiGram: number;
  substituteNote: string;
};

const normalise = (value: string) => value.toLocaleLowerCase("id-ID").normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export function recipeIngredientIds(recipe: Recipe): string[] {
  // Tambahan opsional (kroto & amis) ada di semua resep, jadi tidak dipakai
  // sebagai pembeda; hanya bahan inti yang menentukan kecocokan.
  const coreIngredients = recipe.ingredients.filter((item) => !item.optional);
  const text = normalise(`${recipe.name} ${coreIngredients.map((item) => `${item.name} ${item.brand}`).join(" ")}`);
  return ingredientKnowledge.filter((ingredient) => ingredient.keywords.some((keyword) => text.includes(normalise(keyword)))).map((ingredient) => ingredient.id);
}

function getIngredientFit(recipe: Recipe, selectedIds: string[]): number {
  if (!selectedIds.length) return 70;
  const recipeIds = new Set(recipeIngredientIds(recipe));
  return Math.round((selectedIds.filter((id) => recipeIds.has(id)).length / selectedIds.length) * 100);
}

function getCommunityFit(recipe: Recipe, preferences: UserPreferences, communityReviews: RecipeReview[]): number {
  const evidence = communityReviews.filter((review) => review.recipeSlug === recipe.slug);
  // Tanpa ulasan pengunjung, tidak ada bukti komunitas: nilainya netral (50),
  // bukan diisi dari rating katalog yang tidak ada sumbernya.
  if (!evidence.length) return 50;
  const averageRating = evidence.reduce((sum, review) => sum + review.rating, 0) / evidence.length;
  const contextPoints = evidence.map((review) => {
    let checks = 0;
    let matched = 0;
    if (preferences.weather) { checks += 1; if (review.weather === preferences.weather) matched += 1; }
    if (preferences.water) { checks += 1; if (review.water === preferences.water) matched += 1; }
    if (preferences.fishingType && review.fishingType) {
      checks += 1;
      // "Galat" (sebutan lama) dan "Galatama" dihitung sebagai jenis yang sama.
      if (normalizeFishingType(review.fishingType) === normalizeFishingType(preferences.fishingType)) matched += 1;
    }
    return checks ? matched / checks : 0.5;
  });
  const contextAverage = contextPoints.reduce((sum, value) => sum + value, 0) / contextPoints.length;
  return Math.round((averageRating / 5) * 70 + contextAverage * 30);
}

export function rankExpertRecipes(
  preferences: UserPreferences,
  selectedIds: string[] = [],
  // Tanpa argumen, tidak ada ulasan yang dianggap bukti — ulasan contoh
  // (@/data/reviews) sengaja tidak dipakai sebagai data komunitas.
  communityReviews: RecipeReview[] = [],
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
    // Seri diputus oleh kecocokan bahan, bukan angka rating/popularitas katalog.
  }).sort((a, b) => b.score - a.score || b.ingredientFit - a.ingredientFit);
}

export function buildExpertBlend(
  selectedIds: string[],
  preferences: UserPreferences,
  // Tanpa argumen, tidak ada ulasan yang dianggap bukti — ulasan contoh
  // (@/data/reviews) sengaja tidak dipakai sebagai data komunitas.
  communityReviews: RecipeReview[] = [],
  sourceRecipes: Recipe[] = recipes,
): ExpertBlendResult | null {
  const uniqueIds = [...new Set(selectedIds)];
  const selected = uniqueIds.map((id) => ingredientKnowledge.find((item) => item.id === id)).filter((item): item is IngredientKnowledge => Boolean(item));
  if (selected.length < 2) return null;

  // Wilayah dipakai untuk perkiraan harga bahan: provinsi pengunjung dipetakan
  // ke wilayah, dan tanpa provinsi dipakai harga dasar nasional.
  const wilayah = wilayahUntukProvinsi(preferences.province);
  const balance = balanceBlend(selected, wilayah);
  if (!balance) return null;

  const warnings = [...balance.warnings];
  // Budget tidak lagi hanya menyaring resep: perkiraan biaya campuran (dihitung
  // dari komposisi) dibandingkan dengan rentang budget yang dipilih.
  const budget = budgetRangeFor(preferences.budget);
  if (budget && balance.costSesi.total > budget[1]) {
    const hemat = balance.hemat ? ` Versi hemat memperkirakan ${formatRupiah(balance.hemat.selisihSesi)} lebih murah per sesi.` : "";
    warnings.push(`Perkiraan biaya satu sesi (± ${SESI_GRAM} g) ${formatRupiah(balance.costSesi.total)} — di atas batas atas budget ${preferences.budget} (${formatRupiah(budget[1])}).${hemat}`);
  }

  const roles = new Set(selected.map((item) => item.role));
  const reasoning: string[] = [
    `Basis racikan memakai ${selected.filter((item) => item.role === "Dasar").map((item) => item.name.toLowerCase()).join(" dan ") || "bahan pilihanmu"}.`,
    `Porsi antar peran dibagi ulang agar masuk aturan (${BLEND_ROLE_RULES.map((rule) => `${rule.role} ${rule.minPercent}–${rule.maxPercent}%`).join(", ")}), jadi satu fungsi tidak bisa mendominasi adonan.`,
    roles.has("Pengikat") ? "Bahan pengikat sudah dipilih; uleni perlahan dan sesuaikan kelembapan." : "Kombinasi belum memiliki pengikat, jadi tekstur mungkin lebih mudah lepas.",
  ];
  if (preferences.water === "Keruh") reasoning.push("Air keruh dipilih: mulai dari karakter aroma yang mudah dikenali, lalu uji sedikit demi sedikit di kolam.");
  else if (preferences.water === "Jernih") reasoning.push("Air jernih dipilih: gunakan aroma secara ringan dan hindari menambah banyak essen sekaligus.");
  else if (preferences.water) reasoning.push(`Kondisi air ${preferences.water.toLowerCase()} menjadi konteks; karakter air nyata tiap kolam tetap perlu diamati.`);
  if (preferences.weather === "Hujan") reasoning.push("Cuaca hujan: cek perubahan suhu dan arus, lalu atur adonan agar cukup melekat pada kail.");
  if (preferences.fishingType === "Lomba") reasoning.push("Untuk lomba, ubah satu variabel setiap percobaan agar respons racikan lebih mudah dibandingkan.");
  reasoning.push(`Perkiraan biaya bahan dihitung dari komposisi memakai harga ${wilayahLabel(wilayah)}: ${formatRupiah(balance.cost100g.total)} per ${balance.basisGram} g adonan, sekitar ${formatRupiah(balance.costSesi.total)} per sesi (± ${SESI_GRAM} g).`);
  reasoning.push(
    budget
      ? balance.costSesi.total > budget[1]
        ? `Budget ${preferences.budget} juga menilai komposisi — perkiraan biaya sekarang melewatinya, lihat peringatan di panel komposisi.`
        : `Budget ${preferences.budget} juga menilai komposisi; perkiraan biaya sekarang masih di dalam rentang itu.`
      : "Budget belum dipilih, jadi komposisi dinilai dari aturan peran dan saran pengganti saja.",
  );

  const recipeMatches = rankExpertRecipes(preferences, uniqueIds, communityReviews, sourceRecipes).slice(0, 3);
  const evidenceCount = communityReviews.filter((review) => recipeMatches.some((match) => match.recipe.slug === review.recipeSlug)).length;
  const aroma = selected.find((item) => item.role === "Aroma" || item.role === "Protein");
  const base = selected.find((item) => item.role === "Dasar");
  const title = aroma && base ? `Racikan ${base.name.replace(/ ikan/i, "")} ${aroma.name}` : base ? `Racikan Seimbang ${base.name.replace(/ ikan/i, "")}` : `Campuran ${selected[0].name} & ${selected[1].name}`;
  return {
    title,
    ingredients: balance.items,
    warnings,
    reasoning,
    recipeMatches,
    evidenceCount,
    roleShares: balance.roleShares,
    suggestions: balance.suggestions,
    hemat: balance.hemat,
    cost100g: balance.cost100g,
    costSesi: balance.costSesi,
    wilayah,
    wilayahLabel: wilayahLabel(wilayah),
    basisGram: balance.basisGram,
    sesiGram: balance.sesiGram,
    substituteNote: balance.substituteNote,
  };
}

/**
 * Statistik basis pengetahuan. Angka ulasan **hanya** dari ulasan asli
 * pengunjung (lokal + hasil moderasi); ulasan contoh tidak dihitung supaya
 * tidak ada angka komunitas yang mengarang.
 */
export function getExpertKnowledgeStats(localReviewCount = 0, activeRecipeCount = recipes.length, approvedReviewCount = 0) {
  return {
    recipes: activeRecipeCount,
    ingredients: ingredientKnowledge.length,
    reviews: localReviewCount + approvedReviewCount,
    reports: fishingReports.length,
    sources: 3,
  };
}

export function getKnowledgeEvidenceDescription(localReviewCount = 0, activeRecipeCount = recipes.length, approvedReviewCount = 0): string {
  const total = localReviewCount + approvedReviewCount;
  return `${activeRecipeCount} resep terkurasi, ${total} ulasan pengunjung, ${fishingReports.length} contoh laporan mancing, serta ${ingredientKnowledge.length} bahan dengan peran yang dipetakan.`;
}
