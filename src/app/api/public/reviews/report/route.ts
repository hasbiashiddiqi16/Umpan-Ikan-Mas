import { and, count, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { cmsReviewReports, cmsReviews } from "@/db/schema";
import { databaseErrorResponse } from "@/lib/database-status";
import { hashReviewValue, readReviewDevice, reviewClientIp } from "@/lib/review-guard";

export const dynamic = "force-dynamic";

const ALASAN_VALID = ["spam", "kasar", "tidak-relevan", "lainnya"];
/** Berapa laporan berbeda yang membuat ulasan ditahan otomatis. */
const BATAS_PELAPOR = 3;
/** Batas laporan per perangkat per hari agar tombolnya tidak disalahgunakan. */
const BATAS_LAPORAN_HARIAN = 10;

/**
 * Menerima laporan pengunjung terhadap ulasan yang sudah tampil publik.
 *
 * Satu laporan per perangkat per ulasan (token perangkat yang sama dengan
 * pengiriman ulasan). Laporan tidak langsung menghapus apa pun: laporan
 * terbuka terkumpul untuk admin di Studio → Moderasi Ulasan, dan begitu
 * ada tiga pelapor berbeda, ulasan itu ditahan otomatis (pending) sampai
 * admin memutuskan.
 */
export async function POST(request: Request) {
  try {
    const device = readReviewDevice(request);
    if (!device) {
      return Response.json({ error: "Perangkat ini belum punya token. Muat ulang halaman lalu coba lagi.", code: "device" }, { status: 400 });
    }
    const body: unknown = await request.json().catch(() => null);
    if (!body || typeof body !== "object") return Response.json({ error: "Data laporan tidak valid." }, { status: 400 });
    const item = body as Record<string, unknown>;
    const reviewId = Number(item.reviewId);
    const reason = typeof item.reason === "string" ? item.reason : "";
    if (!Number.isSafeInteger(reviewId) || reviewId < 1 || !ALASAN_VALID.includes(reason)) {
      return Response.json({ error: "Pilih ulasan dan alasan laporan yang valid." }, { status: 400 });
    }

    const [review] = await db
      .select({ id: cmsReviews.id, status: cmsReviews.status })
      .from(cmsReviews)
      .where(and(eq(cmsReviews.id, reviewId), eq(cmsReviews.status, "approved")))
      .limit(1);
    if (!review) return Response.json({ error: "Ulasan tidak ditemukan atau belum tampil publik." }, { status: 404 });

    const ipHash = hashReviewValue(`ip:${reviewClientIp(request)}`);
    const [sudahAda] = await db
      .select({ id: cmsReviewReports.id })
      .from(cmsReviewReports)
      .where(and(eq(cmsReviewReports.reviewId, reviewId), eq(cmsReviewReports.device, device.id)))
      .limit(1);
    if (sudahAda) return Response.json({ ok: true, duplicate: true });

    const sejakKemarin = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [kuota] = await db
      .select({ total: count() })
      .from(cmsReviewReports)
      .where(and(eq(cmsReviewReports.device, device.id), gte(cmsReviewReports.createdAt, sejakKemarin)));
    if (Number(kuota?.total ?? 0) >= BATAS_LAPORAN_HARIAN) {
      return Response.json({ error: "Kamu sudah mengirim cukup banyak laporan hari ini. Terima kasih atas kepeduliannya.", code: "report-limit" }, { status: 429 });
    }

    await db.insert(cmsReviewReports).values({ reviewId, reason, device: device.id, ipHash, status: "open" });

    // Tiga pelapor berbeda: tahan ulasan sampai admin memutuskan.
    const pelapor = await db
      .select({ device: cmsReviewReports.device })
      .from(cmsReviewReports)
      .where(eq(cmsReviewReports.reviewId, reviewId));
    const jumlahPelapor = new Set(pelapor.map((row) => row.device)).size;
    let ditahan = false;
    if (jumlahPelapor >= BATAS_PELAPOR) {
      const diperbarui = await db
        .update(cmsReviews)
        .set({ status: "pending", holdReason: `Dilaporkan ${jumlahPelapor} pengunjung`.slice(0, 255) })
        .where(and(eq(cmsReviews.id, reviewId), eq(cmsReviews.status, "approved")))
        .returning({ id: cmsReviews.id });
      ditahan = diperbarui.length > 0;
    }
    return Response.json({ ok: true, ditahan }, { status: 201 });
  } catch (error) {
    return databaseErrorResponse(error, "Laporan belum bisa dikirim. Coba lagi sebentar lagi.");
  }
}
