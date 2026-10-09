import { and, count, desc, gte, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { analyticsEvents, cmsRecipes, cmsReviews } from "@/db/schema";
import { requireAdminApi } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;

  try {
    const requestedDays = Number(new URL(request.url).searchParams.get("days"));
    const days = [7, 30, 90].includes(requestedDays) ? requestedDays : 30;
    const now = new Date();
    const currentStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    currentStart.setUTCDate(currentStart.getUTCDate() - (days - 1));
    const previousStart = new Date(currentStart.getTime() - days * 24 * 60 * 60 * 1000);
    const [currentCount] = await db.select({ value: count() }).from(analyticsEvents).where(gte(analyticsEvents.createdAt, currentStart));
    const [previousCount] = await db.select({ value: count() }).from(analyticsEvents).where(and(gte(analyticsEvents.createdAt, previousStart), lt(analyticsEvents.createdAt, currentStart)));
    const groupedDay = sql`to_char(${analyticsEvents.createdAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD')`;
    const dailyRows = await db.select({ day: sql<string>`${groupedDay}`, views: sql<number>`count(*)::int` }).from(analyticsEvents).where(gte(analyticsEvents.createdAt, currentStart)).groupBy(groupedDay).orderBy(groupedDay);
    const topPages = await db.select({ path: analyticsEvents.path, views: sql<number>`count(*)::int` }).from(analyticsEvents).where(gte(analyticsEvents.createdAt, currentStart)).groupBy(analyticsEvents.path).orderBy(desc(sql`count(*)`)).limit(6);
    const contentStats = await db.select({ status: cmsRecipes.status, total: count() }).from(cmsRecipes).groupBy(cmsRecipes.status);
    const reviewStats = await db.select({ status: cmsReviews.status, total: count() }).from(cmsReviews).groupBy(cmsReviews.status);
    const [allCmsCount] = await db.select({ value: count() }).from(cmsRecipes);
    const daily = Array.from({ length: days }, (_, index) => {
      const dayDate = new Date(currentStart.getTime() + index * 24 * 60 * 60 * 1000);
      const key = dayDate.toISOString().slice(0, 10);
      return { day: key, views: dailyRows.find((row) => row.day === key)?.views ?? 0 };
    });
    const published = contentStats.find((item) => item.status === "published")?.total ?? 0;
    const drafts = contentStats.find((item) => item.status === "draft")?.total ?? 0;
    const archived = contentStats.find((item) => item.status === "archived")?.total ?? 0;
    const pendingReviews = reviewStats.find((item) => item.status === "pending")?.total ?? 0;
    const approvedReviews = reviewStats.find((item) => item.status === "approved")?.total ?? 0;
    const views = Number(currentCount?.value ?? 0);
    const previousViews = Number(previousCount?.value ?? 0);
    const change = previousViews === 0 ? null : Math.round(((views - previousViews) / previousViews) * 100);
    return Response.json({
      views,
      previousViews,
      change,
      contentTotal: Number(allCmsCount?.value ?? 0),
      published,
      drafts,
      archived,
      pendingReviews,
      approvedReviews,
      daily,
      topPages,
      range: `${days} hari terakhir`,
      generatedAt: now.toISOString(),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Analitik belum dapat dimuat." }, { status: 503 });
  }
}
