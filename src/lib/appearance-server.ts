import "server-only";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { cmsMedia, cmsSettings } from "@/db/schema";
import {
  MEDIA_KEYS,
  defaultAppearance,
  mediaUrl,
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
    url: mediaUrl(key),
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
    return {
      logo: toInfo("logo", byKey.get("logo")),
      footerLogo: toInfo("logo-footer", byKey.get("logo-footer")),
      hero: toInfo("hero", byKey.get("hero")),
      popup: {
        ...popup,
        media: {
          mobile: toInfo("popup-mobile", byKey.get("popup-mobile")),
          desktop: toInfo("popup-desktop", byKey.get("popup-desktop")),
          latar: toInfo("popup-latar", byKey.get("popup-latar")),
        },
      },
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

export async function readMediaFile(key: MediaKey): Promise<{ mimeType: string; bytes: Buffer } | null> {
  const [row] = await db.select().from(cmsMedia).where(eq(cmsMedia.key, key)).limit(1);
  if (!row) return null;
  const bytes = Buffer.from(row.data, "base64");
  if (bytes.length === 0) return null;
  return { mimeType: row.mimeType, bytes };
}

export async function saveMediaFile(key: MediaKey, mimeType: string, bytes: Buffer): Promise<void> {
  const data = bytes.toString("base64");
  await db.insert(cmsMedia)
    .values({ key, mimeType, data, byteSize: bytes.length })
    .onConflictDoUpdate({ target: cmsMedia.key, set: { mimeType, data, byteSize: bytes.length, updatedAt: new Date() } });
}

export async function deleteMediaFile(key: MediaKey): Promise<void> {
  await db.delete(cmsMedia).where(eq(cmsMedia.key, key));
}
