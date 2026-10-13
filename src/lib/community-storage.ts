import type { RecipeReview } from "@/data/reviews";

export const COMMUNITY_REVIEWS_KEY = "umpan-mas-community-reviews-v1";
export const COMMUNITY_REVIEWS_EVENT = "umpan:community-reviews-change";

export type MemberReview = RecipeReview & {
  id: string;
  createdAt: string;
  /**
   * Hasil pengiriman ke server moderasi. `false` berarti gagal terkirim dan
   * ulasan perlu dicoba lagi saat pengunjung membuka halaman resep berikutnya.
   * `undefined` (data lama) tidak diikutkan percobaan ulang agar tidak ganda.
   */
  synced?: boolean;
  /**
   * ID baris ulasan di server. Dipakai untuk memeriksa hasil moderasi: begitu
   * admin menyetujui atau menolak, salinan lokal ini disesuaikan. Kosong untuk
   * ulasan yang dibuat sebelum kolom ini ada atau yang belum pernah terkirim.
   */
  serverId?: number;
};

function isMemberReview(value: unknown): value is MemberReview {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<MemberReview>;
  return typeof item.id === "string" &&
    typeof item.recipeSlug === "string" &&
    typeof item.name === "string" &&
    typeof item.location === "string" &&
    typeof item.rating === "number" && item.rating >= 1 && item.rating <= 5 &&
    typeof item.weather === "string" &&
    typeof item.water === "string" &&
    (item.catchCount === undefined || (typeof item.catchCount === "number" && item.catchCount >= 0)) &&
    (item.serverId === undefined || (typeof item.serverId === "number" && Number.isSafeInteger(item.serverId) && item.serverId > 0)) &&
    (item.synced === undefined || typeof item.synced === "boolean") &&
    typeof item.date === "string" &&
    typeof item.comment === "string" &&
    typeof item.createdAt === "string";
}

export function readCommunityReviews(): MemberReview[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(COMMUNITY_REVIEWS_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isMemberReview).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [];
  }
}

export type NewMemberReview = Omit<MemberReview, "id" | "createdAt">;

function writeReviews(reviews: MemberReview[]): MemberReview[] {
  try {
    window.localStorage.setItem(COMMUNITY_REVIEWS_KEY, JSON.stringify(reviews));
    window.dispatchEvent(new CustomEvent(COMMUNITY_REVIEWS_EVENT, { detail: reviews }));
    return reviews;
  } catch {
    throw new Error("Penyimpanan browser penuh atau tidak tersedia.");
  }
}

/**
 * Mencatat apakah server sudah menerima ulasan, agar bisa dicoba ulang kalau
 * belum. Bersifat best-effort: kalau penyimpanan browser diblokir, kegagalan
 * mencatat penanda tidak boleh menghentikan alur pengguna.
 */
export function markCommunityReviewSync(id: string, synced: boolean, serverId?: number): MemberReview[] {
  if (typeof window === "undefined") return [];
  const next = readCommunityReviews().map((review) => (review.id === id
    ? { ...review, synced, ...(serverId ? { serverId } : {}) }
    : review));
  try {
    return writeReviews(next);
  } catch {
    return next;
  }
}

/** Ulasan yang gagal terkirim ke server dan masih menunggu percobaan ulang. */
export function readUnsyncedReviews(): MemberReview[] {
  return readCommunityReviews().filter((review) => review.synced === false);
}

/**
 * Menghapus salinan lokal berdasarkan ID lokal. Dipakai setelah memeriksa hasil
 * moderasi: ulasan yang ditolak admin — atau yang sudah disetujui dan kini
 * tampil dari server — tidak boleh lagi disimpan di peramban.
 */
export function removeCommunityReviews(ids: string[]): MemberReview[] {
  if (typeof window === "undefined") return [];
  if (!ids.length) return readCommunityReviews();
  const hapus = new Set(ids);
  const next = readCommunityReviews().filter((review) => !hapus.has(review.id));
  try {
    return writeReviews(next);
  } catch {
    return next;
  }
}

export function saveCommunityReview(review: NewMemberReview): MemberReview {
  const createdAt = new Date().toISOString();
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `review-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
  const saved: MemberReview = { ...review, id, createdAt };
  writeReviews([saved, ...readCommunityReviews()]);
  return saved;
}
