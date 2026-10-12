import { count, desc, isNull, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { cmsReviews } from "@/db/schema";
import { requireAdminApi } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;

  try {
    const [reviews, catalogSummary] = await Promise.all([
      // Moderasi hanya memuat kiriman komunitas. Ulasan katalog telah disetujui
      // saat sinkronisasi dan tidak perlu ditinjau satu per satu.
      db.select().from(cmsReviews).where(isNull(cmsReviews.seedKey)).orderBy(desc(cmsReviews.createdAt)).limit(250),
      db.select({ total: count() }).from(cmsReviews).where(isNotNull(cmsReviews.seedKey)),
    ]);
    return Response.json({ reviews, catalogReviewCount: Number(catalogSummary[0]?.total ?? 0) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Ulasan belum dapat dimuat." }, { status: 503 });
  }
}
