import { and, eq, inArray, isNull, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { cmsReviews } from "@/db/schema";
import { databaseErrorResponse } from "@/lib/database-status";

export const dynamic = "force-dynamic";

/** Batas jumlah pemeriksaan per permintaan agar endpoint tetap ringan. */
const MAX_ITEMS = 50;

type Item = { id?: number; name?: string; comment?: string };
type HasilStatus = "approved" | "pending" | "rejected" | "missing";

/** Membersihkan daftar kiriman dari peramban; hanya bentuk yang wajar diterima. */
function parseItems(value: unknown): Item[] | null {
  if (!value || typeof value !== "object") return null;
  const raw = (value as { items?: unknown }).items;
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_ITEMS) return null;
  const items: Item[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") return null;
    const { id, name, comment } = entry as { id?: unknown; name?: unknown; comment?: unknown };
    const item: Item = {};
    if (typeof id === "number" && Number.isSafeInteger(id) && id > 0) item.id = id;
    if (typeof name === "string" && typeof comment === "string") {
      const bersihNama = name.trim();
      const bersihKomentar = comment.trim();
      if (bersihNama.length >= 2 && bersihNama.length <= 80 && bersihKomentar.length >= 12 && bersihKomentar.length <= 500) {
        item.name = bersihNama;
        item.comment = bersihKomentar;
      }
    }
    if (item.id === undefined && item.name === undefined) return null;
    items.push(item);
  }
  return items;
}

/**
 * Memeriksa status moderasi ulasan yang tersimpan di peramban pengirim.
 *
 * Halaman resep memakai ini supaya ulasan yang ditolak admin hilang dari
 * peramban pengirimnya, dan supaya salinan lokal tidak tampil ganda setelah
 * versi server disetujui. Hanya status yang dikembalikan — isi ulasan tidak
 * pernah dikirim balik, jadi endpoint ini tidak membuka data orang lain.
 */
export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const items = parseItems(body);
    if (!items) return Response.json({ error: "Daftar ulasan tidak valid." }, { status: 400 });

    const ids = items.map((item) => item.id).filter((id): id is number => typeof id === "number");
    const content = items.filter((item) => item.name !== undefined && item.comment !== undefined) as Required<Item>[];

    const filters: SQL[] = [];
    if (ids.length) filters.push(inArray(cmsReviews.id, ids));
    if (content.length) {
      const perIsi = content.map((item) => and(eq(cmsReviews.name, item.name), eq(cmsReviews.comment, item.comment)));
      const gabungan = or(...perIsi);
      if (gabungan) filters.push(gabungan);
    }
    if (!filters.length) return Response.json({ results: items.map(() => ({ status: "missing" satisfies HasilStatus })) });

    const rows = await db
      .select({ id: cmsReviews.id, name: cmsReviews.name, comment: cmsReviews.comment, status: cmsReviews.status })
      .from(cmsReviews)
      .where(and(isNull(cmsReviews.seedKey), filters.length === 1 ? filters[0] : or(...filters)));

    const byId = new Map(rows.map((row) => [row.id, row]));
    // Ulasan lama belum menyimpan ID server, jadi dicocokkan lewat isi kiriman.
    const byContent = new Map(rows.map((row) => [`${row.name}\u0000${row.comment}`, row]));

    const results = items.map((item) => {
      const row = item.id !== undefined ? byId.get(item.id) : byContent.get(`${item.name}\u0000${item.comment}`);
      const status: HasilStatus = row ? (row.status as HasilStatus) : "missing";
      return { id: row?.id ?? null, status };
    });

    return Response.json({ results }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return databaseErrorResponse(error, "Status ulasan belum dapat diperiksa.");
  }
}
