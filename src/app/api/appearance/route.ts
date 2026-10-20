import { readAppearance } from "@/lib/appearance-server";

export const dynamic = "force-dynamic";

/**
 * Pengaturan tampilan untuk halaman publik (logo & popup sambutan).
 * Selalu menjawab 200: bila database belum siap, nilai bawaan yang dikirim.
 * Sengaja `no-store`: pengaturan popup harus selalu segar supaya perubahan
 * dari dashboard langsung terlihat tanpa menghapus cache peramban/CDN.
 */
export async function GET() {
  const appearance = await readAppearance();
  return Response.json(appearance, {
    headers: { "Cache-Control": "no-store" },
  });
}
