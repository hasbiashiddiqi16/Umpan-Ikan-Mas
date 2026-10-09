import { desc } from "drizzle-orm";
import { db } from "@/db";
import { cmsRecipes } from "@/db/schema";
import { validateCmsRecipeInput } from "@/lib/cms";
import { requireAdminApi } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;

  try {
    const rows = await db.select().from(cmsRecipes).orderBy(desc(cmsRecipes.updatedAt));
    return Response.json({ recipes: rows });
  } catch {
    return Response.json({ error: "Konten belum dapat dimuat." }, { status: 503 });
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
    const message = error instanceof Error && error.message.includes("cms_recipes_slug_unique")
      ? "Slug tersebut sudah digunakan. Ubah slug agar unik."
      : "Konten gagal disimpan. Periksa data lalu coba lagi.";
    return Response.json({ error: message }, { status: 400 });
  }
}
