import { readAppearance } from "@/lib/appearance-server";

export const dynamic = "force-dynamic";

/**
 * Pengaturan tampilan untuk halaman publik (logo & popup sambutan).
 * Selalu menjawab 200: bila database belum siap, nilai bawaan yang dikirim.
 */
export async function GET() {
  const appearance = await readAppearance();
  return Response.json(appearance, {
    headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=600" },
  });
}
