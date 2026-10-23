import { eq } from "drizzle-orm";
import { db } from "@/db";
import { cmsRecipes } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth-user";
import { recipeGallery } from "@/lib/cms";
import { DEFAULT_RECIPE_IMAGE, RECIPE_PHOTO_MAX_BYTES, RECIPE_PHOTO_MAX_COUNT, sniffImageMime } from "@/lib/appearance";
import { addRecipePhoto } from "@/lib/appearance-server";
import { databaseErrorResponse } from "@/lib/database-status";
import { revalidateRecipePages } from "@/lib/revalidate-recipes";

export const dynamic = "force-dynamic";

const megabytes = (bytes: number) => `${(bytes / 1_000_000).toFixed(1)} MB`;

/** Menambahkan satu foto ke galeri resep milik pengguna yang masuk. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Masuk dulu untuk melanjutkan." }, { status: 401 });
  try {
    const { id } = await params;
    const numericId = Number(id);
    if (!Number.isInteger(numericId) || numericId <= 0) return Response.json({ error: "Resep tidak ditemukan." }, { status: 404 });
    const [row] = await db.select().from(cmsRecipes).where(eq(cmsRecipes.id, numericId)).limit(1);
    if (!row || row.ownerId !== user.id) return Response.json({ error: "Resep tidak ditemukan." }, { status: 404 });

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return Response.json({ error: "Pilih berkas foto terlebih dahulu." }, { status: 400 });
    if (file.size === 0) return Response.json({ error: "Berkas kosong." }, { status: 400 });
    if (file.size > RECIPE_PHOTO_MAX_BYTES) return Response.json({ error: `Ukuran foto maksimal ${megabytes(RECIPE_PHOTO_MAX_BYTES)}.` }, { status: 400 });
    const galeriLama = recipeGallery(row);
    if (galeriLama.length >= RECIPE_PHOTO_MAX_COUNT) {
      return Response.json({ error: `Satu resep maksimal ${RECIPE_PHOTO_MAX_COUNT} foto. Hapus foto lain dulu.` }, { status: 400 });
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    const mimeType = sniffImageMime(bytes);
    if (!mimeType) return Response.json({ error: "Format foto harus PNG, JPEG, atau WebP." }, { status: 400 });

    const key = await addRecipePhoto(row.slug, mimeType, bytes);
    const url = `/api/media/${key}`;
    const images = [...galeriLama, url];
    // Foto pertama otomatis menjadi thumbnail; tombol thumbnail di formulir
    // dapat meminta foto ini langsung menjadi thumbnail.
    const jadikanThumbnail = form.get("thumbnail") === "1" || !galeriLama.length || row.image === DEFAULT_RECIPE_IMAGE;
    const image = jadikanThumbnail ? url : row.image;
    await db.update(cmsRecipes).set({ image, images, updatedAt: new Date() }).where(eq(cmsRecipes.id, row.id));
    revalidateRecipePages([row.slug], Array.isArray(row.provinces) ? row.provinces : []);
    return Response.json({ url });
  } catch (error) {
    return databaseErrorResponse(error, "Foto gagal disimpan. Coba lagi.");
  }
}
