import { readFile } from "node:fs/promises";
import path from "node:path";
import { MEDIA_DEFAULTS, isRecipePhotoKey, resolveMediaKey } from "@/lib/appearance";
import { readMediaFile } from "@/lib/appearance-server";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ key: string }> };

/**
 * Melayani gambar yang diunggah dari dashboard. Aset tampilan memakai
 * alamat berversi waktu unggah (`/api/media/popup-desktop-v<versi>`):
 * alamat berubah setiap gambar diganti, jadi cache pengoptimal gambar,
 * CDN, dan peramban langsung menyajikan gambar baru. Alamat tanpa versi
 * tetap diterima dan menyajikan berkas terbaru atau berkas bawaan di
 * `public/images`.
 */
export async function GET(request: Request, context: RouteContext) {
  const { key } = await context.params;
  const resolved = resolveMediaKey(key);
  if (!resolved && !isRecipePhotoKey(key)) return new Response("Aset tidak dikenal.", { status: 404 });
  const baseKey = resolved?.key ?? key;

  try {
    const file = await readMediaFile(baseKey);
    if (file) {
      return new Response(new Uint8Array(file.bytes), {
        headers: {
          "Content-Type": file.mimeType,
          "Content-Length": String(file.bytes.length),
          // Alamat berversi (foto recipe-<slug>-v... dan aset tampilan
          // -v<waktu unggah>) isinya tidak pernah berubah, jadi boleh
          // disimpan setahun penuh. Alamat aset tanpa versi disimpan
          // sehari + stale-while-revalidate.
          "Cache-Control": resolved?.versioned || isRecipePhotoKey(key) ? "public, max-age=31536000, immutable" : "public, max-age=86400, stale-while-revalidate=604800",
        },
      });
    }
  } catch {
    // Database belum siap (mis. pratinjau lokal): pakai berkas bawaan.
  }

  // Selain aset bawaan berkunci tetap, tidak ada berkas cadangan di
  // `public/`: foto racikan unggahan (`recipe-<slug>`) hanya ada di basis
  // data, jadi sampai di sini berarti fotonya memang tidak ada.
  if (!resolved) return new Response("Foto tidak ditemukan.", { status: 404 });

  // Berkas bawaan disajikan langsung (200), bukan dialihkan (307): pengoptimal
  // gambar Next menolak sumber yang membalas redirect, jadi logo/poster/hero
  // bawaan tidak akan teroptimasi — dan bisa gagal tampil — bila hanya
  // dialihkan ke `public/`.
  try {
    const bawaan = MEDIA_DEFAULTS[resolved.key];
    const bytes = await readFile(path.join(process.cwd(), "public", bawaan));
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": bawaan.endsWith(".png") ? "image/png" : "image/jpeg",
        "Content-Length": String(bytes.length),
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return Response.redirect(new URL(MEDIA_DEFAULTS[resolved.key], request.url), 307);
  }
}
