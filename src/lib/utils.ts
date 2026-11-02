export function slugify(value: string): string {
  return value
    .toLocaleLowerCase("id-ID")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Pilihan cepat perkiraan biaya bahan pada form resep publik & dashboard. */
export const PILIHAN_BIAYA_CEPAT = [
  { label: "< Rp25rb", value: "< Rp25.000" },
  { label: "Rp25rb–50rb", value: "Rp25.000–50.000" },
  { label: "> Rp50rb", value: "> Rp50.000" },
] as const;

export const BIAYA_BAWAAN_RESEP = "Rp15.000–30.000";

/**
 * Harga acuan (angka) diturunkan dari label harga: titik tengah rentang
 * pada label — persis pola seluruh resep katalog (mis. label
 * "Rp20.000–25.000" selalu berpasangan dengan harga acuan 22500). Angka
 * ini yang dipakai saringan budget dan urutan "Harga Terendah". Label
 * berawalan "<" atau ">" dipetakan ke bawah/atas batasnya agar cocok
 * dengan rentang filter budget, dan label kosong memakai bawaan (20000).
 */
export function hargaAcuanDariLabel(label: string): number {
  const bersih = label.trim();
  const angka = (bersih.match(/\d[\d.]*/g) ?? [])
    .map((bagian) => Number(bagian.replace(/\./g, "")))
    .filter((nilai) => Number.isFinite(nilai) && nilai > 0);
  if (angka.length >= 2) return Math.round((angka[0] + angka[1]) / 2);
  if (angka.length === 1) {
    if (bersih.startsWith("<")) return Math.max(1000, Math.round(angka[0] * 0.75));
    if (bersih.startsWith(">")) return angka[0] + 10000;
    return angka[0];
  }
  return 20000;
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat("id-ID").format(value);
}
