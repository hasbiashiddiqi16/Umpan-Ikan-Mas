import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { cmsReviewReports, cmsReviews } from "@/db/schema";
import { requireAdminApi } from "@/lib/admin-auth";
import { databaseErrorResponse } from "@/lib/database-status";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const id = Number((await context.params).id);
  if (!Number.isSafeInteger(id) || id < 1) return Response.json({ error: "ID ulasan tidak valid." }, { status: 400 });
  try {
    const body: unknown = await request.json();
    if (body && typeof body === "object" && (body as Record<string, unknown>).laporan === "abaikan") {
      // Menutup laporan tanpa mengubah ulasan yang dilaporkan.
      const ditutup = await db.update(cmsReviewReports).set({ status: "diabaikan" }).where(and(eq(cmsReviewReports.reviewId, id), eq(cmsReviewReports.status, "open"))).returning({ id: cmsReviewReports.id });
      return Response.json({ ok: true, ditutup: ditutup.length });
    }
    if (!body || typeof body !== "object" || !["pending", "approved", "rejected"].includes(String((body as Record<string, unknown>).status))) return Response.json({ error: "Status moderasi tidak valid." }, { status: 400 });
    const status = (body as { status: "pending" | "approved" | "rejected" }).status;
    // Ulasan katalog bersifat referensi dan dijaga sinkron dengan data sumber.
    const [updated] = await db.update(cmsReviews).set({ status }).where(and(eq(cmsReviews.id, id), isNull(cmsReviews.seedKey))).returning();
    if (!updated) return Response.json({ error: "Ulasan tidak ditemukan atau merupakan data katalog yang tidak perlu dimoderasi." }, { status: 404 });
    // Keputusan status sekaligus menutup laporan terbuka atas ulasan ini.
    await db.update(cmsReviewReports).set({ status: "selesai" }).where(and(eq(cmsReviewReports.reviewId, id), eq(cmsReviewReports.status, "open")));
    return Response.json({ review: updated });
  } catch (error) {
    return databaseErrorResponse(error, "Moderasi ulasan gagal disimpan.");
  }
}
