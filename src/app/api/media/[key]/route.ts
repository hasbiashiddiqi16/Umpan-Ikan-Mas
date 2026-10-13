import { MEDIA_DEFAULTS, isMediaKey } from "@/lib/appearance";
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
  if (!isMediaKey(key)) return new Response("Aset tidak dikenal.", { status: 404 });

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

  return Response.redirect(new URL(MEDIA_DEFAULTS[key], request.url), 307);
}
