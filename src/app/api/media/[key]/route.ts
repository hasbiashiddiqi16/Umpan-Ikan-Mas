import { readFile } from "node:fs/promises";
import path from "node:path";
import { MEDIA_DEFAULTS, isMediaKey, isRecipePhotoKey } from "@/lib/appearance";
import { readMediaFile } from "@/lib/appearance-server";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ key: string }> };

/**
 * Melayani gambar yang diunggah dari dashboard. Alamat setiap aset tetap
 * (`/api/media/logo`, `/api/media/popup-desktop`, dan seterusnya) supaya
 * halaman publik yang sudah dirender statis tidak perlu dibangun ulang saat
 * gambarnya diganti. Bila belum ada unggahan, permintaan dialihkan ke berkas
 * bawaan di `public/images`.
 */
export async function GET(request: Request, context: RouteContext) {
  const { key } = await context.params;
  if (!isMediaKey(key) && !isRecipePhotoKey(key)) return new Response("Aset tidak dikenal.", { status: 404 });

  try {
    const file = await readMediaFile(key);
    if (file) {
      return new Response(new Uint8Array(file.bytes), {
        headers: {
          "Content-Type": file.mimeType,
          "Content-Length": String(file.bytes.length),
          // Umur pendek agar logo/poster baru cepat terlihat setelah diganti,
          // tetapi tetap tidak membebani database pada tiap kunjungan.
          "Cache-Control": "public, max-age=120, stale-while-revalidate=600",
        },
      });
    }
  } catch {
    // Database belum siap (mis. pratinjau lokal): pakai berkas bawaan.
  }

  // Selain aset bawaan berkunci tetap, tidak ada berkas cadangan di
  // `public/`: foto racikan unggahan (`recipe-<slug>`) hanya ada di basis
  // data, jadi sampai di sini berarti fotonya memang tidak ada.
  if (!isMediaKey(key)) return new Response("Foto tidak ditemukan.", { status: 404 });

  // Berkas bawaan disajikan langsung (200), bukan dialihkan (307): pengoptimal
  // gambar Next menolak sumber yang membalas redirect, jadi logo/poster/hero
  // bawaan tidak akan teroptimasi — dan bisa gagal tampil — bila hanya
  // dialihkan ke `public/`.
  try {
    const bawaan = MEDIA_DEFAULTS[key];
    const bytes = await readFile(path.join(process.cwd(), "public", bawaan));
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": bawaan.endsWith(".png") ? "image/png" : "image/jpeg",
        "Content-Length": String(bytes.length),
        "Cache-Control": "public, max-age=120, stale-while-revalidate=600",
      },
    });
  } catch {
    return Response.redirect(new URL(MEDIA_DEFAULTS[key], request.url), 307);
  }
}
