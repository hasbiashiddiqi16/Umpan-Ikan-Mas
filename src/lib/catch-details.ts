/**
 * Rincian hasil tangkapan pada ulasan.
 *
 * Angka "8 ekor" saja tidak bisa dibandingkan: 8 ekor dalam 8 jam dengan satu
 * joran jelas berbeda artinya dari 8 ekor dalam 2 jam dengan tiga joran. Karena
 * itu formulir ulasan meminta **durasi sesi** dan **jumlah joran** (keduanya
 * opsional), dan modul ini yang menerjemahkannya menjadi kalimat yang jujur:
 *
 * - Tidak ada durasi/joran → hanya angkanya, **tanpa** laju yang dikarang.
 * - Ada durasi → laju per jam dihitung dari angka nyata (bukan taksiran).
 */
export type CatchDetails = {
  catchCount?: number | null;
  /** Durasi sesi dalam menit (0,5–24 jam). */
  sessionMinutes?: number | null;
  /** Jumlah joran yang dipakai (1–10). */
  rodCount?: number | null;
};

/** Batas isian yang diterima server formulir (dipakai juga oleh validasi API). */
export const SESSION_MIN_MINUTES = 30;
export const SESSION_MAX_MINUTES = 1440;
export const ROD_MIN = 1;
export const ROD_MAX = 10;

const angka = (value: number, desimal = 1) => value.toLocaleString("id-ID", { maximumFractionDigits: desimal });

/** "45 menit", "2 jam", "1,5 jam" — tidak pernah membulatkan ke atas. */
export function formatSessionDuration(minutes: number): string {
  if (minutes < 60) return `${angka(minutes, 0)} menit`;
  const jam = minutes / 60;
  return `${angka(jam, Number.isInteger(jam) ? 0 : 1)} jam`;
}

/** Apakah ulasan ini punya angka tangkapan yang bisa dibandingkan? */
export function hasComparableCatch(details: CatchDetails): boolean {
  return typeof details.catchCount === "number" && typeof details.sessionMinutes === "number" && details.sessionMinutes > 0;
}

/** Laju tangkapan per jam. `null` kalau durasinya tidak diisi — tidak ditebak. */
export function catchPerHour(details: CatchDetails): number | null {
  if (!hasComparableCatch(details)) return null;
  return (details.catchCount as number) / ((details.sessionMinutes as number) / 60);
}

/**
 * Laju tangkapan per jam **per joran**. Hanya dihitung kalau jumlah joran juga
 * diisi, karena membagi dengan satu joran tanpa keterangan sama saja menebak.
 */
export function catchPerRodHour(details: CatchDetails): number | null {
  const perJam = catchPerHour(details);
  if (perJam === null || typeof details.rodCount !== "number" || details.rodCount < 1) return null;
  return perJam / details.rodCount;
}

/**
 * Rangkaian keterangan untuk ditampilkan (tanpa emoji, dipisah " · ").
 * Contoh: "8 ekor · 2 jam · 2 joran · 4 ekor/jam".
 */
export function describeCatchSummary(details: CatchDetails): string {
  const bagian: string[] = [];
  if (typeof details.catchCount === "number") bagian.push(`${angka(details.catchCount, 0)} ekor`);
  if (typeof details.sessionMinutes === "number") bagian.push(formatSessionDuration(details.sessionMinutes));
  if (typeof details.rodCount === "number") bagian.push(`${angka(details.rodCount, 0)} joran`);
  const laju = catchPerHour(details);
  if (laju !== null) bagian.push(`${angka(laju)} ekor/jam`);
  return bagian.join(" · ");
}

/**
 * Daftar badge siap tampil untuk kartu ulasan/laporan. Setiap badge hanya
 * muncul kalau datanya benar-benar ada — tidak ada durasi atau joran yang
 * dikarang, dan laju per jam hanya muncul kalau durasinya diisi.
 */
/** Kunci ikon SVG untuk badge tangkapan; dipetakan ke Lucide di komponen. */
export type CatchBadgeIcon = "ikan" | "durasi" | "joran" | "laju";

export function catchBadges(details: CatchDetails): { icon: CatchBadgeIcon; label: string }[] {
  const badges: { icon: CatchBadgeIcon; label: string }[] = [];
  if (typeof details.catchCount === "number") badges.push({ icon: "ikan", label: `${angka(details.catchCount, 0)} ekor` });
  if (typeof details.sessionMinutes === "number") badges.push({ icon: "durasi", label: formatSessionDuration(details.sessionMinutes) });
  if (typeof details.rodCount === "number") badges.push({ icon: "joran", label: `${angka(details.rodCount, 0)} joran` });
  const laju = catchPerHour(details);
  if (laju !== null) badges.push({ icon: "laju", label: `${angka(laju)} ekor/jam` });
  return badges;
}

/** Kalimat penjelas singkat untuk formulir ulasan dan halaman resep. */
export const CATCH_DETAILS_HINT =
  "Durasi sesi dan jumlah joran membuat angka tangkapan bisa dibandingkan: 8 ekor dalam 8 jam tidak sama artinya dengan 8 ekor dalam 2 jam.";
