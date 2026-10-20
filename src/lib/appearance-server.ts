import "server-only";
import { eq, inArray, like } from "drizzle-orm";
import { db } from "@/db";
import { cmsMedia, cmsSettings } from "@/db/schema";
import {
  MEDIA_KEYS,
  defaultAppearance,
  getPopupVersion,
  isRecipePhotoKeyForSlug,
  mediaUrl,
  recipePhotoKey,
  versionedRecipePhotoKey,
  resolvePopupSettings,
  type AppearanceState,
  type MediaInfo,
  type MediaKey,
  type PopupSettings,
} from "@/lib/appearance";

/** Kunci baris pengaturan tampilan di tabel `cms_settings`. */
const APPEARANCE_KEY = "appearance";

type MediaRow = { key: string; updatedAt: Date };

function toInfo(key: MediaKey, row?: MediaRow): MediaInfo {
  return {
    key,
    url: mediaUrl(key, row?.updatedAt ?? null),
    custom: Boolean(row),
    updatedAt: row ? row.updatedAt.toISOString() : null,
  };
}

/**
 * Membaca pengaturan tampilan untuk halaman publik. Bila database belum siap
 * atau tabelnya belum ada (mis. saat pratinjau lokal tanpa Postgres), nilai
 * bawaan dipakai supaya situs tetap tampil utuh.
 */
export async function readAppearance(): Promise<AppearanceState> {
  try {
    const [setting] = await db.select().from(cmsSettings).where(eq(cmsSettings.key, APPEARANCE_KEY)).limit(1);
    const media = await db.select({ key: cmsMedia.key, updatedAt: cmsMedia.updatedAt }).from(cmsMedia)
      .where(inArray(cmsMedia.key, [...MEDIA_KEYS]));
    const byKey = new Map(media.map((row) => [row.key, row as MediaRow]));
    const popup = resolvePopupSettings(setting?.value);
    const popupData = {
      ...popup,
      media: {
        mobile: toInfo("popup-mobile", byKey.get("popup-mobile")),
        desktop: toInfo("popup-desktop", byKey.get("popup-desktop")),
        latar: toInfo("popup-latar", byKey.get("popup-latar")),
      },
    };
    return {
      logo: toInfo("logo", byKey.get("logo")),
      footerLogo: toInfo("logo-footer", byKey.get("logo-footer")),
      hero: toInfo("hero", byKey.get("hero")),
      popup: { ...popupData, version: getPopupVersion(popupData) },
    };
  } catch {
    return defaultAppearance();
  }
}

/** Menyimpan pengaturan popup. Melempar error agar API bisa melaporkan kegagalan. */
export async function savePopupSettings(popup: PopupSettings): Promise<PopupSettings> {
  const value = { ...popup } as unknown as Record<string, unknown>;
  await db.insert(cmsSettings)
    .values({ key: APPEARANCE_KEY, value })
    .onConflictDoUpdate({ target: cmsSettings.key, set: { value, updatedAt: new Date() } });
  return popup;
}

export async function readMediaFile(key: string): Promise<{ mimeType: string; bytes: Buffer } | null> {
  const [row] = await db.select().from(cmsMedia).where(eq(cmsMedia.key, key)).limit(1);
  if (!row) return null;
  const bytes = Buffer.from(row.data, "base64");
  if (bytes.length === 0) return null;
  return { mimeType: row.mimeType, bytes };
}

export async function saveMediaFile(key: string, mimeType: string, bytes: Buffer): Promise<Date> {
  const data = bytes.toString("base64");
  const updatedAt = new Date();
  await db.insert(cmsMedia)
    .values({ key, mimeType, data, byteSize: bytes.length, updatedAt })
    .onConflictDoUpdate({ target: cmsMedia.key, set: { mimeType, data, byteSize: bytes.length, updatedAt } });
  return updatedAt;
}

/**
 * Menyimpan foto racikan baru dengan kunci berversi lalu menghapus kunci
 * lama milik resep yang sama: alamat foto publik selalu berubah setiap
 * foto diganti (cache pengoptimal gambar/CDN tidak menyajikan foto lama)
 * dan tabel media tidak menumpuk. Kegagalan membersihkan kunci lama
 * tidak menggagalkan unggahan — kuncinya hanya jadi yatim tak terpakai.
 */
export async function replaceRecipePhoto(slug: string, mimeType: string, bytes: Buffer): Promise<string> {
  const version = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const key = versionedRecipePhotoKey(slug, version);
  await saveMediaFile(key, mimeType, bytes);
  try {
    const rows = await db.select({ key: cmsMedia.key }).from(cmsMedia).where(like(cmsMedia.key, `${recipePhotoKey(slug)}%`));
    const stale = rows.map((row) => row.key).filter((candidate) => candidate !== key && isRecipePhotoKeyForSlug(candidate, slug));
    if (stale.length) await db.delete(cmsMedia).where(inArray(cmsMedia.key, stale));
  } catch {
    // Pembersihan kunci lama bersifat pemeliharaan; abaikan bila gagal.
  }
  return key;
}

export async function deleteMediaFile(key: string): Promise<void> {
  await db.delete(cmsMedia).where(eq(cmsMedia.key, key));
}
