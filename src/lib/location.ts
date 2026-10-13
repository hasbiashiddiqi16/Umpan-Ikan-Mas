import { accuracyToKilometers, matchProvinceAndCity } from "@/lib/geo";

export const LOCATION_CONSENT_KEY = "umpan-mas-location-consent";
export const LOCATION_PLACE_KEY = "umpan-mas-location-place-v1";
export const LOCATION_EVENT = "umpan:location-change";

/** "granted" = pengguna mengizinkan; "denied" = belum/tidak mengizinkan (form dibiarkan kosong). */
export type LocationConsent = "granted" | "denied";

export type DetectedPlace = {
  province: string;
  city: string | null;
  latitude: number;
  longitude: number;
  accuracyKm: number | null;
  /** Kota referensi terdekat sebelum radius kota diterapkan. */
  referenceCity: string;
  distanceKm: number;
  detectedAt: string;
};

export type LocationState = {
  consent: LocationConsent | null;
  place: DetectedPlace | null;
};

export type LocationFailureReason = "unsupported" | "insecure" | "blocked" | "denied" | "timeout" | "unavailable";

// Nilai konstan GeolocationPositionError; dibandingkan sebagai angka agar tetap
// benar di browser yang tidak mengekspos konstanta pada objek error.
const PERMISSION_DENIED_CODE = 1;
const TIMEOUT_CODE = 3;

export type LocationDetectionResult =
  | { ok: true; place: DetectedPlace }
  | { ok: false; reason: LocationFailureReason; message: string };

export const LOCATION_MESSAGES: Record<LocationFailureReason, string> = {
  unsupported: "Perangkat atau browser ini tidak mendukung deteksi lokasi. Isi provinsi secara manual, ya.",
  insecure: "Deteksi lokasi hanya aktif di koneksi aman (HTTPS). Isi lokasi secara manual dulu.",
  blocked: "Deteksi lokasi dibatasi oleh pengaturan halaman ini. Buka UMPAN MAS di tab baru, atau isi provinsi secara manual.",
  denied: "Izin lokasi tidak diberikan. Form dibiarkan kosong dan bisa kamu isi manual kapan saja.",
  timeout: "Deteksi lokasi memakan waktu terlalu lama. Coba lagi atau isi lokasi manual.",
  unavailable: "Lokasi belum bisa dibaca dari perangkat ini. Coba lagi sebentar lagi atau isi manual.",
};

export function isGeolocationSupported(): boolean {
  if (typeof window === "undefined") return false;
  if (window.isSecureContext === false) return false;
  return typeof navigator !== "undefined" && "geolocation" in navigator;
}

type FeaturePolicyDocument = Document & {
  permissionsPolicy?: { allowsFeature?: (feature: string) => boolean };
  featurePolicy?: { allowsFeature?: (feature: string) => boolean };
};

/**
 * Halaman tersemat (iframe) atau header Permissions-Policy dapat memblokir
 * geolocation. Kondisi ini terlihat seperti penolakan izin, jadi diperiksa lebih
 * dulu agar pengguna mendapat pesan yang tepat.
 */
export function isGeolocationBlockedByPolicy(): boolean {
  if (typeof document === "undefined") return false;
  const policyDocument = document as FeaturePolicyDocument;
  for (const policy of [policyDocument.permissionsPolicy, policyDocument.featurePolicy]) {
    if (policy && typeof policy.allowsFeature === "function") {
      try {
        return !policy.allowsFeature("geolocation");
      } catch {
        return false;
      }
    }
  }
  return false;
}

function readJson(key: string): unknown {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as unknown) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function removeKey(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Penyimpanan bisa tidak tersedia (mode privat); abaikan.
  }
}

function isDetectedPlace(value: unknown): value is DetectedPlace {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<DetectedPlace>;
  return typeof item.province === "string" && item.province.length > 0 &&
    (item.city === null || typeof item.city === "string") &&
    typeof item.latitude === "number" && typeof item.longitude === "number" &&
    (item.accuracyKm === null || typeof item.accuracyKm === "number") &&
    typeof item.referenceCity === "string" &&
    typeof item.distanceKm === "number" &&
    typeof item.detectedAt === "string";
}

export function readLocationState(): LocationState {
  const consentValue = readJson(LOCATION_CONSENT_KEY);
  const consent: LocationConsent | null = consentValue === "granted" || consentValue === "denied" ? consentValue : null;
  const placeValue = readJson(LOCATION_PLACE_KEY);
  const place = isDetectedPlace(placeValue) ? placeValue : null;
  return { consent, place: consent === "granted" ? place : null };
}

const SERVER_LOCATION_STATE: LocationState = { consent: null, place: null };
let locationSnapshot: LocationState | null = null;

/** Snapshot stabil untuk useSyncExternalStore (objek harus sama bila data tidak berubah). */
export function getLocationSnapshot(): LocationState {
  if (!locationSnapshot) locationSnapshot = readLocationState();
  return locationSnapshot;
}

