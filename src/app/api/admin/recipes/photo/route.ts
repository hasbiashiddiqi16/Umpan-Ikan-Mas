import { RECIPE_PHOTO_MAX_BYTES, sniffImageMime } from "@/lib/appearance";
import { addRecipePhoto } from "@/lib/appearance-server";
import { requireAdminApi } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const megabytes = (bytes: number) => `${(bytes / 1_000_000).toFixed(1)} MB`;

/**
 * Mengunggah satu foto racikan dari formulir dashboard. Foto disimpan di
 * tabel media dengan kunci berversi `recipe-<slug>-v<versi>` dan dilayani
 * publik lewat `/api/media/recipe-<slug>-v<versi>`; alamat berversi itulah
 * yang ditambahkan formulir ke daftar `images` resep (satu resep dapat
 * memiliki beberapa foto, salah satunya dipilih sebagai thumbnail di
 * kolom `image`). Foto lain tidak dihapus — pembersihan foto yang tidak
 * lagi dirujuk terjadi saat resep disimpan.
 */
export async function POST(request: Request) {
  const unauthorized = await requireAdminApi("konten");
  if (unauthorized) return unauthorized;

  try {
    const form = await request.formData();
    const file = form.get("file");
    const slug = form.get("slug");
    if (typeof slug !== "string" || slug.length > 180 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return Response.json({ error: "Isi judul resep dulu agar alamat fotonya bisa dibuat." }, { status: 400 });
    }
    if (!(file instanceof File)) return Response.json({ error: "Pilih berkas foto terlebih dahulu." }, { status: 400 });
    if (file.size === 0) return Response.json({ error: "Berkas kosong." }, { status: 400 });
    if (file.size > RECIPE_PHOTO_MAX_BYTES) {
      return Response.json({ error: `Ukuran foto maksimal ${megabytes(RECIPE_PHOTO_MAX_BYTES)}.` }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const mimeType = sniffImageMime(bytes);
    if (!mimeType) return Response.json({ error: "Format foto harus PNG, JPEG, atau WebP." }, { status: 400 });

    const key = await addRecipePhoto(slug, mimeType, bytes);
    return Response.json({ notice: "Foto tersimpan.", url: `/api/media/${key}` });
  } catch {
    return Response.json({ error: "Foto gagal disimpan. Coba lagi." }, { status: 500 });
  }
}
