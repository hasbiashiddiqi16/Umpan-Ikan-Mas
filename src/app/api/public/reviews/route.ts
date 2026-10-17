import { and, count, desc, eq, gte, isNull, lte, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { cmsRecipes, cmsReviews } from "@/db/schema";
import { WATER_BODIES, normalizeFishingType } from "@/data/recipes";
import { recipes } from "@/data/recipes";
import { databaseErrorResponse } from "@/lib/database-status";
import { ROD_MAX, ROD_MIN, SESSION_MAX_MINUTES, SESSION_MIN_MINUTES } from "@/lib/catch-details";
import { isFutureReviewDate } from "@/lib/review-dates";
import { checkReviewLimits, hashReviewValue, isReviewHoneypotFilled, isTurnstileConfigured, readReviewDevice, reviewClientIp, reviewPayloadHash, verifyTurnstileToken } from "@/lib/review-guard";
import { getCurrentUser } from "@/lib/auth-user";
import { nilaiRisikoUlasan } from "@/lib/review-risk";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  if (slug && slug.length > 180) return Response.json({ reviews: [] });
  try {
    // Ulasan katalog dirender dari data statis pada detail resep. Hanya ulasan
    // komunitas yang dikirimkan ke API agar ulasan contoh (seed_key) tidak tampil ganda.
    // Ulasan bertanggal masa depan tidak pernah dikirim ke halaman publik.
    const rows = slug
      ? await db.select().from(cmsReviews).where(and(eq(cmsReviews.recipeSlug, slug), eq(cmsReviews.status, "approved"), isNull(cmsReviews.seedKey), lte(cmsReviews.createdAt, sql`now()`))).orderBy(desc(cmsReviews.createdAt)).limit(50)
      : await db.select().from(cmsReviews).where(and(eq(cmsReviews.status, "approved"), isNull(cmsReviews.seedKey), lte(cmsReviews.createdAt, sql`now()`))).orderBy(desc(cmsReviews.createdAt)).limit(250);
    return Response.json({
      reviews: rows.map((review) => ({
        ...review,
        // Ulasan lama bisa tersimpan dengan sebutan "Galat"; dibaca sebagai "Galatama".
        fishingType: normalizeFishingType(review.fishingType),
        date: new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(review.createdAt),
      })),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    // Katalog publik tetap tampil walau basis data belum tersambung.
    return Response.json({ reviews: [] });
  }
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object") return Response.json({ error: "Data ulasan tidak valid." }, { status: 400 });
    const item = body as Record<string, unknown>;
    // Honeypot: kolom tersembunyi yang tidak pernah diisi pengunjung sungguhan.
    // Bot yang mengisinya dijawab "sukses" palsu agar tidak belajar.
    if (isReviewHoneypotFilled(item)) {
      return Response.json({ ok: true, id: null, status: "pending" }, { status: 201 });
    }
    const ip = reviewClientIp(request);
    // Turnstile aktif hanya bila TURNSTILE_SECRET_KEY disetel di server.
    if (isTurnstileConfigured() && !(await verifyTurnstileToken(item.turnstileToken, ip))) {
      return Response.json({ error: "Verifikasi anti-bot gagal. Muat ulang halaman lalu coba lagi.", code: "turnstile" }, { status: 400 });
    }
    // Tanpa akun, perangkat dikenali lewat token bertanda tangan dari server.
    const device = readReviewDevice(request);
    if (!device) {
      return Response.json({ error: "Perangkat ini belum punya token ulasan. Muat ulang halaman lalu kirim ulang.", code: "device" }, { status: 400 });
    }
    // Tanggal ulasan selalu ditentukan server. Nilai bertanggal masa depan dari
    // klien (mis. jam perangkat yang salah) ditolak, bukan disimpan apa adanya.
    if (isFutureReviewDate(typeof item.createdAt === "string" ? item.createdAt : null)) {
      return Response.json({ error: "Tanggal ulasan tidak boleh melewati waktu sekarang." }, { status: 400 });
    }
    const recipeSlug = typeof item.recipeSlug === "string" ? item.recipeSlug : "";
    const name = typeof item.name === "string" ? item.name.trim() : "";
    const location = typeof item.location === "string" ? item.location.trim() : "";
    const comment = typeof item.comment === "string" ? item.comment.trim() : "";
    const rating = Number(item.rating);
    const allowedWeather = ["Hujan", "Mendung", "Cerah", "Berawan", "Panas"];
    const allowedWater = ["Keruh", "Hijau", "Jernih", "Kekuningan"];
    // "Galat" masih diterima dari formulir lama, tetapi disimpan sebagai "Galatama".
    const allowedTypes = ["Harian", "Lomba", "Galatama", "Galat"];
    if (!/^[a-z0-9-]{2,180}$/.test(recipeSlug) || name.length < 2 || name.length > 80 || location.length > 180 || comment.length < 12 || comment.length > 500 || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return Response.json({ error: "Lengkapi nama, komentar, dan rating 1–5 dengan benar." }, { status: 400 });
    }
    if (typeof item.weather !== "string" || !allowedWeather.includes(item.weather) || typeof item.water !== "string" || !allowedWater.includes(item.water) || typeof item.fishingType !== "string" || !allowedTypes.includes(item.fishingType)) {
      return Response.json({ error: "Kondisi mancing tidak valid." }, { status: 400 });
    }
    // Tipe air opsional: pengirim boleh tidak menyebutkannya. Kalau diisi, harus
    // salah satu tipe yang dikenal supaya data yang masuk ke evaluasi bersih.
    const waterBody = typeof item.waterBody === "string" && item.waterBody.trim() ? item.waterBody.trim() : null;
    if (waterBody && !(WATER_BODIES as string[]).includes(waterBody)) {
      return Response.json({ error: "Tipe air hanya boleh Kolam, Sungai, atau Danau." }, { status: 400 });
    }
    const catchCount = item.catchCount === undefined || item.catchCount === null ? null : Number(item.catchCount);
    if (catchCount !== null && (!Number.isInteger(catchCount) || catchCount < 0 || catchCount > 999)) return Response.json({ error: "Jumlah tangkapan tidak valid." }, { status: 400 });
    // Durasi sesi dan jumlah joran opsional, tapi kalau diisi harus masuk akal:
    // angka tangkapan tanpa keduanya tidak bisa dibandingkan.
    const sessionMinutes = item.sessionMinutes === undefined || item.sessionMinutes === null ? null : Number(item.sessionMinutes);
    if (sessionMinutes !== null && (!Number.isInteger(sessionMinutes) || sessionMinutes < SESSION_MIN_MINUTES || sessionMinutes > SESSION_MAX_MINUTES)) {
      return Response.json({ error: "Durasi sesi harus antara 30 menit dan 24 jam." }, { status: 400 });
    }
    const rodCount = item.rodCount === undefined || item.rodCount === null ? null : Number(item.rodCount);
    if (rodCount !== null && (!Number.isInteger(rodCount) || rodCount < ROD_MIN || rodCount > ROD_MAX)) {
      return Response.json({ error: "Jumlah joran harus antara 1 dan 10." }, { status: 400 });
    }
    const isSeedRecipe = recipes.some((recipe) => recipe.slug === recipeSlug);
    const [cmsRecipe] = isSeedRecipe ? [] : await db.select({ id: cmsRecipes.id, ownerId: cmsRecipes.ownerId }).from(cmsRecipes).where(and(eq(cmsRecipes.slug, recipeSlug), eq(cmsRecipes.status, "published"))).limit(1);
    if (!isSeedRecipe && !cmsRecipe) return Response.json({ error: "Resep tidak ditemukan atau belum dipublikasikan." }, { status: 404 });
    // Bila pengirim sedang masuk, ulasan terhubung ke akunnya dan nama yang
    // tampil adalah nama akun. Ulasan anonim tetap berjalan seperti sebelumnya.
    const account = await getCurrentUser().catch(() => null);
    const pengirim = account?.name ?? name;
    // Sidik jari isi kiriman + penjagaan anti-spam (24 jam per resep per perangkat).
    const payloadHash = reviewPayloadHash([recipeSlug, pengirim, location, rating, item.weather, item.water, waterBody, item.fishingType, catchCount, sessionMinutes, rodCount, comment]);
    const hit = await checkReviewLimits({ deviceId: device.id, ipHash: hashReviewValue(`ip:${ip}`), recipeSlug, payloadHash });
    if (hit) {
      // Kiriman ulang yang identik (mis. percobaan ulang jaringan) dijawab dengan
      // ulasan yang sudah ada supaya tidak menggandakan baris di basis data.
      if (hit.code === "duplicate" && hit.existingId) {
        const [existing] = await db.select({ status: cmsReviews.status }).from(cmsReviews).where(eq(cmsReviews.id, hit.existingId)).limit(1);
        return Response.json({ ok: true, id: hit.existingId, status: existing?.status ?? "pending", duplicate: true });
      }
      const headers: Record<string, string> = { "Cache-Control": "no-store" };
      if (hit.retryAfterSeconds) headers["Retry-After"] = String(hit.retryAfterSeconds);
      return Response.json({ error: hit.error, code: hit.code }, { status: hit.status, headers });
    }
    // Moderasi berbasis risiko: kiriman bersih langsung tampil, yang
    // mencurigakan ditahan sebagai pending untuk ditinjau admin. Pengirim
    // tetap melihat salinan tertahannya sendiri berlabel menunggu.
    const alasanTahan: string[] = [...nilaiRisikoUlasan({ nama: pengirim, komentar: comment }).alasan];
    if (account && cmsRecipe?.ownerId && cmsRecipe.ownerId === account.id) alasanTahan.push("Ulasan dari pemilik resep");
    const [ledakan] = await db.select({ total: count() }).from(cmsReviews).where(and(eq(cmsReviews.device, device.id), gte(cmsReviews.createdAt, new Date(Date.now() - 60 * 60 * 1000)), ne(cmsReviews.status, "rejected")));
    if (Number(ledakan?.total ?? 0) >= 3) alasanTahan.push("Banyak ulasan dari perangkat ini dalam satu jam terakhir");
    const status = alasanTahan.length ? "pending" : "approved";
    const holdReason = alasanTahan.length ? alasanTahan.join("; ").slice(0, 255) : null;
    const [created] = await db
      .insert(cmsReviews)
      .values({ recipeSlug, name: pengirim, location, rating, weather: item.weather, water: item.water, waterBody, fishingType: normalizeFishingType(item.fishingType), catchCount, sessionMinutes, rodCount, comment, status, holdReason, device: device.id, ipHash: hashReviewValue(`ip:${ip}`), payloadHash, userId: account?.id ?? null })
      .returning({ id: cmsReviews.id });
    return Response.json({ ok: true, id: created.id, status }, { status: 201 });
  } catch (error) {
    return databaseErrorResponse(error, "Ulasan terkirim secara lokal, tetapi server sedang tidak tersedia.");
  }
}