export function getServerLocationSnapshot(): LocationState {
  return SERVER_LOCATION_STATE;
}

function invalidateLocationSnapshot(): void {
  locationSnapshot = null;
}

export function subscribeLocation(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const handleChange = () => {
    invalidateLocationSnapshot();
    listener();
  };
  const handleStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === LOCATION_CONSENT_KEY || event.key === LOCATION_PLACE_KEY) handleChange();
  };
  window.addEventListener(LOCATION_EVENT, handleChange);
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener(LOCATION_EVENT, handleChange);
    window.removeEventListener("storage", handleStorage);
  };
}

function notifyLocationChange(): void {
  if (typeof window === "undefined") return;
  invalidateLocationSnapshot();
  window.dispatchEvent(new CustomEvent(LOCATION_EVENT));
}

export function saveGrantedPlace(place: DetectedPlace): void {
  writeJson(LOCATION_CONSENT_KEY, "granted");
  writeJson(LOCATION_PLACE_KEY, place);
  notifyLocationChange();
}

export function saveLocationDenied(): void {
  writeJson(LOCATION_CONSENT_KEY, "denied");
  removeKey(LOCATION_PLACE_KEY);
  notifyLocationChange();
}

export function forgetLocation(): void {
  removeKey(LOCATION_CONSENT_KEY);
  removeKey(LOCATION_PLACE_KEY);
  notifyLocationChange();
}

/** Ringkasan lokasi untuk ditampilkan ke pengguna, mis. "Bogor, Jawa Barat". */
export function describePlace(place: DetectedPlace | null | undefined): string {
  if (!place) return "";
  return place.city ? `${place.city}, ${place.province}` : place.province;
}

/** Akurasi di atas ambang ini masih ditampilkan, tetapi dengan catatan "perkiraan". */
export function isCoarseAccuracy(place: DetectedPlace | null | undefined, thresholdKm = 75): boolean {
  return Boolean(place && place.accuracyKm !== null && place.accuracyKm >= thresholdKm);
}

export type BrowserPermissionState = "granted" | "denied" | "prompt" | "unknown";

/**
 * Membaca status izin browser tanpa memicu prompt. Browser yang tidak mendukung
 * Permissions API (sebagian Firefox/Safari lama) mengembalikan "unknown".
 */
export async function readBrowserPermission(): Promise<BrowserPermissionState> {
  if (typeof navigator === "undefined" || !navigator.permissions?.query) return "unknown";
  try {
    const status = await navigator.permissions.query({ name: "geolocation" as PermissionName });
    return status.state === "granted" || status.state === "denied" || status.state === "prompt" ? status.state : "unknown";
  } catch {
    return "unknown";
  }
}

export function detectPlace(): Promise<LocationDetectionResult> {
  if (!isGeolocationSupported()) {
    const insecure = typeof window !== "undefined" && window.isSecureContext === false;
    const reason: LocationFailureReason = insecure ? "insecure" : "unsupported";
    return Promise.resolve({ ok: false, reason, message: LOCATION_MESSAGES[reason] });
  }
  if (isGeolocationBlockedByPolicy()) {
    return Promise.resolve({ ok: false, reason: "blocked", message: LOCATION_MESSAGES.blocked });
  }

  return new Promise<LocationDetectionResult>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const match = matchProvinceAndCity(latitude, longitude);
        if (!match) {
          resolve({ ok: false, reason: "unavailable", message: LOCATION_MESSAGES.unavailable });
          return;
        }
        const accuracyKm = accuracyToKilometers(accuracy);
        // Bila akurasi GPS lebih lebar dari radius kota, nama kota tidak diklaim.
        const city = accuracyKm !== null && accuracyKm > match.cityRadiusKm ? null : match.city;
        resolve({
          ok: true,
          place: {
            province: match.province,
            city,
            latitude: Math.round(latitude * 1000) / 1000,
            longitude: Math.round(longitude * 1000) / 1000,
            accuracyKm,
            referenceCity: match.referenceCity,
            distanceKm: match.distanceKm,
            detectedAt: new Date().toISOString(),
          },
        });
      },
      (error) => {
        const reason: LocationFailureReason =
          error.code === PERMISSION_DENIED_CODE ? "denied" : error.code === TIMEOUT_CODE ? "timeout" : "unavailable";
        resolve({ ok: false, reason, message: LOCATION_MESSAGES[reason] });
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 5 * 60 * 1000 },
    );
  });
}

/** Pesan sukses yang konsisten dipakai banner dan tombol lokasi. */
export function successMessageFor(place: DetectedPlace): string {
  if (isCoarseAccuracy(place)) return `Perkiraan lokasi: ${place.province} (±${place.accuracyKm} km). Cek lagi bila terasa kurang tepat.`;
  if (place.city) return `Lokasi terdeteksi: ${place.city}, ${place.province}. Form menyesuaikan lokasimu.`;
  return `Lokasi terdeteksi: ${place.province}. Form menyesuaikan lokasimu.`;
}
