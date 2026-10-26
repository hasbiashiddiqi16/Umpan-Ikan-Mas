import "server-only";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { cmsSettings } from "@/db/schema";

/**
 * Penyimpanan password dashboard yang bisa diganti dari dashboard.
 *
 * Password dari environment (`ADMIN_PASSWORD`) tetap menjadi dasar sistem ini:
 * ia dipakai saat belum ada password baru, menjadi kunci cadangan, dan (kalau
 * `ADMIN_SESSION_SECRET` kosong) menandatangani cookie sesi. Yang disimpan di
 * basis data hanyalah *penimpa*-nya, dalam bentuk hash scrypt — password asli
 * tidak pernah disimpan.
 *
 * Setiap perubahan juga menaikkan `generation`, sebuah nomor yang ikut
 * ditanamkan ke dalam cookie sesi. Sesi lama yang membawa nomor berbeda
 * otomatis ditolak, jadi mengganti password sekaligus mengeluarkan perangkat
 * lain yang masih login.
 */

/** Kunci baris di tabel `cms_settings`. */
export const ADMIN_PASSWORD_SETTING_KEY = "admin_password";

/** Parameter scrypt: kuat untuk server, tetap ringan (memori 16 MB). */
const SCRYPT_KEYLEN = 64;
const SCRYPT_OPTIONS = { N: 16_384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 } as const;

type StoredRecord = {
  generation: number;
  /** `null` berarti kembali memakai password dari environment. */
  hash: string | null;
  /** Waktu perubahan terakhir; `null` bila baris lama belum menyimpannya. */
  updatedAt: string | null;
};

export type AdminPasswordState = {
  /** Nomor versi password; ikut ditanamkan ke cookie sesi. */
  generation: number;
  /** `true` bila password sudah pernah diganti dari dashboard. */
  custom: boolean;
  /** Waktu perubahan terakhir (ISO), atau `null` bila belum pernah diganti. */
  updatedAt: string | null;
  /**
   * `false` bila basis data belum tersambung/belum siap. Selama itu password
   * dari environment tetap dipakai dan dashboard tidak terkunci.
   */
  readable: boolean;
};

const BELUM_ADA: AdminPasswordState = { generation: 0, custom: false, updatedAt: null, readable: true };

function encode(buffer: Buffer) {
  return buffer.toString("base64url");
}

function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  return new Promise((resolve, reject) => {
    scrypt(password, salt, SCRYPT_KEYLEN, { ...SCRYPT_OPTIONS }, (error, derived) => {
      if (error) reject(error);
      else resolve(`scrypt$${SCRYPT_OPTIONS.N}$${SCRYPT_OPTIONS.r}$${SCRYPT_OPTIONS.p}$${encode(salt)}$${encode(derived)}`);
    });
  });
}

/**
 * Membandingkan password dengan hash tersimpan. Bentuk yang tidak dikenal
 * dianggap tidak cocok (bukan lempar galat), supaya baris rusak tidak membuat
 * login mustahil.
 */
function matchesHash(password: string, stored: string): Promise<boolean> {
  return new Promise((resolve) => {
    const bagian = stored.split("$");
    if (bagian.length !== 6 || bagian[0] !== "scrypt") return resolve(false);
    const [, n, r, p, saltEncoded, hashEncoded] = bagian;
    const salt = Buffer.from(saltEncoded, "base64url");
    const expected = Buffer.from(hashEncoded, "base64url");
    if (salt.length === 0 || expected.length === 0) return resolve(false);

    scrypt(password, salt, expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: SCRYPT_OPTIONS.maxmem,
    }, (error, derived) => {
      if (error || derived.length !== expected.length) resolve(false);
      else resolve(timingSafeEqual(derived, expected));
    });
  });
}

