import { permanentRedirect } from "next/navigation";

/**
 * Komunitas kini menjadi tab "Cerita & Ulasan Komunitas" di /katalog.
 * Alamat lama diteruskan permanen (308) agar tautan dan hasil pencarian
 * yang sudah beredar tidak mati.
 */
export default function CommunityPage() {
  permanentRedirect("/katalog?tab=komunitas");
}
