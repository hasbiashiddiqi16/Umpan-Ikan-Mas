export function slugify(value: string): string {
  return value
    .toLocaleLowerCase("id-ID")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Harga acuan (angka) diturunkan dari label harga: titik tengah rentang
 * pada label — persis pola seluruh resep katalog (mis. label
 * "Rp20.000–25.000" selalu berpasangan dengan harga acuan 22500). Angka
 * ini yang dipakai saringan budget dan urutan "Harga Terendah", jadi
 * admin cukup menulis labelnya; satu angka pada label dipakai apa
 * adanya, dan label tanpa angka memakai bawaan formulir lama (20000).
 */
export function hargaAcuanDariLabel(label: string): number {
  const angka = (label.match(/\d[\d.]*/g) ?? [])
    .map((bagian) => Number(bagian.replace(/\./g, "")))
    .filter((nilai) => Number.isFinite(nilai) && nilai > 0);
  if (angka.length >= 2) return Math.round((angka[0] + angka[1]) / 2);
  if (angka.length === 1) return angka[0];
  return 20000;
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat("id-ID").format(value);
}
