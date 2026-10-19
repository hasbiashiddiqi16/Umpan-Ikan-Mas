import "server-only";
import { revalidatePath } from "next/cache";
import { provinceDirectory } from "@/data/province-directory";

/** Slug halaman provinsi dari nama provinsi yang tersimpan di resep. */
function provinceSlugs(names: string[]): string[] {
  return names.flatMap((name) => {
    const found = provinceDirectory.find((provinsi) => provinsi.name === name);
    return found ? [found.slug] : [];
  });
}

/**
 * Membuang cache halaman publik yang menampilkan resep setelah data admin
 * berubah (simpan/sunting/hapus/impor). Halaman-halaman itu memakai ISR
 * satu jam: tanpa revalidasi on-demand ini, perubahan dari dashboard —
 * termasuk ganti foto — baru terlihat sampai satu jam kemudian. Kegagalan
 * revalidasi tidak boleh menggagalkan penyimpanan, jadi ditelan di sini.
 */
export function revalidateRecipePages(slugs: string[], provinceNames: string[] = []): void {
  try {
    for (const slug of new Set(slugs.filter(Boolean))) revalidatePath(`/resep/${slug}`);
    for (const slug of new Set(provinceSlugs(provinceNames))) revalidatePath(`/provinsi/${slug}`);
    for (const path of ["/", "/katalog", "/cuaca", "/komunitas", "/provinsi", "/tanya-umpan", "/pakar-umpan"]) revalidatePath(path);
  } catch {
    // Cache akan tetap segar lewat ISR berkala; penyimpanan tidak gagal.
  }
}
