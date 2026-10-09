import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { cmsRecipes, cmsReviews } from "@/db/schema";
import { recipes } from "@/data/recipes";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  if (slug && slug.length > 180) return Response.json({ reviews: [] });
  try {
    const rows = slug
      ? await db.select().from(cmsReviews).where(and(eq(cmsReviews.recipeSlug, slug), eq(cmsReviews.status, "approved"))).orderBy(desc(cmsReviews.createdAt)).limit(50)
      : await db.select().from(cmsReviews).where(eq(cmsReviews.status, "approved")).orderBy(desc(cmsReviews.createdAt)).limit(250);
    return Response.json({ reviews: rows.map((review) => ({ ...review, date: new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(review.createdAt) })) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ reviews: [] });
  }
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object") return Response.json({ error: "Data ulasan tidak valid." }, { status: 400 });
    const item = body as Record<string, unknown>;
    const recipeSlug = typeof item.recipeSlug === "string" ? item.recipeSlug : "";
    const name = typeof item.name === "string" ? item.name.trim() : "";
    const location = typeof item.location === "string" ? item.location.trim() : "";
    const comment = typeof item.comment === "string" ? item.comment.trim() : "";
    const rating = Number(item.rating);
    const allowedWeather = ["Hujan", "Mendung", "Cerah", "Berawan", "Panas"];
    const allowedWater = ["Keruh", "Hijau", "Jernih", "Kekuningan"];
    const allowedTypes = ["Harian", "Lomba", "Galat"];
    if (!/^[a-z0-9-]{2,180}$/.test(recipeSlug) || name.length < 2 || name.length > 80 || location.length > 180 || comment.length < 12 || comment.length > 500 || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return Response.json({ error: "Lengkapi nama, komentar, dan rating 1–5 dengan benar." }, { status: 400 });
    }
    if (typeof item.weather !== "string" || !allowedWeather.includes(item.weather) || typeof item.water !== "string" || !allowedWater.includes(item.water) || typeof item.fishingType !== "string" || !allowedTypes.includes(item.fishingType)) {
      return Response.json({ error: "Kondisi mancing tidak valid." }, { status: 400 });
    }
    const catchCount = item.catchCount === undefined || item.catchCount === null ? null : Number(item.catchCount);
    if (catchCount !== null && (!Number.isInteger(catchCount) || catchCount < 0 || catchCount > 999)) return Response.json({ error: "Jumlah tangkapan tidak valid." }, { status: 400 });
    const isSeedRecipe = recipes.some((recipe) => recipe.slug === recipeSlug);
    const [cmsRecipe] = isSeedRecipe ? [] : await db.select({ id: cmsRecipes.id }).from(cmsRecipes).where(and(eq(cmsRecipes.slug, recipeSlug), eq(cmsRecipes.status, "published"))).limit(1);
    if (!isSeedRecipe && !cmsRecipe) return Response.json({ error: "Resep tidak ditemukan atau belum dipublikasikan." }, { status: 404 });
    const [created] = await db.insert(cmsReviews).values({ recipeSlug, name, location, rating, weather: item.weather, water: item.water, fishingType: item.fishingType, catchCount, comment, status: "pending" }).returning({ id: cmsReviews.id });
    return Response.json({ ok: true, id: created.id, status: "pending" }, { status: 201 });
  } catch {
    return Response.json({ error: "Ulasan terkirim secara lokal, tetapi server sedang tidak tersedia." }, { status: 503 });
  }
}
