import { issueReviewDeviceToken, isTurnstileConfigured } from "@/lib/review-guard";

export const dynamic = "force-dynamic";

/**
 * Menerbitkan token perangkat anonim untuk pengunjung tanpa akun.
 *
 * Token ini ditandatangani server (HMAC) dan hanya berisi id acak + masa
 * berlaku, jadi tidak mengidentifikasi orang. Fungsinya satu: menegakkan aturan
 * "satu ulasan per resep per perangkat per 24 jam" tanpa membuat akun. Token
 * disimpan peramban di localStorage; kalau data peramban dihapus, peramban
 * cukup meminta token baru — ulasan yang sudah tersimpan di server tetap utuh.
 *
 * `previous` boleh dikirim peramban supaya id perangkat yang lama dipakai ulang
 * saat token diperbarui, sehingga riwayat 24 jam tidak hilang begitu saja.
 */
export async function POST(request: Request) {
  let previous: string | null = null;
  try {
    const body: unknown = await request.json();
    if (body && typeof body === "object") {
      const value = (body as { previous?: unknown }).previous;
      if (typeof value === "string") previous = value;
    }
  } catch {
    // Tanpa body pun token tetap bisa diterbitkan.
  }
  const device = issueReviewDeviceToken(previous);
  return Response.json(
    { device: device.id, token: device.token, turnstile: isTurnstileConfigured() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
