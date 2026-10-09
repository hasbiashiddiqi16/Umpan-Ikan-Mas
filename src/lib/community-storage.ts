import type { RecipeReview } from "@/data/reviews";

export const COMMUNITY_REVIEWS_KEY = "umpan-mas-community-reviews-v1";
export const COMMUNITY_REVIEWS_EVENT = "umpan:community-reviews-change";

export type MemberReview = RecipeReview & {
  id: string;
  createdAt: string;
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

export function saveCommunityReview(review: NewMemberReview): MemberReview {
  const createdAt = new Date().toISOString();
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `review-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
  const saved: MemberReview = { ...review, id, createdAt };
  const next = [saved, ...readCommunityReviews()];
  try {
    window.localStorage.setItem(COMMUNITY_REVIEWS_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(COMMUNITY_REVIEWS_EVENT, { detail: next }));
    return saved;
  } catch {
    throw new Error("Penyimpanan browser penuh atau tidak tersedia.");
  }
}
