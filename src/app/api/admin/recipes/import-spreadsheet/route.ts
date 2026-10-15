import { inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { cmsRecipes } from "@/db/schema";
import { requireAdminApi } from "@/lib/admin-auth";
import { revalidateRecipePages } from "@/lib/revalidate-recipes";
import { databaseErrorResponse } from "@/lib/database-status";
import { parseRecipeSpreadsheet, readSpreadsheetRows } from "@/lib/recipe-spreadsheet";

export const dynamic = "force-dynamic";

/** Batas ukuran berkas impor — jauh di atas kebutuhan 200 baris resep. */
const MAX_FILE_BYTES = 2_000_000;

/**
 * Impor resep massal dari Excel/CSV. Semua baris divalidasi dulu dengan
 * aturan yang sama seperti formulir resep; bila ada satu baris yang tidak
 * valid, tidak ada yang disimpan dan admin menerima laporan per baris.
 * Slug yang sudah ada diperbarui (upsert), slug baru dibuat — sama seperti
 * Sinkronkan katalog, jadi mengunggah ulang berkas yang sama aman.
 */
export async function POST(request: Request) {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "Berkas tidak terbaca. Unggah berkas .xlsx atau .csv." }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ error: "Pilih berkas .xlsx atau .csv terlebih dahulu." }, { status: 400 });
  }
  if (!/\.(xlsx|csv)$/i.test(file.name)) {
    return Response.json({ error: "Format berkas harus .xlsx atau .csv." }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return Response.json({ error: "Ukuran berkas maksimal 2 MB." }, { status: 400 });
  }

  let parsed: ReturnType<typeof parseRecipeSpreadsheet>;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const rows = await readSpreadsheetRows(buffer, file.name);
    parsed = parseRecipeSpreadsheet(rows);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Berkas tidak dapat dibaca.";
    return Response.json({ error: message }, { status: 400 });
  }

  if (parsed.failures.length > 0) {
    return Response.json(
      {
        error: `${parsed.failures.length} baris belum valid — belum ada resep yang disimpan. Perbaiki baris di bawah lalu unggah lagi.`,
        created: 0,
        updated: 0,
        failed: parsed.failures.slice(0, 50),
      },
      { status: 400 },
    );
  }
  if (parsed.recipes.length === 0) {
    return Response.json({ error: "Tidak ada baris resep yang bisa diimpor dari berkas ini." }, { status: 400 });
  }

  try {
    const slugs = parsed.recipes.map((recipe) => recipe.slug);
    const existing = await db.select({ slug: cmsRecipes.slug }).from(cmsRecipes).where(inArray(cmsRecipes.slug, slugs));
    const existingSlugs = new Set(existing.map((row) => row.slug));
    const now = new Date();
    await db.insert(cmsRecipes).values(parsed.recipes).onConflictDoUpdate({
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
        weather: sql`excluded.weather`,
        water: sql`excluded.water`,
        waterBodies: sql`excluded.water_bodies`,
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
    revalidateRecipePages(slugs, parsed.recipes.flatMap((recipe) => recipe.provinces));
    return Response.json({
      created: slugs.length - existingSlugs.size,
      updated: existingSlugs.size,
      total: slugs.length,
      failed: [],
    });
  } catch (error) {
    return databaseErrorResponse(error, "Impor Excel gagal disimpan. Coba lagi.");
  }
}
