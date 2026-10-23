import { eq } from "drizzle-orm";
import { db } from "@/db";
import { cmsRecipes } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth-user";
import { cleanupRecipePhotos } from "@/lib/appearance-server";
import { normalizeCmsRecipeRecord, validateCmsRecipeInput } from "@/lib/cms";
import { databaseErrorResponse } from "@/lib/database-status";
import { revalidateRecipePages } from "@/lib/revalidate-recipes";
import { hargaAcuanDariLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

const belumMasuk = () => Response.json({ error: "Masuk dulu untuk melanjutkan." }, { status: 401 });
const tidakKetemu = () => Response.json({ error: "Resep tidak ditemukan." }, { status: 404 });

async function resepMilik(idParam: string, userId: string) {
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) return null;
  const [row] = await db.select().from(cmsRecipes).where(eq(cmsRecipes.id, id)).limit(1);
  return row && row.ownerId === userId ? row : null;
}

/** Sunting resep milik sendiri. Slug dan status tidak berubah dari sini. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return belumMasuk();
  try {
    const { id } = await params;
    const row = await resepMilik(id, user.id);
    if (!row) return tidakKetemu();
    const body: unknown = await request.json();
    if (!body || typeof body !== "object") return Response.json({ error: "Data resep tidak valid." }, { status: 400 });
    const mentah = body as Record<string, unknown>;
    const calon: Record<string, unknown> = {
      ...mentah,
      slug: row.slug,
      status: row.status,
      author: row.author,
      priceValue: Number.isFinite(Number(mentah.priceValue)) && mentah.priceValue !== undefined && mentah.priceValue !== null
        ? Number(mentah.priceValue)
        : hargaAcuanDariLabel(typeof mentah.price === "string" ? mentah.price : ""),
    };
    const parsed = validateCmsRecipeInput(calon);
    if (!parsed.data) return Response.json({ error: parsed.error ?? "Data resep tidak valid." }, { status: 400 });
    const [updated] = await db
      .update(cmsRecipes)
      .set({ ...parsed.data, slug: row.slug, updatedAt: new Date() })
      .where(eq(cmsRecipes.id, row.id))
      .returning();
    await cleanupRecipePhotos([row.slug], Array.isArray(updated.images) ? updated.images : [], Array.isArray(row.images) ? row.images : []);
    const provinsiLama = Array.isArray(row.provinces) ? row.provinces : [];
    const provinsiBaru = Array.isArray(updated.provinces) ? updated.provinces : [];
    revalidateRecipePages([row.slug], [...provinsiLama, ...provinsiBaru]);
    return Response.json({ recipe: normalizeCmsRecipeRecord(updated) });
  } catch (error) {
    return databaseErrorResponse(error, "Perubahan resep gagal disimpan.");
  }
}

/** Hapus resep milik sendiri beserta foto unggahannya. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return belumMasuk();
  try {
    const { id } = await params;
    const row = await resepMilik(id, user.id);
    if (!row) return tidakKetemu();
    await db.delete(cmsRecipes).where(eq(cmsRecipes.id, row.id));
    await cleanupRecipePhotos([row.slug], [], Array.isArray(row.images) ? row.images : []);
    revalidateRecipePages([row.slug], Array.isArray(row.provinces) ? row.provinces : []);
    return Response.json({ ok: true });
  } catch (error) {
    return databaseErrorResponse(error, "Resep gagal dihapus.");
  }
}
