import "server-only";

import { count, eq } from "drizzle-orm";
import { db, databaseEnvName, isDatabaseConfigured } from "@/db";
import { cmsMedia, cmsRecipes, cmsReviews, cmsSettings } from "@/db/schema";
import { normalizeDatabaseUrl } from "@/lib/database-url";

/** Pesan yang ditampilkan ke admin saat basis data belum tersambung. */
export const DATABASE_HINT =
  "Basis data belum tersambung di lingkungan ini. Setel DATABASE_URL (atau NETLIFY_DB_URL) dengan connection string basis data, lalu deploy ulang.";

/** Pesan saat connection string ada tetapi basis data tidak bisa dihubungi. */
export const DATABASE_CONNECTION_HINT =
  "Basis data tidak dapat dihubungi dengan connection string yang ada. Periksa nilai DATABASE_URL (atau NETLIFY_DB_URL), lalu deploy ulang.";

/** Pesan yang ditampilkan saat tabelnya belum ada, biasanya migrasi belum jalan. */
export const DATABASE_MIGRATION_HINT =
  "Basis data tersambung, tetapi tabelnya belum ada. Jalankan “npm run db:migrate” dengan DATABASE_URL yang sama, lalu coba lagi.";

/** Kode galat PostgreSQL untuk tabel yang belum ada. */
const UNDEFINED_TABLE = "42P01";
/** Kode galat koneksi: ditolak, host tidak ditemukan, autentikasi, basis data tidak ada, server belum siap. */
const CONNECTION_CODES = new Set(["ECONNREFUSED", "ENOTFOUND", "EAI_AGAIN", "ETIMEDOUT", "28P01", "28000", "3D000", "57P03", "08006", "08001"]);

type ErrorSignals = { messages: string[]; codes: string[]; detail: string };

/**
 * Mengumpulkan pesan dan kode galat dari rantai `cause`. Drizzle membungkus galat
 * PostgreSQL menjadi "Failed query: …", sedangkan keterangan aslinya (mis.
 * "relation does not exist") ada di `cause`, jadi keduanya perlu dibaca.
 */
function errorSignals(error: unknown): ErrorSignals {
  const messages: string[] = [];
  const codes: string[] = [];
  let current: unknown = error;
  for (let depth = 0; depth < 6 && current; depth += 1) {
    if (!(current instanceof Error)) break;
    if (current.message) messages.push(current.message);
    const code = (current as { code?: unknown }).code;
    if (typeof code === "string") codes.push(code);
    current = (current as { cause?: unknown }).cause;
  }
  return { messages, codes, detail: messages[messages.length - 1] ?? "" };
}

/**
 * Keterangan singkat yang berguna untuk ditampilkan. Pesan pembungkus drizzle
 * ("Failed query: …") dilewati karena tidak menjelaskan penyebabnya.
 */
function describe(signals: ErrorSignals): string {
  const clean = signals.messages.filter((message) => message && !/^Failed query:/i.test(message));
  const detail = clean[clean.length - 1]?.split("\n")[0]?.trim();
  if (detail) return detail.slice(0, 140);
  const code = signals.codes.find((value) => CONNECTION_CODES.has(value)) ?? signals.codes[signals.codes.length - 1];
  return code ? `kode ${code}` : "";
}

function isMissingTable(signals: ErrorSignals): boolean {
  return signals.codes.includes(UNDEFINED_TABLE) || signals.messages.some((message) => /does not exist|undefined_table/i.test(message));
}

function isConnectionFailure(signals: ErrorSignals): boolean {
  return signals.codes.some((code) => CONNECTION_CODES.has(code));
}

