import { eq } from "drizzle-orm";
import { db } from "@/db";
import { cmsRecipes } from "@/db/schema";
import { validateCmsRecipeInput } from "@/lib/cms";
import { requireAdminApi } from "@/lib/admin-auth";
import { revalidateRecipePages } from "@/lib/revalidate-recipes";
import { databaseErrorResponse } from "@/lib/database-status";
import { cleanupRecipePhotos } from "@/lib/appearance-server";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const { id: idParam } = await context.params;
  const id = Number(idParam);
  if (!Number.isSafeInteger(id) || id < 1) return Response.json({ error: "ID konten tidak valid." }, { status: 400 });
  try {
    const body: unknown = await request.json();
    const parsed = validateCmsRecipeInput(body);
    if (!parsed.data) return Response.json({ error: parsed.error ?? "Data konten tidak valid." }, { status: 400 });
    const [existing] = await db.select({ slug: cmsRecipes.slug, provinces: cmsRecipes.provinces, images: cmsRecipes.images }).from(cmsRecipes).where(eq(cmsRecipes.id, id)).limit(1);
    const [updated] = await db.update(cmsRecipes).set({ ...parsed.data, updatedAt: new Date() }).where(eq(cmsRecipes.id, id)).returning();
    if (!updated) return Response.json({ error: "Konten tidak ditemukan." }, { status: 404 });
    await cleanupRecipePhotos([existing?.slug ?? updated.slug, updated.slug], Array.isArray(updated.images) ? updated.images : [], Array.isArray(existing?.images) ? existing.images : []);
    // Halaman publik langsung dibangun ulang (slug lama ikut dibuang bila
    // slug berubah): tanpa ini suntingan dashboard baru terlihat sampai
    // satu jam kemudian menunggu ISR berkala.
    revalidateRecipePages(
      [existing?.slug, updated.slug].filter((slug): slug is string => Boolean(slug)),
      [...(Array.isArray(existing?.provinces) ? existing.provinces : []), ...(Array.isArray(updated.provinces) ? updated.provinces : [])],
    );
    return Response.json({ recipe: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    // Slug duplikat tetap 400; masalah koneksi/tabel dilaporkan sebagai 503 dengan petunjuk.
    if (/unique|duplicate/i.test(message)) return Response.json({ error: "Slug sudah dipakai resep lain. Gunakan slug yang berbeda." }, { status: 400 });
    return databaseErrorResponse(error, "Konten gagal diperbarui.");
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const { id: idParam } = await context.params;
  const id = Number(idParam);
  if (!Number.isSafeInteger(id) || id < 1) return Response.json({ error: "ID konten tidak valid." }, { status: 400 });
  try {
    const [deleted] = await db.delete(cmsRecipes).where(eq(cmsRecipes.id, id)).returning({ id: cmsRecipes.id, slug: cmsRecipes.slug, provinces: cmsRecipes.provinces, images: cmsRecipes.images });
    if (!deleted) return Response.json({ error: "Konten tidak ditemukan." }, { status: 404 });
    await cleanupRecipePhotos([deleted.slug], [], Array.isArray(deleted.images) ? deleted.images : []);
    revalidateRecipePages([deleted.slug], Array.isArray(deleted.provinces) ? deleted.provinces : []);
    return Response.json({ ok: true });
  } catch (error) {
    return databaseErrorResponse(error, "Konten gagal dihapus.");
  }
}
