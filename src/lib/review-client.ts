/**
 * Sisi peramban dari ulasan komunitas.
 *
 * Ulasan disimpan di server (basis data Postgres) supaya bisa dibaca semua
 * pengunjung. Peramban hanya menyimpan dua hal: salinan sementara agar ulasan
 * langsung tampil, dan token perangkat anonim untuk menegakkan aturan "satu
 * ulasan per resep per perangkat per 24 jam" tanpa membuat akun.
 *
 * Konsekuensinya: menghapus data peramban tidak menghapus ulasan yang sudah
 * terkirim — yang hilang hanya salinan lokalnya, dan server tetap memegang
 * versi resminya.
 */

const DEVICE_KEY = "umpan-mas-review-device-v1";

type StoredDevice = { device: string; token: string };

/** Membaca token perangkat yang tersimpan, tanpa memedulikan masa berlakunya. */
function readStoredDevice(): StoredDevice | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DEVICE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const { device, token } = parsed as Partial<StoredDevice>;
    if (typeof device !== "string" || !/^[a-f0-9]{32}$/.test(device)) return null;
    if (typeof token !== "string") return null;
    return { device, token };
  } catch {
    return null;
  }
}

function saveStoredDevice(device: StoredDevice) {
  try {
    window.localStorage.setItem(DEVICE_KEY, JSON.stringify(device));
  } catch {
    // Penyimpanan diblokir: token akan diminta ulang saat dibutuhkan.
  }
}

/** Token perangkat yang masih berlaku, atau null bila belum ada/kedaluwarsa. */
export function readReviewDeviceToken(): string | null {
  const stored = readStoredDevice();
  if (!stored) return null;
  const parts = stored.token.split(".");
  if (parts.length !== 3) return null;
  const expiresAt = Number(parts[1]);
  return Number.isFinite(expiresAt) && expiresAt > Date.now() ? stored.token : null;
}

let inFlight: Promise<string | null> | null = null;

/**
 * Memastikan peramban punya token perangkat bertanda tangan. Token dibuat server
 * (klien tidak bisa mengarangnya), dan id lama dipakai ulang saat token
 * diperbarui agar riwayat 24 jam tetap dihitung.
 */
export function ensureReviewDeviceToken(force = false): Promise<string | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (!force) {
    const current = readReviewDeviceToken();
    if (current) return Promise.resolve(current);
  }
  if (inFlight) return inFlight;
  const previous = readStoredDevice()?.device ?? null;
  inFlight = (async () => {
    try {
      const response = await fetch("/api/public/reviews/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ previous }),
      });
      if (!response.ok) return null;
      const body = (await response.json()) as Partial<StoredDevice>;
      if (typeof body.device !== "string" || typeof body.token !== "string") return null;
      saveStoredDevice({ device: body.device, token: body.token });
      return body.token;
    } catch {
      return null;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

export type ReviewPostResult = {
  ok: boolean;
  id?: number;
  /** Server sudah punya kiriman yang sama (percobaan ulang), tidak digandakan. */
  duplicate?: boolean;
  /** Status moderasi dari server: "approved" langsung tampil, "pending" ditahan untuk ditinjau. */
  status?: string;
  /** Pesan dari server untuk ditampilkan apa adanya. */
  error?: string;
  code?: "review-cooldown" | "device-limit" | "ip-limit" | "turnstile" | "device" | string;
  /** Server tidak terjangkau: ulasan disimpan di perangkat dan dicoba lagi nanti. */
  offline?: boolean;
};

/**
 * Mengirim ulasan ke server, lengkap dengan token perangkat. Bila server menolak
 * karena token tidak dikenali (mis. cookie/penyimpanan pernah dibersihkan),
 * token diminta sekali lagi lalu kiriman diulang.
 */
export async function postReviewToServer(payload: Record<string, unknown>): Promise<ReviewPostResult> {
  const attempt = async (token: string | null) => {
    const response = await fetch("/api/public/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { "x-review-device": token } : {}) },
      body: JSON.stringify(payload),
    });
    let body: Record<string, unknown> = {};
    try {
      body = (await response.json()) as Record<string, unknown>;
    } catch {
      body = {};
    }
    return { response, body };
  };

  try {
    let { response, body } = await attempt(await ensureReviewDeviceToken());
    if (response.status === 400 && body.code === "device") {
      const token = await ensureReviewDeviceToken(true);
      ({ response, body } = await attempt(token));
    }
    if (response.ok) {
      return { ok: true, id: typeof body.id === "number" ? body.id : undefined, duplicate: body.duplicate === true, status: typeof body.status === "string" ? body.status : undefined };
    }
    return {
      ok: false,
      code: typeof body.code === "string" ? body.code : undefined,
      error: typeof body.error === "string" ? body.error : "Ulasan belum bisa dikirim ke server. Coba lagi sebentar lagi.",
    };
  } catch {
    return { ok: false, offline: true, error: "Server belum bisa dihubungi." };
  }
}

/** Header token perangkat untuk permintaan lain (mis. pemeriksaan status moderasi). */
export async function reviewDeviceHeaders(): Promise<Record<string, string>> {
  const token = await ensureReviewDeviceToken();
  return token ? { "x-review-device": token } : {};
}
