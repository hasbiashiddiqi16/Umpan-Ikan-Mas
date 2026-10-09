import { eq } from "drizzle-orm";
import { db } from "@/db";
import { cmsReviews } from "@/db/schema";
import { requireAdminApi } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const id = Number((await context.params).id);
  if (!Number.isSafeInteger(id) || id < 1) return Response.json({ error: "ID ulasan tidak valid." }, { status: 400 });
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || !["pending", "approved", "rejected"].includes(String((body as Record<string, unknown>).status))) return Response.json({ error: "Status moderasi tidak valid." }, { status: 400 });
    const status = (body as { status: "pending" | "approved" | "rejected" }).status;
    const [updated] = await db.update(cmsReviews).set({ status }).where(eq(cmsReviews.id, id)).returning();
    if (!updated) return Response.json({ error: "Ulasan tidak ditemukan." }, { status: 404 });
    return Response.json({ review: updated });
  } catch {
    return Response.json({ error: "Moderasi ulasan gagal disimpan." }, { status: 500 });
  }
}
