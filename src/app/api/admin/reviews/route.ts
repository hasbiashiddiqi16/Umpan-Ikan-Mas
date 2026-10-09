import { desc } from "drizzle-orm";
import { db } from "@/db";
import { cmsReviews } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const reviews = await db.select().from(cmsReviews).orderBy(desc(cmsReviews.createdAt)).limit(250);
    return Response.json({ reviews }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Ulasan belum dapat dimuat." }, { status: 503 });
  }
}
