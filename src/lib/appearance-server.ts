import "server-only";
import { cache } from "react";
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
  recipePhotoKeyFromUrl,
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
 * bawaan dipakai supaya situs tetap tampil utuh. Dibungkus `cache` React
 * agar satu render yang memakai beberapa aset tampilan (logo, hero, footer)
 * hanya membaca basis data sekali.
 */
export const readAppearance = cache(async (): Promise<AppearanceState> => {
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
});

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
 * Menyimpan satu foto racikan baru dengan kunci berversi. Berbeda dengan
 * perilaku lama, foto lain milik resep yang sama **tidak** dihapus: satu
 * resep kini dapat memiliki galeri beberapa foto, dan alamat berversi
 * membuat cache pengoptimal gambar/CDN selalu menyajikan berkas yang benar.
 */
export async function addRecipePhoto(slug: string, mimeType: string, bytes: Buffer): Promise<string> {
  const version = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const key = versionedRecipePhotoKey(slug, version);
  await saveMediaFile(key, mimeType, bytes);
  return key;
}

/**
 * Menghapus berkas foto racikan yang tidak lagi dirujuk daftar foto resep:
 * kunci yang disebut `extraUrls` (mis. daftar lama sebelum slug berubah)
 * dan kunci berawalan slug resep yang tidak ada di `keepUrls`. Dipakai
 * setelah resep disimpan/dihapus agar tabel media tidak menumpuk foto
 * yatim. Kegagalan pembersihan tidak menggagalkan penyimpanan resep.
 */
export async function cleanupRecipePhotos(slugs: string[], keepUrls: string[], extraUrls: string[] = []): Promise<void> {
  try {
    const keepKeys = new Set(keepUrls.map((url) => recipePhotoKeyFromUrl(url)).filter((key): key is string => Boolean(key)));
    const hapus = new Set<string>();
    for (const url of extraUrls) {
      const key = recipePhotoKeyFromUrl(url);
      if (key && !keepKeys.has(key)) hapus.add(key);
    }
    for (const slug of [...new Set(slugs.filter(Boolean))]) {
      const rows = await db.select({ key: cmsMedia.key }).from(cmsMedia).where(like(cmsMedia.key, `${recipePhotoKey(slug)}%`));
      for (const row of rows) {
        if (isRecipePhotoKeyForSlug(row.key, slug) && !keepKeys.has(row.key)) hapus.add(row.key);
      }
    }
    if (hapus.size) await db.delete(cmsMedia).where(inArray(cmsMedia.key, [...hapus]));
  } catch {
    // Pembersihan foto bersifat pemeliharaan; abaikan bila gagal.
  }
}

export async function deleteMediaFile(key: string): Promise<void> {
  await db.delete(cmsMedia).where(eq(cmsMedia.key, key));
}
