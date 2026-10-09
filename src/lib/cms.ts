import type { Recipe } from "@/data/recipes";
import type { CmsIngredient } from "@/db/schema";
import { slugify } from "@/lib/utils";

export type CmsRecipeStatus = "draft" | "published" | "archived";

export type CmsRecipeRecord = {
  id: number;
  slug: string;
  title: string;
  summary: string;
  category: string;
  status: string;
  image: string;
  price: string;
  priceValue: number;
  difficulty: string;
  rating: number;
  reviewCount: number;
  users: number;
  popularity: number;
  weather: string[];
  water: string[];
  fishingTypes: string[];
  provinces: string[];
  seasons: string[];
  ingredients: CmsIngredient[];
  steps: string[];
  suitable: string[];
  notSuitable: string[];
  author: string;
  createdAt: Date;
  updatedAt: Date;
};

export type CmsRecipeInput = Omit<CmsRecipeRecord, "id" | "rating" | "reviewCount" | "users" | "popularity" | "createdAt" | "updatedAt"> & { rating?: number; popularity?: number };

const validCategories = ["Harian", "Lomba", "Galat", "Premium", "Ekonomis"];
const validStatuses = ["draft", "published", "archived"];
const validDifficulties = ["Mudah", "Menengah", "Tingkat lanjut"];
const validWeather = ["Hujan", "Mendung", "Cerah", "Berawan", "Panas"];
const validWater = ["Keruh", "Hijau", "Jernih", "Kekuningan"];
const validTypes = ["Harian", "Lomba", "Galat"];
const validSeasons = ["Musim Hujan", "Musim Panas", "Kemarau", "Peralihan"];

function stringArray(value: unknown, allowed?: string[]): string[] | null {
  if (!Array.isArray(value) || value.length > 30 || value.some((item) => typeof item !== "string" || item.length > 120)) return null;
  const values = [...new Set(value.map((item) => (item as string).trim()).filter(Boolean))];
  return allowed && values.some((item) => !allowed.includes(item)) ? null : values;
}

function ingredientArray(value: unknown): CmsIngredient[] | null {
  if (!Array.isArray(value) || value.length > 40) return null;
  const result: CmsIngredient[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") return null;
    const item = entry as Record<string, unknown>;
    if ([item.name, item.brand, item.amount].some((part) => typeof part !== "string" || !part.trim() || part.length > 120)) return null;
    result.push({ name: (item.name as string).trim(), brand: (item.brand as string).trim(), amount: (item.amount as string).trim() });
  }
  return result;
}

export function validateCmsRecipeInput(value: unknown): { data?: CmsRecipeInput; error?: string } {
  if (!value || typeof value !== "object") return { error: "Data konten tidak valid." };
  const item = value as Record<string, unknown>;
  const title = typeof item.title === "string" ? item.title.trim() : "";
  const summary = typeof item.summary === "string" ? item.summary.trim() : "";
  if (title.length < 3 || title.length > 180) return { error: "Judul harus berisi 3–180 karakter." };
  if (summary.length < 15 || summary.length > 1500) return { error: "Ringkasan harus berisi 15–1.500 karakter." };
  const category = typeof item.category === "string" && validCategories.includes(item.category) ? item.category : "Harian";
  const status = typeof item.status === "string" && validStatuses.includes(item.status) ? item.status : "draft";
  const difficulty = typeof item.difficulty === "string" && validDifficulties.includes(item.difficulty) ? item.difficulty : "Mudah";
  const weather = stringArray(item.weather, validWeather);
  const water = stringArray(item.water, validWater);
  const fishingTypes = stringArray(item.fishingTypes, validTypes);
  const provinces = stringArray(item.provinces);
  const seasons = stringArray(item.seasons, validSeasons);
  const steps = stringArray(item.steps);
  const suitable = stringArray(item.suitable);
  const notSuitable = stringArray(item.notSuitable);
  const ingredients = ingredientArray(item.ingredients);
  if (!weather || !water || !fishingTypes || !provinces || !seasons || !steps || !suitable || !notSuitable || !ingredients) return { error: "Daftar kondisi, bahan, atau langkah tidak valid." };
  if (ingredients.length < 1) return { error: "Tambahkan minimal satu bahan resep." };
  if (steps.length < 1) return { error: "Tambahkan minimal satu langkah meracik." };
  const suppliedSlug = typeof item.slug === "string" ? item.slug : "";
  const slug = slugify(suppliedSlug || title);
  if (!slug || slug.length > 180) return { error: "Slug konten tidak valid." };
  const priceValue = Number(item.priceValue);
  if (!Number.isFinite(priceValue) || priceValue < 0 || priceValue > 100_000_000) return { error: "Estimasi harga tidak valid." };
  const price = typeof item.price === "string" && item.price.trim().length <= 80 ? item.price.trim() : "Rp15.000–30.000";
  const image = typeof item.image === "string" && item.image.startsWith("/") && item.image.length <= 500 ? item.image : "/images/recipe-putih.jpg";
  const author = typeof item.author === "string" && item.author.trim() ? item.author.trim().slice(0, 100) : "Tim UMPAN MAS";
  const rating = typeof item.rating === "number" && item.rating >= 0 && item.rating <= 5 ? Math.round(item.rating * 10) : undefined;
  const popularity = typeof item.popularity === "number" && item.popularity >= 0 && item.popularity <= 100 ? Math.round(item.popularity) : undefined;

  return { data: { slug, title, summary, category, status, image, price, priceValue: Math.round(priceValue), difficulty, weather, water, fishingTypes, provinces, seasons, ingredients, steps, suitable, notSuitable, author, rating, popularity } };
}

export function mergeRecipesBySlug(seedRecipes: Recipe[], managedRecipes: Recipe[]): Recipe[] {
  const merged = new Map<string, Recipe>(seedRecipes.map((recipe) => [recipe.slug, recipe]));
  managedRecipes.forEach((recipe) => merged.set(recipe.slug, recipe));
  return [...merged.values()];
}

export function cmsRecipeToRecipe(record: CmsRecipeRecord): Recipe {
  return {
    slug: record.slug,
    name: record.title,
    category: record.category as Recipe["category"],
    rating: record.rating / 10,
    reviewCount: record.reviewCount,
    users: record.users,
    price: record.price,
    priceValue: record.priceValue,
    difficulty: record.difficulty as Recipe["difficulty"],
    image: record.image,
    weather: record.weather as Recipe["weather"],
    water: record.water as Recipe["water"],
    fishingTypes: record.fishingTypes as Recipe["fishingTypes"],
    provinces: record.provinces,
    seasons: record.seasons,
    popularity: record.popularity,
    summary: record.summary,
    ingredients: record.ingredients,
    steps: record.steps,
    suitable: record.suitable,
    notSuitable: record.notSuitable,
  };
}
