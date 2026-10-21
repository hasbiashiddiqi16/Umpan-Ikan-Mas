import { ingredientKnowledge, type IngredientKnowledge } from "@/data/ingredient-knowledge";
import { SESI_GRAM, formatRupiah, wilayahUntukProvinsi, type BlendCost, type Wilayah } from "@/data/ingredient-prices";
import { normalizeFishingType, type Recipe } from "@/data/recipes";
import type { RecipeReview } from "@/data/reviews";
import { BLEND_ROLE_RULES, balanceBlend, type BlendHemat, type BlendItem, type BlendSuggestion, type RoleShare } from "@/lib/blend-rules";
import { calculateMatchScore, filterRecipesByBudget, type UserPreferences } from "@/lib/recommendation";

export type { BlendItem } from "@/lib/blend-rules";

export type PakarRecipeResult = { recipe: Recipe; score: number; ingredientFit: number; communityFit: number; contextScore: number };
export type PakarDominantCondition = {
  label: string;
  value: string;
  count: number;
  total: number;
};
export type PakarBlendResult = {
  title: string;
  ingredients: BlendItem[];
  warnings: string[];
  reasoning: string[];
  recipeMatches: PakarRecipeResult[];
  evidenceCount: number;
  dominantConditions: PakarDominantCondition[];
  /** Porsi per peran + status terhadap aturan min–maks. */
  roleShares: RoleShare[];
  suggestions: BlendSuggestion[];
  hemat: BlendHemat | null;
  costBasis: BlendCost;
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
  // Tanpa konteks kondisi dari pengunjung, bukti komunitas dibaca dari rating
  // ulasan apa adanya — tidak ada kondisi tersembunyi yang ikut menilai.
  if (!preferences.weather && !preferences.water && !preferences.fishingType) return Math.round((averageRating / 5) * 100);
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

export function rankPakarRecipes(
  preferences: UserPreferences,
  selectedIds: string[] = [],
  // Tanpa argumen, tidak ada ulasan yang dianggap bukti komunitas.
  communityReviews: RecipeReview[] = [],
  sourceRecipes: Recipe[] = [],
): PakarRecipeResult[] {
  const inBudget = filterRecipesByBudget(sourceRecipes, preferences.budget);
  const candidateRecipes = inBudget.length ? inBudget : sourceRecipes;
  const hasContext = Boolean(preferences.province || preferences.weather || preferences.water || preferences.waterBody || preferences.fishingType || preferences.season);
  return candidateRecipes.map((recipe) => {
    const contextScore = calculateMatchScore(recipe, preferences);
    const ingredientFit = getIngredientFit(recipe, selectedIds);
    const communityFit = getCommunityFit(recipe, preferences, communityReviews);
    // Bila pengunjung memberi konteks (mis. lewat Tanya Umpan), konteks tetap
    // menentukan. Bila tidak ada konteks — seperti Pakar Umpan sekarang —
    // urutan murni dari kecocokan bahan inti dan bukti rating ulasan.
    const score = hasContext
      ? Math.max(0, Math.min(100, Math.round(contextScore * 0.8 + ingredientFit * 0.12 + communityFit * 0.08)))
      : Math.max(0, Math.min(100, Math.round(ingredientFit * 0.75 + communityFit * 0.25)));
    return { recipe, score, ingredientFit, communityFit, contextScore };
    // Seri diputus oleh kecocokan bahan, bukan angka rating/popularitas katalog.
  }).sort((a, b) => b.score - a.score || b.ingredientFit - a.ingredientFit || (hasContext ? 0 : b.communityFit - a.communityFit));
}

const CONDITION_CATEGORIES: { label: string; values: (recipe: Recipe) => readonly string[] }[] = [
  { label: "Cuaca", values: (recipe) => recipe.weather },
  { label: "Kondisi air", values: (recipe) => recipe.water },
  { label: "Tipe air", values: (recipe) => recipe.waterBodies },
  { label: "Jenis pemancingan", values: (recipe) => recipe.fishingTypes },
  { label: "Musim", values: (recipe) => recipe.seasons },
  { label: "Provinsi", values: (recipe) => recipe.provinces },
];

/**
 * Kondisi dominan diringkas dari metadata resep-resep terdekat: satu nilai
 * hanya disebut dominan bila muncul pada lebih dari separuh resep terdekat.
 * Kategori yang beragam tidak dipaksakan menjadi satu kesimpulan.
 */
export function getPakarDominantConditions(recipeMatches: PakarRecipeResult[]): PakarDominantCondition[] {
  const total = recipeMatches.length;
  if (!total) return [];
  const dominant: PakarDominantCondition[] = [];
  for (const category of CONDITION_CATEGORIES) {
    const counts = new Map<string, number>();
    const firstSeen = new Map<string, number>();
    recipeMatches.forEach((match, index) => {
      for (const value of new Set(category.values(match.recipe))) {
        counts.set(value, (counts.get(value) ?? 0) + 1);
        if (!firstSeen.has(value)) firstSeen.set(value, index);
      }
    });
    let bestValue: string | null = null;
    let bestCount = 0;
    for (const [value, count] of counts) {
      if (count > bestCount || (count === bestCount && bestValue !== null && (firstSeen.get(value) ?? 0) < (firstSeen.get(bestValue) ?? 0))) {
        bestValue = value;
        bestCount = count;
      }
    }
    if (bestValue !== null && bestCount > total / 2) {
      dominant.push({ label: category.label, value: bestValue, count: bestCount, total });
    }
  }
  return dominant;
}

export function buildPakarBlend(
  selectedIds: string[],
  // Tanpa argumen, tidak ada ulasan yang dianggap bukti komunitas.
  communityReviews: RecipeReview[] = [],
  sourceRecipes: Recipe[] = [],
): PakarBlendResult | null {
  const uniqueIds = [...new Set(selectedIds)];
  const selected = uniqueIds.map((id) => ingredientKnowledge.find((item) => item.id === id)).filter((item): item is IngredientKnowledge => Boolean(item));
  if (selected.length < 2) return null;

  // Harga selalu memakai dasar nasional: Pakar Umpan tidak lagi menanyakan
  // provinsi, jadi tidak ada faktor wilayah pilihan pengunjung yang diterapkan.
  const wilayah = wilayahUntukProvinsi();
  const labelWilayah = "Nasional (harga dasar)";
  const balance = balanceBlend(selected, wilayah);
  if (!balance) return null;

  const warnings = [...balance.warnings];

  const recipeMatches = rankPakarRecipes({}, uniqueIds, communityReviews, sourceRecipes).slice(0, 3);
  const dominantConditions = getPakarDominantConditions(recipeMatches);
  const evidenceCount = communityReviews.filter((review) => recipeMatches.some((match) => match.recipe.slug === review.recipeSlug)).length;

  const roles = new Set(selected.map((item) => item.role));
  const reasoning: string[] = [
    `Basis racikan memakai ${selected.filter((item) => item.role === "Dasar").map((item) => item.name.toLowerCase()).join(" dan ") || "bahan pilihanmu"}.`,
    `Porsi antar peran dibagi ulang agar masuk aturan (${BLEND_ROLE_RULES.map((rule) => `${rule.role} ${rule.minPercent}–${rule.maxPercent}%`).join(", ")}), jadi satu fungsi tidak bisa mendominasi adonan.`,
    roles.has("Pengikat") ? "Bahan pengikat sudah dipilih. Uleni perlahan dan sesuaikan kelembapan." : "Kombinasi belum memiliki pengikat, jadi tekstur mungkin lebih mudah lepas.",
    "Modul ini tidak lagi meminta kondisi kolam. Peringkat resep terdekat dihitung dari kecocokan bahan inti (75%) dan bukti rating ulasan pengunjung (25%).",
    dominantConditions.length
      ? `Kondisi yang paling sering muncul pada ${recipeMatches.length} resep terdekat: ${dominantConditions.map((condition) => `${condition.label.toLowerCase()} ${condition.value} (${condition.count} dari ${condition.total})`).join(", ")}. Ini rangkuman metadata resep terdekat, bukan isian kondisi pengunjung dan bukan janji hasil.`
      : "Resep-resep terdekat tidak menunjukkan satu kondisi yang muncul pada lebih dari separuh resep, jadi sistem tidak memaksakan satu kondisi dominan.",
    `Perkiraan biaya bahan dihitung dari komposisi memakai harga dasar nasional: ${formatRupiah(balance.costBasis.total)} per ${balance.basisGram} g adonan, sekitar ${formatRupiah(balance.costSesi.total)} per sesi (± ${SESI_GRAM} g).`,
    "Budget tidak lagi ditanyakan di modul ini. Komposisi dinilai dari aturan peran, kecocokan bahan, bukti ulasan, dan saran pengganti saja.",
  ];
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
    dominantConditions,
    roleShares: balance.roleShares,
    suggestions: balance.suggestions,
    hemat: balance.hemat,
    costBasis: balance.costBasis,
    costSesi: balance.costSesi,
    wilayah,
    wilayahLabel: labelWilayah,
    basisGram: balance.basisGram,
    sesiGram: balance.sesiGram,
    substituteNote: balance.substituteNote,
  };
}

/**
 * Statistik basis pengetahuan. Angka ulasan **hanya** dari ulasan asli
 * pengunjung (lokal + hasil moderasi), supaya tidak ada angka komunitas yang mengarang.
 */
export function getPakarKnowledgeStats(localReviewCount = 0, activeRecipeCount = 0, approvedReviewCount = 0) {
  return {
    recipes: activeRecipeCount,
    ingredients: ingredientKnowledge.length,
    reviews: localReviewCount + approvedReviewCount,
    sources: 3,
  };
}

export function getPakarKnowledgeEvidenceDescription(localReviewCount = 0, activeRecipeCount = 0, approvedReviewCount = 0): string {
  const total = localReviewCount + approvedReviewCount;
  return `${activeRecipeCount} resep terkurasi, ${total} ulasan pengunjung, serta ${ingredientKnowledge.length} bahan dengan peran yang dipetakan.`;
}
