import { MEDIA_MAX_BYTES, isMediaKey, mediaUrl, sniffImageMime } from "@/lib/appearance";
import { deleteMediaFile, saveMediaFile } from "@/lib/appearance-server";
import { requireAdminApi } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ key: string }> };

const megabytes = (bytes: number) => `${(bytes / 1_000_000).toFixed(1)} MB`;

/** Mengunggah gambar (logo/poster) menggantikan aset bawaan. */
export async function POST(request: Request, context: RouteContext) {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const { key } = await context.params;
  if (!isMediaKey(key)) return Response.json({ error: "Aset tidak dikenal." }, { status: 404 });

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return Response.json({ error: "Pilih berkas gambar terlebih dahulu." }, { status: 400 });

    const limit = MEDIA_MAX_BYTES[key];
    if (file.size === 0) return Response.json({ error: "Berkas kosong." }, { status: 400 });
    if (file.size > limit) return Response.json({ error: `Ukuran berkas maksimal ${megabytes(limit)}.` }, { status: 400 });

    const bytes = Buffer.from(await file.arrayBuffer());
    const mimeType = sniffImageMime(bytes);
    if (!mimeType) return Response.json({ error: "Format harus PNG, JPEG, atau WebP." }, { status: 400 });

    await saveMediaFile(key, mimeType, bytes);
    return Response.json({
      notice: "Gambar tersimpan.",
      media: { key, url: mediaUrl(key), custom: true, updatedAt: new Date().toISOString() },
    });
  } catch {
    return Response.json({ error: "Gambar gagal disimpan. Coba lagi." }, { status: 500 });
  }
}

/** Menghapus unggahan sehingga aset bawaan dipakai kembali. */
export async function DELETE(_request: Request, context: RouteContext) {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const { key } = await context.params;
  if (!isMediaKey(key)) return Response.json({ error: "Aset tidak dikenal." }, { status: 404 });

  try {
    await deleteMediaFile(key);
    return Response.json({ notice: "Aset bawaan dipakai kembali.", media: { key, url: mediaUrl(key), custom: false, updatedAt: null } });
  } catch {
    return Response.json({ error: "Gagal mengembalikan aset bawaan. Coba lagi." }, { status: 500 });
  }
}
