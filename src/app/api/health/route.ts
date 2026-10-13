import { checkDatabase } from "@/lib/database-status";

export const dynamic = "force-dynamic";

/**
 * Kesehatan aplikasi dan basis data. Kontrak lama tetap dijaga: 200 saat siap,
 * bukan-200 saat ada masalah, sehingga pemantau uptime yang sudah ada tetap
 * bekerja. Isinya hanya status, nama variabel lingkungan, dan jumlah baris —
 * tanpa data atau rahasia.
 */
export async function GET() {
  const database = await checkDatabase();
  const ok = database.connected && database.missingTables.length === 0;
  return Response.json(
    { ok, checkedAt: new Date().toISOString(), database },
    { status: ok ? 200 : 500, headers: { "Cache-Control": "no-store" } },
  );
}
