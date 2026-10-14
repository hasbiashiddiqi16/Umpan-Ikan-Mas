/**
 * Catatan pengganti bahan.
 *
 * Pengganti sengaja diambil dari **peran yang sama** supaya rasio antar peran
 * tetap di dalam aturan komposisi (lihat `@/lib/blend-rules`). Bahan yang
 * memang tidak punya pengganti seperan ditulis apa adanya — lebih jujur
 * mengatakan "tidak ada" daripada memaksa bahan lain masuk ke peran yang beda.
 */
export type IngredientSubstitute = {
  id: string;
  /** Id bahan pengganti yang seperan (kosong = belum ada pengganti seperan). */
  pengganti: string[];
  catatan: string;
};

export const ingredientSubstitutes: IngredientSubstitute[] = [
  { id: "pelet-ikan", pengganti: ["roti-tawar"], catatan: "Roti tawar lebih ringan dan tidak beraroma pelet; tambahkan bahan aroma supaya tetap menarik, dan kurangi air karena roti sudah lembap." },
  { id: "roti-tawar", pengganti: ["pelet-ikan"], catatan: "Pelet lebih padat dan beraroma kuat; tambah air sedikit demi sedikit agar adonan tidak keras." },
  { id: "tepung-tapioka", pengganti: ["tepung-terigu"], catatan: "Sama-sama pengikat. Terigu membuat adonan sedikit lebih padat, jadi kurangi 1–2 g dan tambah air sedikit." },
  { id: "tepung-terigu", pengganti: ["tepung-tapioka"], catatan: "Sama-sama pengikat. Tapioka membuat adonan lebih kenyal dan lembap; tambahkan bertahap sambil dilihat teksturnya." },
  { id: "telur", pengganti: ["santan"], catatan: "Santan menjaga kelembapan tetapi tidak mengikat sekuat telur; kalau dipakai, tambah 1–2 g pengikat kering." },
  { id: "santan", pengganti: ["telur"], catatan: "Telur mengikat sekaligus melembapkan; adonan jadi lebih lengket, pakai air lebih sedikit." },
  { id: "kroto", pengganti: [], catatan: "Belum ada bahan seperan (Protein) di basis ini. Kalau kroto tidak ada, lewati saja dan perkuat bahan aroma yang sudah dipilih — jangan diganti bahan berperan lain tanpa menghitung ulang rasio." },
  { id: "jagung", pengganti: ["kelapa"], catatan: "Kelapa memberi tekstur lebih kasar dan aroma sangrai, bukan rasa manis; haluskan lebih lama." },
  { id: "kelapa", pengganti: ["jagung"], catatan: "Jagung memberi rasa manis alami dan tekstur lebih halus; tidak perlu disangrai." },
  { id: "susu-bubuk", pengganti: ["keju"], catatan: "Keju sama-sama aroma gurih tetapi jauh lebih kuat; mulai dari separuh takaran lalu cek baunya." },
  { id: "keju", pengganti: ["susu-bubuk"], catatan: "Susu bubuk lebih lembut; pakai takaran penuh lalu sesuaikan dengan aroma yang diinginkan." },
  { id: "pandan", pengganti: ["kelapa"], catatan: "Aroma pandan tidak bisa ditiru persis; kelapa hanya pengganti karakternya. Kalau pandan berupa essen, takar beberapa tetes terpisah dari gram adonan." },
];

export const SUBSTITUTE_NOTE =
  "Pengganti selalu berasal dari peran yang sama supaya rasio antar peran tetap terjaga. Karakternya bisa berbeda, jadi cek tekstur dan aroma setelah dicampur.";

export function catatanPengganti(id: string): string | null {
  return ingredientSubstitutes.find((item) => item.id === id)?.catatan ?? null;
}

/** Daftar pengganti yang dicatat untuk satu bahan (bisa kosong). */
export function penggantiTercatat(id: string): string[] {
  return ingredientSubstitutes.find((item) => item.id === id)?.pengganti ?? [];
}
