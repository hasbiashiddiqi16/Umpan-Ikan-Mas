import { analyticsEvents } from "@/db/schema";
import { db } from "@/db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object") return Response.json({ ok: false }, { status: 400 });
    const payload = body as { path?: unknown; type?: unknown; entitySlug?: unknown };
    const path = typeof payload.path === "string" ? payload.path.slice(0, 500) : "";
    if (!path.startsWith("/") || path.startsWith("/dashboard") || path.startsWith("/api")) return Response.json({ ok: false }, { status: 400 });
    const eventType = payload.type === "recipe_view" ? "recipe_view" : "page_view";
    const entitySlug = typeof payload.entitySlug === "string" && /^[a-z0-9-]{1,180}$/.test(payload.entitySlug) ? payload.entitySlug : null;
    await db.insert(analyticsEvents).values({ path, eventType, entitySlug });
    return Response.json({ ok: true }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    // Tracking is best-effort and must never interrupt a public page.
    return Response.json({ ok: false }, { status: 503 });
  }
}