export type DatabaseHealth = {
  /** Nama variabel lingkungan yang dipakai, bukan nilainya. */
  envVar: "DATABASE_URL" | "NETLIFY_DB_URL" | null;
  /** Mode TLS yang dipakai klien: "required" otomatis untuk host non-lokal. */
  ssl: "required" | "disabled" | "default";
  configured: boolean;
  connected: boolean;
  /** Tabel yang berhasil dibaca, beserta jumlah barisnya. */
  tables: Record<string, number>;
  /** Tabel wajib yang belum ada. */
  missingTables: string[];
  /** Jumlah ulasan komunitas yang menunggu moderasi (kalau bisa dibaca). */
  pendingReviews: number | null;
  message: string;
};

const REQUIRED_TABLES = ["cms_recipes", "cms_reviews", "cms_media", "cms_settings"] as const;

type CountableTable = typeof cmsRecipes | typeof cmsReviews | typeof cmsMedia | typeof cmsSettings;

async function countRows(table: CountableTable) {
  const rows = await db.select({ total: count() }).from(table);
  return Number(rows[0]?.total ?? 0);
}

/**
 * Memeriksa koneksi basis data tanpa membocorkan rahasia apa pun. Dipakai oleh
 * /api/health supaya masalah koneksi bisa diketahui langsung dari browser.
 */
export async function checkDatabase(): Promise<DatabaseHealth> {
  const envVar = databaseEnvName();
  const { ssl } = normalizeDatabaseUrl(process.env.DATABASE_URL || process.env.NETLIFY_DB_URL);
  const base = { envVar, ssl, tables: {} as Record<string, number>, missingTables: [] as string[], pendingReviews: null as number | null };
  if (!envVar) {
    return { ...base, configured: false, connected: false, message: DATABASE_HINT };
  }

  let connected = false;
  const tables: Record<string, number> = {};
  const missing: string[] = [];

  const readers: [string, () => Promise<number>][] = [
    ["cms_recipes", () => countRows(cmsRecipes)],
    ["cms_reviews", () => countRows(cmsReviews)],
    ["cms_media", () => countRows(cmsMedia)],
    ["cms_settings", () => countRows(cmsSettings)],
  ];
  for (const [name, read] of readers) {
    try {
      tables[name] = await read();
      connected = true;
    } catch (error) {
      const signals = errorSignals(error);
      if (isMissingTable(signals)) {
        missing.push(name);
        connected = true;
      } else {
        const detail = describe(signals) || "tidak ada keterangan";
        return { ...base, configured: true, connected: false, message: `${DATABASE_CONNECTION_HINT} (${detail})` };
      }
    }
  }

  const missingTables = REQUIRED_TABLES.filter((name) => missing.includes(name));
  if (missingTables.length) {
    return { ...base, configured: true, connected, tables, missingTables, message: DATABASE_MIGRATION_HINT };
  }

  let pendingReviews: number | null = null;
  try {
    const rows = await db.select({ total: count() }).from(cmsReviews).where(eq(cmsReviews.status, "pending"));
    pendingReviews = Number(rows[0]?.total ?? 0);
  } catch {
    pendingReviews = null;
  }

  return {
    ...base,
    configured: true,
    connected,
    tables,
    missingTables: [],
    pendingReviews,
    message: "Basis data tersambung dan tabelnya siap dipakai.",
  };
}

/** Membungkus galat basis data menjadi pesan yang berguna untuk pengguna API. */
export function databaseErrorResponse(error: unknown, fallback: string): Response {
  if (!isDatabaseConfigured()) {
    return Response.json({ error: DATABASE_HINT }, { status: 503 });
  }
  const signals = errorSignals(error);
  if (isMissingTable(signals)) {
    return Response.json({ error: DATABASE_MIGRATION_HINT }, { status: 503 });
  }
  if (isConnectionFailure(signals) || signals.messages.length === 0) {
    const detail = describe(signals);
    return Response.json({ error: detail ? `${DATABASE_CONNECTION_HINT} (${detail})` : DATABASE_CONNECTION_HINT }, { status: 503 });
  }
  return Response.json({ error: fallback }, { status: 503 });
}
