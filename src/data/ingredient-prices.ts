import { provinceDirectory } from "@/data/province-directory";
import { slugify } from "@/lib/utils";

/**
 * Perkiraan harga bahan per wilayah.
 *
 * Harga bahan berbeda-beda antar daerah, jadi tabel ini menyimpan **harga dasar
 * nasional** plus **faktor wilayah** yang bisa diperiksa siapa saja. Semua angka
 * diberi label "perkiraan" di UI — tidak ada klaim harga pasti. Kalau harga di
 * pasar berubah, cukup ubah satu tabel ini (dan `PRICE_UPDATED_AT`).
 */
export const PRICE_UPDATED_AT = "Oktober 2026";
export const PRICE_NOTE =
  "Angka ini perkiraan harga pasar yang dibulatkan ke ratusan rupiah, bukan harga tetap dan bukan janji harga. Harga nyata bergantung kota, toko, dan musim — pakai tabel ini sebagai gambaran.";
export const PRICE_FACTOR_NOTE =
  "Harga dasar berlaku nasional. Faktor wilayah menyesuaikan perkiraan untuk daerah yang biasanya lebih mahal karena distribusi.";

export type Wilayah = "Nasional" | "Jawa" | "Sumatera" | "Kalimantan" | "Sulawesi" | "Bali & Nusa Tenggara" | "Maluku & Papua";

export const WILAYAH: Wilayah[] = ["Nasional", "Jawa", "Sumatera", "Kalimantan", "Sulawesi", "Bali & Nusa Tenggara", "Maluku & Papua"];

/** Faktor pengali harga dasar. 1 = harga dasar nasional. */
export const WILAYAH_FACTOR: Record<Wilayah, number> = {
  Nasional: 1,
  Jawa: 0.96,
  "Bali & Nusa Tenggara": 1.04,
  Sumatera: 1.06,
  Sulawesi: 1.1,
  Kalimantan: 1.12,
  "Maluku & Papua": 1.24,
};

/** Provinsi per wilayah (nama mengikuti `provinceDirectory`). */
export const WILAYAH_PROVINSI: Record<Exclude<Wilayah, "Nasional">, string[]> = {
  Sumatera: ["Aceh", "Sumatera Utara", "Sumatera Barat", "Riau", "Kepulauan Riau", "Jambi", "Sumatera Selatan", "Kepulauan Bangka Belitung", "Bengkulu", "Lampung"],
  Jawa: ["DKI Jakarta", "Jawa Barat", "Banten", "Jawa Tengah", "DI Yogyakarta", "Jawa Timur"],
  "Bali & Nusa Tenggara": ["Bali", "Nusa Tenggara Barat", "Nusa Tenggara Timur"],
  Kalimantan: ["Kalimantan Barat", "Kalimantan Tengah", "Kalimantan Selatan", "Kalimantan Timur", "Kalimantan Utara"],
  Sulawesi: ["Sulawesi Utara", "Gorontalo", "Sulawesi Tengah", "Sulawesi Barat", "Sulawesi Selatan", "Sulawesi Tenggara"],
  "Maluku & Papua": ["Maluku", "Maluku Utara", "Papua", "Papua Barat", "Papua Barat Daya", "Papua Tengah", "Papua Pegunungan", "Papua Selatan"],
};

export type IngredientPriceMode = "gram" | "pakai";

export type IngredientPrice = {
  id: string;
  /** Satuan yang dipakai di tabel harga (per 100 g atau per pemakaian). */
  satuan: string;
  /** Harga dasar nasional dalam rupiah untuk satu `satuan`. */
  hargaDasar: number;
  /** Basis gram untuk mode "gram" (selalu 100 g di tabel ini). */
  basisGram: number | null;
  mode: IngredientPriceMode;
  catatan: string;
};

/**
 * Harga **perkiraan** nasional. Bahan berbentuk cairan/essén diberi mode
 * "pakai" karena takarannya tidak dihitung gram (mis. beberapa tetes essen).
 */
export const ingredientPrices: IngredientPrice[] = [
  { id: "pelet-ikan", satuan: "per 100 g", hargaDasar: 1200, basisGram: 100, mode: "gram", catatan: "Pelet curah sekitar Rp 12.000 per kg." },
  { id: "roti-tawar", satuan: "per 100 g", hargaDasar: 6000, basisGram: 100, mode: "gram", catatan: "Satu bungkus roti tawar (± 250 g) sekitar Rp 15.000." },
  { id: "tepung-tapioka", satuan: "per 100 g", hargaDasar: 1400, basisGram: 100, mode: "gram", catatan: "Tapioka sekitar Rp 14.000 per kg." },
  { id: "tepung-terigu", satuan: "per 100 g", hargaDasar: 1300, basisGram: 100, mode: "gram", catatan: "Terigu sekitar Rp 13.000 per kg." },
  { id: "telur", satuan: "per 100 g", hargaDasar: 5000, basisGram: 100, mode: "gram", catatan: "Sekitar 2 butir telur ayam ras (± 50 g per butir)." },
  { id: "kroto", satuan: "per ons (100 g)", hargaDasar: 12000, basisGram: 100, mode: "gram", catatan: "Harga kroto naik-turun tajam dan di luar Jawa sering lebih mahal." },
  { id: "jagung", satuan: "per 100 g", hargaDasar: 1700, basisGram: 100, mode: "gram", catatan: "Sekitar 2 tongkol kecil jagung manis." },
  { id: "susu-bubuk", satuan: "per 100 g", hargaDasar: 10000, basisGram: 100, mode: "gram", catatan: "Susu bubuk 400 g sekitar Rp 40.000." },
  { id: "keju", satuan: "per 100 g", hargaDasar: 13000, basisGram: 100, mode: "gram", catatan: "Keju cheddar 170 g sekitar Rp 22.000." },
  { id: "pandan", satuan: "per pemakaian", hargaDasar: 500, basisGram: null, mode: "pakai", catatan: "Essen pandan (± Rp 7.000 per botol kecil) cukup untuk puluhan kali pakai. Sebagian pemancing memakai daun pandan." },
  { id: "santan", satuan: "per 100 g", hargaDasar: 6200, basisGram: 100, mode: "gram", catatan: "Santan instan 65 ml sekitar Rp 4.000." },
  { id: "kelapa", satuan: "per 100 g", hargaDasar: 3300, basisGram: 100, mode: "gram", catatan: "Satu butir kelapa (± 300 g parutan) sekitar Rp 10.000." },
];

