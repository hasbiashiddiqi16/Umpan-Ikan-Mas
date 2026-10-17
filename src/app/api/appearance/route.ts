import { readAppearance } from "@/lib/appearance-server";
import { hitungStatistikSitus } from "@/lib/site-stats";

export const dynamic = "force-dynamic";

/**
 * Pengaturan tampilan untuk halaman publik (logo & popup sambutan).
 * Selalu menjawab 200: bila database belum siap, nilai bawaan yang dikirim.
 */
export async function GET() {
  const [appearance, statistikSitus] = await Promise.all([readAppearance(), hitungStatistikSitus()]);
  return Response.json({ ...appearance, statistikSitus }, {
    headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=600" },
  });
}