function parseRecord(value: unknown): StoredRecord | null {
  const row = value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
  if (!row) return null;
  const generation = typeof row.generation === "number" && Number.isSafeInteger(row.generation) && row.generation >= 0
    ? row.generation
    : 0;
  const hash = typeof row.hash === "string" && row.hash.length > 0 ? row.hash : null;
  const updatedAt = typeof row.updatedAt === "string" ? row.updatedAt : null;
  return { generation, hash, updatedAt };
}

/** Membaca baris dari basis data; melempar galat bila basis data tidak siap. */
async function readRow(): Promise<StoredRecord | null> {
  const [row] = await db.select().from(cmsSettings).where(eq(cmsSettings.key, ADMIN_PASSWORD_SETTING_KEY)).limit(1);
  return row ? parseRecord(row.value) : null;
}

async function writeRow(record: StoredRecord): Promise<void> {
  await db
    .insert(cmsSettings)
    .values({ key: ADMIN_PASSWORD_SETTING_KEY, value: record })
    .onConflictDoUpdate({ target: cmsSettings.key, set: { value: record, updatedAt: new Date() } });
}

/**
 * Keadaan password saat ini. Bila basis data belum tersambung, hasilnya
 * "belum ada penimpa" supaya password environment tetap berlaku dan pemilik
 * situs tidak terkurung di luar dashboard.
 */
export async function readAdminPasswordState(): Promise<AdminPasswordState> {
  try {
    const record = await readRow();
    if (!record) return BELUM_ADA;
    return {
      generation: record.generation,
      custom: record.hash !== null,
      updatedAt: record.updatedAt,
      readable: true,
    };
  } catch {
    return { ...BELUM_ADA, readable: false };
  }
}

/**
 * Hasil pemeriksaan password terhadap penimpa di basis data:
 * - `"no-custom"` — belum ada password baru, jadi pemanggil memakai environment;
 * - `"match"` / `"mismatch"` — sudah ada password baru, dan inilah hasilnya.
 *
 * Saat basis data bermasalah, hasilnya `"no-custom"` agar login dengan
 * `ADMIN_PASSWORD` tetap bisa dipakai.
 */
export async function checkCustomPassword(candidate: string): Promise<"no-custom" | "match" | "mismatch"> {
  try {
    const record = await readRow();
    if (!record?.hash) return "no-custom";
    return await matchesHash(candidate, record.hash) ? "match" : "mismatch";
  } catch {
    return "no-custom";
  }
}

/**
 * Hash password untuk akun admin tambahan (Task 114). Format dan parameter
 * sama dengan password dashboard utama (`scrypt$N$r$p$salt$hash`) supaya satu
 * jalur verifikasi berlaku untuk semua akun admin.
 */
export function hashAdminPassword(password: string): Promise<string> {
  return hashPassword(password);
}

/** Memeriksa password terhadap hash akun admin tambahan. */
export function verifyAdminPassword(password: string, stored: string): Promise<boolean> {
  return matchesHash(password, stored);
}

/** Menyimpan password baru dan menaikkan nomor versi sesi. */
export async function saveAdminPassword(password: string): Promise<AdminPasswordState> {
  const current = await readRow();
  const hash = await hashPassword(password);
  const record: StoredRecord = {
    generation: (current?.generation ?? 0) + 1,
    hash,
    updatedAt: new Date().toISOString(),
  };
  await writeRow(record);
  return { generation: record.generation, custom: true, updatedAt: record.updatedAt, readable: true };
}

/**
 * Menghapus penimpa sehingga `ADMIN_PASSWORD` dari environment berlaku lagi.
 * Nomor versi tetap dinaikkan supaya sesi lama tidak hidup kembali.
 */
export async function resetAdminPassword(): Promise<AdminPasswordState> {
  const current = await readRow();
  const record: StoredRecord = {
    generation: (current?.generation ?? 0) + 1,
    hash: null,
    updatedAt: new Date().toISOString(),
  };
  await writeRow(record);
  return { generation: record.generation, custom: false, updatedAt: record.updatedAt, readable: true };
}
