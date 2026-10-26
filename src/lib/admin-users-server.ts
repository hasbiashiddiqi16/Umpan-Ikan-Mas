import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { adminUsers } from "@/db/schema";
import { hashAdminPassword, verifyAdminPassword } from "@/lib/admin-password-server";
import { validateNewPassword } from "@/lib/admin-password";
import {
  PRIMARY_ADMIN_USERNAME,
  isAdminRole,
  type AdminRole,
} from "@/lib/admin-roles";

/**
 * Pengelolaan akun admin tambahan (Task 114).
 *
 * Akun-akun ini khusus untuk dashboard: username + password sendiri dan peran
 * siap pakai. Admin utama dari environment tidak disimpan di tabel ini, tidak
 * bisa dibuat/dihapus/dinonaktifkan dari sini, dan tetap menjadi cadangan
 * tertinggi bila basis data bermasalah.
 */

export type AdminUserPublic = {
  id: string;
  username: string;
  name: string;
  role: AdminRole;
  active: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

type AdminUserRow = typeof adminUsers.$inferSelect;

const USERNAME_PATTERN = /^[a-z0-9._-]{3,32}$/;

function toPublic(row: AdminUserRow): AdminUserPublic {
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    role: row.role,
    active: row.active,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Normalisasi username: huruf kecil, tanpa spasi di tepi. */
export function normalizeAdminUsername(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const username = value.trim().toLowerCase();
  return USERNAME_PATTERN.test(username) ? username : null;
}

function readName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim().replace(/\s+/g, " ");
  return name.length >= 1 && name.length <= 80 ? name : null;
}

export async function listAdminUsers(): Promise<AdminUserPublic[]> {
  const rows = await db.select().from(adminUsers).orderBy(asc(adminUsers.createdAt));
  return rows.map(toPublic);
}

async function findByUsername(username: string): Promise<AdminUserRow | null> {
  const [row] = await db.select().from(adminUsers).where(eq(adminUsers.username, username)).limit(1);
  return row ?? null;
}

async function findById(id: string): Promise<AdminUserRow | null> {
  const [row] = await db.select().from(adminUsers).where(eq(adminUsers.id, id)).limit(1);
  return row ?? null;
}

/**
 * Pemeriksaan login akun tambahan. Mengembalikan baris akun bila username ada,
 * aktif, dan password cocok; selain itu `null` (pesan galat dibuat umum oleh
 * pemanggil agar tidak membocorkan username mana yang terdaftar).
 */
export async function findAdminUserForLogin(
  username: string,
  password: string,
): Promise<AdminUserRow | null> {
  try {
    const row = await findByUsername(username);
    if (!row || !row.active) return null;
    return (await verifyAdminPassword(password, row.passwordHash)) ? row : null;
  } catch {
    return null;
  }
}

/**
 * Keadaan sesi akun tambahan saat ini. Dipakai verifikasi sesi: sesi hanya
 * sah bila akun masih ada, masih aktif, dan versi sesinya belum naik.
 */
export async function readAdminUserSessionState(
  username: string,
): Promise<{ role: AdminRole; sessionVersion: number } | null> {
  try {
    const row = await findByUsername(username);
    if (!row || !row.active) return null;
    return { role: row.role, sessionVersion: row.sessionVersion };
  } catch {
    return null;
  }
}

export async function createAdminUser(
  input: { username: unknown; name: unknown; password: unknown; role: unknown },
  createdBy: string,
): Promise<{ user?: AdminUserPublic; error?: string }> {
  const username = normalizeAdminUsername(input.username);
  if (!username) {
    return { error: "Username harus 3–32 karakter: huruf kecil, angka, titik, strip, atau garis bawah." };
  }
  if (username === PRIMARY_ADMIN_USERNAME) {
    return { error: `Username "${PRIMARY_ADMIN_USERNAME}" dicadangkan untuk admin utama.` };
  }
  const name = readName(input.name);
  if (!name) return { error: "Nama wajib diisi (maksimal 80 karakter)." };
  if (!isAdminRole(input.role)) return { error: "Peran tidak dikenal." };
  const password = validateNewPassword(input.password);
  if (!password.value) return { error: password.error ?? "Password tidak memenuhi syarat." };

  if (await findByUsername(username)) {
    return { error: "Username tersebut sudah dipakai admin lain." };
  }

  const [row] = await db
    .insert(adminUsers)
    .values({
      username,
      name,
      role: input.role,
      passwordHash: await hashAdminPassword(password.value),
      createdBy,
    })
    .returning();
  return { user: toPublic(row) };
}

export async function updateAdminUser(
  id: string,
  patch: { name?: unknown; role?: unknown; active?: unknown; password?: unknown },
  actorUsername: string,
): Promise<{ user?: AdminUserPublic; error?: string }> {
  const row = await findById(id);
  if (!row) return { error: "Akun admin tidak ditemukan." };

  const updates: Partial<AdminUserRow> = { updatedAt: new Date() };
  // Setiap perubahan keamanan menaikkan versi sesi: sesi lama akun langsung
  // gugur, termasuk bila hanya password atau perannya yang diganti.
  let bumpSession = false;

  if (patch.name !== undefined) {
    const name = readName(patch.name);
    if (!name) return { error: "Nama wajib diisi (maksimal 80 karakter)." };
    updates.name = name;
  }
  if (patch.role !== undefined) {
    if (!isAdminRole(patch.role)) return { error: "Peran tidak dikenal." };
    if (patch.role !== row.role) bumpSession = true;
    updates.role = patch.role;
  }
  if (patch.active !== undefined) {
    if (typeof patch.active !== "boolean") return { error: "Status aktif tidak valid." };
    if (patch.active !== row.active) bumpSession = true;
    updates.active = patch.active;
  }
  if (patch.password !== undefined) {
    const password = validateNewPassword(patch.password);
    if (!password.value) return { error: password.error ?? "Password tidak memenuhi syarat." };
    updates.passwordHash = await hashAdminPassword(password.value);
    bumpSession = true;
  }

  // Admin tidak boleh mengunci dirinya sendiri dari dashboard.
  const isSelf = row.username === actorUsername;
  if (isSelf && (updates.active === false || (updates.role !== undefined && updates.role !== "pemilik"))) {
    return { error: "Anda tidak dapat menonaktifkan atau menurunkan peran akun Anda sendiri." };
  }

  if (bumpSession) updates.sessionVersion = row.sessionVersion + 1;

  const [updated] = await db
    .update(adminUsers)
    .set(updates)
    .where(eq(adminUsers.id, id))
    .returning();
  return { user: toPublic(updated) };
}

export async function deleteAdminUser(
  id: string,
  actorUsername: string,
): Promise<{ error?: string }> {
  const row = await findById(id);
  if (!row) return { error: "Akun admin tidak ditemukan." };
  if (row.username === actorUsername) {
    return { error: "Anda tidak dapat menghapus akun Anda sendiri." };
  }
  await db.delete(adminUsers).where(eq(adminUsers.id, id));
  return {};
}