/** Perkiraan kebutuhan adonan untuk satu sesi mancing, dipakai untuk cek budget. */
export const SESI_GRAM = 250;
export const SESI_NOTE = `Perkiraan kebutuhan adonan satu sesi (± ${SESI_GRAM} g) — sesuaikan dengan kebiasaanmu.`;

const normalise = (value: string) => value.toLocaleLowerCase("id-ID").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

export function wilayahUntukProvinsi(namaProvinsi?: string | null): Wilayah {
  const target = normalise(namaProvinsi ?? "");
  if (!target) return "Nasional";
  const targetSlug = slugify(namaProvinsi ?? "");
  for (const [wilayah, daftar] of Object.entries(WILAYAH_PROVINSI) as Array<[Exclude<Wilayah, "Nasional">, string[]]>) {
    if (daftar.some((nama) => normalise(nama) === target || slugify(nama) === targetSlug)) return wilayah;
  }
  // Nama provinsi yang tidak dikenal (mis. kota saja) tetap dihitung nasional.
  return "Nasional";
}

export function wilayahLabel(wilayah: Wilayah): string {
  return wilayah === "Nasional" ? "Nasional (provinsi belum dipilih)" : `Wilayah ${wilayah}`;
}

export function wilayahFaktor(wilayah: Wilayah): number {
  return WILAYAH_FACTOR[wilayah] ?? 1;
}

export function isProvinceInDirectory(namaProvinsi: string): boolean {
  const target = slugify(namaProvinsi);
  return provinceDirectory.some((province) => slugify(province.name) === target);
}

function bulatkanRupiah(value: number): number {
  return Math.round(value / 100) * 100;
}

export function hargaBahan(id: string, wilayah: Wilayah = "Nasional"): number | null {
  const entry = ingredientPrices.find((item) => item.id === id);
  if (!entry) return null;
  return bulatkanRupiah(entry.hargaDasar * wilayahFaktor(wilayah));
}

/** Harga per gram (null untuk bahan ber-mode "pakai" karena takarannya bukan gram). */
export function hargaPerGram(id: string, wilayah: Wilayah = "Nasional"): number | null {
  const entry = ingredientPrices.find((item) => item.id === id);
  if (!entry || entry.mode !== "gram" || !entry.basisGram) return null;
  const harga = hargaBahan(id, wilayah);
  return harga === null ? null : harga / entry.basisGram;
}

export function formatRupiah(value: number): string {
  return `Rp ${new Intl.NumberFormat("id-ID").format(Math.round(value))}`;
}

export type BlendCostItem = { id: string; gram: number };

export type BlendCostLine = {
  id: string;
  gram: number;
  rupiah: number;
  mode: IngredientPriceMode;
  satuan: string;
};

export type BlendCost = {
  wilayah: Wilayah;
  total: number;
  perBahan: BlendCostLine[];
  catatan: string;
};

/**
 * Menghitung perkiraan biaya bahan dari komposisi (gram per bahan). Bahan
 * ber-mode "pakai" dihitung sekali per pemakaian, bukan per gram, dan bahan
 * yang belum punya harga tidak dihitung — jumlah bahan tanpa harga dilaporkan
 * supaya biayanya tidak terlihat lebih lengkap dari kenyataannya.
 */
export function hitungBiayaCampuran(items: BlendCostItem[], wilayah: Wilayah = "Nasional"): BlendCost {
  const perBahan: BlendCostLine[] = [];
  let total = 0;
  let tanpaHarga = 0;
  for (const item of items) {
    const entry = ingredientPrices.find((price) => price.id === item.id);
    const harga = hargaBahan(item.id, wilayah);
    if (!entry || harga === null) {
      tanpaHarga += 1;
      perBahan.push({ id: item.id, gram: item.gram, rupiah: 0, mode: "pakai", satuan: "belum ada harga" });
      continue;
    }
    const rupiah = entry.mode === "pakai" ? harga : bulatkanRupiah((harga * item.gram) / (entry.basisGram ?? 100));
    total += rupiah;
    perBahan.push({ id: item.id, gram: item.gram, rupiah, mode: entry.mode, satuan: entry.satuan });
  }
  const catatan = tanpaHarga
    ? `Perkiraan harga ${PRICE_UPDATED_AT}. ${tanpaHarga} bahan belum punya harga di tabel, jadi tidak ikut ditotal.`
    : `Perkiraan harga ${PRICE_UPDATED_AT}, dihitung dari komposisi (gram per bahan).`;
  return { wilayah, total, perBahan, catatan };
}

/** Harga tabel yang siap ditampilkan (dipakai UI agar angka bisa diperiksa). */
export function tabelHarga(wilayah: Wilayah): Array<{ id: string; satuan: string; nasional: number; wilayah: number; catatan: string }> {
  return ingredientPrices.map((entry) => ({
    id: entry.id,
    satuan: entry.satuan,
    nasional: entry.hargaDasar,
    wilayah: hargaBahan(entry.id, wilayah) ?? entry.hargaDasar,
    catatan: entry.catatan,
  }));
}
