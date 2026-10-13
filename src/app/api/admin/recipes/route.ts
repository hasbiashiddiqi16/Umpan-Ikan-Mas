import { desc } from "drizzle-orm";
import { db } from "@/db";
import { cmsRecipes } from "@/db/schema";
import { validateCmsRecipeInput } from "@/lib/cms";
import { requireAdminApi } from "@/lib/admin-auth";
import { databaseErrorResponse } from "@/lib/database-status";

export const dynamic = "force-dynamic";

export async function GET() {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;

  try {
    const rows = await db.select().from(cmsRecipes).orderBy(desc(cmsRecipes.updatedAt));
    return Response.json({ recipes: rows });
  } catch (error) {
    return databaseErrorResponse(error, "Konten belum dapat dimuat.");
  }
}

export async function POST(request: Request) {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;

  try {
    const body: unknown = await request.json();
    const parsed = validateCmsRecipeInput(body);
    if (!parsed.data) return Response.json({ error: parsed.error ?? "Data konten tidak valid." }, { status: 400 });
    const [created] = await db.insert(cmsRecipes).values(parsed.data).returning();
    return Response.json({ recipe: created }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/cms_recipes_slug_unique|unique|duplicate/i.test(message)) {
      return Response.json({ error: "Slug tersebut sudah digunakan. Ubah slug agar unik." }, { status: 400 });
    }
    // Masalah koneksi atau tabel yang belum dimigrasi bukan kesalahan data.
    return databaseErrorResponse(error, "Konten gagal disimpan. Periksa data lalu coba lagi.");
  }
}
