import { PromoModal } from "@/components/promo-modal";
import { provinces } from "@/data/provinces";
import { recipes } from "@/data/recipes";
import { reviews } from "@/data/reviews";

/**
 * Angka sambutan dihitung dari data aplikasi, jadi selalu ikut jumlah katalog,
 * ulasan, dan provinsi terbaru tanpa perlu diperbarui manual.
 */
export function PromoModalHost() {
  return (
    <PromoModal
      facts={{
        recipeCount: recipes.length,
        reviewCount: reviews.length,
        provinceCount: provinces.length,
      }}
    />
  );
}
