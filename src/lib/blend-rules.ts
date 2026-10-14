import { ingredientKnowledge, type IngredientKnowledge, type IngredientRole } from "@/data/ingredient-knowledge";
import { SESI_GRAM, formatRupiah, hargaBahan, hargaPerGram, hitungBiayaCampuran, type BlendCost, type Wilayah } from "@/data/ingredient-prices";
import { SUBSTITUTE_NOTE, catatanPengganti, penggantiTercatat } from "@/data/ingredient-substitutes";

/**
 * Aturan komposisi racikan umpan.
 *
 * Sebelumnya komposisi hanya "jumlahkan persentase sesuai bobot bahan", tanpa
 * pembatas apa pun: empat bahan aroma bisa menghabiskan separuh adonan tanpa
 * ada peringatan. Sekarang setiap **peran** punya rentang min–maks yang
 * diperiksa sistem, hasil dibagi ulang agar berada di dalam rentang itu bila
 * memungkinkan, dan pelanggaran yang tersisa dilaporkan sebagai peringatan
 * beserta saran bahannya.
 */

export const BLEND_BASIS_GRAM = 100;
export const MIN_BLEND_INGREDIENTS = 2;
export const MAX_BLEND_INGREDIENTS = 6;
/** Satu bahan yang porsinya di bawah ini tidak akan berpengaruh nyata di adonan. */
export const MIN_INGREDIENT_PERCENT = 4;

export type RoleRule = {
  role: IngredientRole;
  minPercent: number;
  maxPercent: number;
  alasan: string;
};

/**
 * Rentang rasio per peran (persen dari adonan kering 100 g). Angka ini titik
 * awal yang bisa diperiksa — bukan angka baku hasil penelitian, dan sengaja
 * ditulis apa adanya sebagai bahan diskusi.
 */
export const BLEND_ROLE_RULES: RoleRule[] = [
  { role: "Dasar", minPercent: 40, maxPercent: 60, alasan: "Fondasi adonan harus jadi porsi terbesar: di bawah 40% adonan mudah lepas, di atas 60% pengikat dan aroma tidak kebagian tempat." },
  { role: "Pengikat", minPercent: 10, maxPercent: 25, alasan: "Cukup untuk menyatukan adonan, tetapi tidak sampai keras seperti karet." },
  { role: "Protein", minPercent: 5, maxPercent: 20, alasan: "Tambahan berprotein sebagai daya tarik; berlebihan membuat adonan sulit dipulung." },
  { role: "Aroma", minPercent: 5, maxPercent: 25, alasan: "Aroma bekerja sebagai penanda; kalau dominan, karakter bahan dasar justru tertutup." },
  { role: "Pelembap", minPercent: 5, maxPercent: 20, alasan: "Menjaga adonan tidak kering; kelebihan cairan membuat adonan lepas dari kail." },
];

export const BLEND_RULES_SUMMARY =
  "Rentang per peran dipakai sistem untuk membagi ulang porsi, dan kalau tetap tidak bisa dipenuhi (mis. bahan dasarnya tidak dipilih) pelanggarannya dilaporkan sebagai peringatan. Angka ini titik awal yang bisa disesuaikan, bukan formula baku.";

export const BLEND_LIMITS_SUMMARY = `Pilih ${MIN_BLEND_INGREDIENTS}–${MAX_BLEND_INGREDIENTS} bahan dari ${ingredientKnowledge.length} bahan yang tersedia, dikelompokkan per peran. Hasil selalu dihitung untuk contoh adonan ${BLEND_BASIS_GRAM} g.`;

export function ruleForRole(role: IngredientRole): RoleRule | undefined {
  return BLEND_ROLE_RULES.find((rule) => rule.role === role);
}

export function ruleRangeLabel(rule: RoleRule): string {
  return `${rule.minPercent}–${rule.maxPercent}%`;
}

export type RoleShareStatus = "sesuai" | "kurang" | "lebih" | "tidak-dipakai";

export type RoleShare = {
  role: IngredientRole;
  percent: number;
  min: number;
  max: number;
  jumlahBahan: number;
  status: RoleShareStatus;
};

export type BlendSuggestion = {
  jenis: "pengganti" | "hemat" | "aturan";
  judul: string;
  detail: string;
  /** Id bahan yang ditawarkan (klik untuk memakainya). */
  penggantiIds: string[];
  /** Bahan yang digantikan (kosong = saran ini menambah bahan baru). */
  untukId?: string;
};

export type BlendItem = IngredientKnowledge & { percent: number; grams: number; rupiah: number };

export type BlendHemat = {
  ids: string[];
  total100g: number;
  totalSesi: number;
  selisih100g: number;
  selisihSesi: number;
};

export type BlendBalance = {
  items: BlendItem[];
  roleShares: RoleShare[];
  warnings: string[];
  suggestions: BlendSuggestion[];
  cost100g: BlendCost;
  costSesi: BlendCost;
  hemat: BlendHemat | null;
  basisGram: number;
  sesiGram: number;
  substituteNote: string;
};

export function namaBahan(id: string): string {
  return ingredientKnowledge.find((item) => item.id === id)?.name ?? id;
}

/** Bagi ulang proporsi agar totalnya `target` dan tiap nilai ada di [min, max]. */
function bagiProporsi(target: number, mentah: number[], mins: number[], maxs: number[]): number[] {
  const hasil = mentah.slice();
  for (let iterasi = 0; iterasi < 80; iterasi += 1) {
    let total = 0;
    for (let i = 0; i < hasil.length; i += 1) {
      hasil[i] = Math.min(maxs[i], Math.max(mins[i], hasil[i]));
      total += hasil[i];
    }
    const selisih = target - total;
    if (Math.abs(selisih) < 1e-9) break;
    const ruang = hasil.map((nilai, i) => Math.max(0, selisih > 0 ? maxs[i] - nilai : nilai - mins[i]));
    const tersedia = ruang.reduce((jumlah, nilai) => jumlah + nilai, 0);
    if (tersedia < 1e-12) break;
    const langkah = Math.min(Math.abs(selisih), tersedia) * Math.sign(selisih);
    for (let i = 0; i < hasil.length; i += 1) {
      if (ruang[i] > 0) hasil[i] += langkah * (ruang[i] / tersedia);
    }
  }
  return hasil;
}

/** Bulatkan ke bilangan bulat dengan jumlah tepat `target` (sisa terbesar dulu). */
function bulatkanKeTarget(nilai: number[], target: number): number[] {
  const hasil = nilai.map((item) => Math.max(0, Math.floor(item)));
  let sisa = target - hasil.reduce((jumlah, item) => jumlah + item, 0);
  const urutan = nilai.map((item, index) => ({ index, rem: item - Math.floor(item) })).sort((a, b) => b.rem - a.rem);
  let pointer = 0;
  while (sisa > 0 && urutan.length) {
    hasil[urutan[pointer % urutan.length].index] += 1;
    sisa -= 1;
    pointer += 1;
  }
  return hasil;
}

/** Perbaiki pembulatan yang membuat porsi keluar dari rentang (toleransi 0). */
function rapikanBatas(nilai: number[], mins: number[], maxs: number[]): number[] {
  const hasil = nilai.slice();
  for (let iterasi = 0; iterasi < 40; iterasi += 1) {
    let adaPerubahan = false;
    for (let i = 0; i < hasil.length; i += 1) {
      if (hasil[i] < mins[i]) {
        const donor = hasil.map((nilaiLain, j) => ({ j, ruang: nilaiLain - Math.max(mins[j], 0) })).filter((item) => item.j !== i && item.ruang > 0).sort((a, b) => b.ruang - a.ruang)[0];
        if (donor) {
          hasil[i] += 1;
          hasil[donor.j] -= 1;
          adaPerubahan = true;
        }
      } else if (hasil[i] > maxs[i]) {
        const penerima = hasil.map((nilaiLain, j) => ({ j, ruang: Math.max(0, maxs[j] - nilaiLain) })).filter((item) => item.j !== i && item.ruang > 0).sort((a, b) => b.ruang - a.ruang)[0];
        if (penerima) {
          hasil[i] -= 1;
          hasil[penerima.j] += 1;
          adaPerubahan = true;
        }
      }
    }
    if (!adaPerubahan) break;
  }
  return hasil;
}

function saranKurang(share: RoleShare): string {
  const contoh: Record<string, string> = {
    Dasar: "tambah pelet ikan atau roti tawar supaya adonan punya fondasi",
    Pengikat: "tambah tapioka, terigu, atau telur sedikit",
    Protein: "tambah kroto atau bahan berprotein lain",
    Aroma: "tambah sedikit bahan aroma seperti jagung atau susu bubuk",
    Pelembap: "tambah sedikit air atau santan",
  };
  return `Saran: ${contoh[share.role] ?? "tambah bahan peran ini"}, atau kurangi bahan peran lain karena totalnya tetap 100%.`;
}

function saranLebih(share: RoleShare): string {
  return `Saran: kurangi jumlah bahan ${share.role.toLowerCase()} atau tambah bahan peran lain agar porsi ini turun.`;
}

function hitungBlend(selected: IngredientKnowledge[], wilayah: Wilayah) {
  const unik = selected.filter((item, index) => selected.findIndex((lain) => lain.id === item.id) === index);
  const rulesHadir = BLEND_ROLE_RULES.filter((rule) => unik.some((item) => item.role === rule.role));
  const totalBobot = unik.reduce((jumlah, item) => jumlah + item.weight, 0) || 1;

  const bobotPeran = rulesHadir.map((rule) => (unik.filter((item) => item.role === rule.role).reduce((jumlah, item) => jumlah + item.weight, 0) / totalBobot) * 100);
  const mins = rulesHadir.map((rule) => rule.minPercent);
  const maxs = rulesHadir.map((rule) => rule.maxPercent);
  const diatur = bagiProporsi(BLEND_BASIS_GRAM, bobotPeran, mins, maxs);
  // Kalau rentang aturan tidak bisa dipenuhi sekaligus (mis. hanya dua bahan
  // sehingga porsi Dasar tetap di atas 60%), komposisi dikembalikan ke proporsi
  // bahan pilihan pengunjung dan pelanggarannya dilaporkan — bukan dipaksa
  // masuk aturan dengan angka yang tidak lagi mencerminkan pilihan itu.
  const memaksaProporsi = Math.abs(diatur.reduce((jumlah, item) => jumlah + item, 0) - BLEND_BASIS_GRAM) > 0.5;
  const dasarPeran = memaksaProporsi ? bobotPeran : diatur;
  const peranBulat = rapikanBatas(bulatkanKeTarget(dasarPeran, BLEND_BASIS_GRAM), mins, maxs);

  const items: BlendItem[] = [];
  const roleShares: RoleShare[] = [];
  const warnings: string[] = [];

  BLEND_ROLE_RULES.forEach((rule) => {
    const anggota = unik.filter((item) => item.role === rule.role);
    const indeksPeran = rulesHadir.findIndex((item) => item.role === rule.role);
    const porsi = indeksPeran >= 0 ? peranBulat[indeksPeran] : 0;
    if (!anggota.length) {
      roleShares.push({ role: rule.role, percent: 0, min: rule.minPercent, max: rule.maxPercent, jumlahBahan: 0, status: "tidak-dipakai" });
      return;
    }
    const totalAnggota = anggota.reduce((jumlah, item) => jumlah + item.weight, 0) || 1;
    const mentah = anggota.map((item) => (item.weight / totalAnggota) * porsi);
    const bisaMinimum = porsi >= MIN_INGREDIENT_PERCENT * anggota.length;
    const sebar = bulatkanKeTarget(bagiProporsi(porsi, mentah, anggota.map(() => (bisaMinimum ? MIN_INGREDIENT_PERCENT : 0)), anggota.map(() => porsi)), porsi);
    anggota.forEach((item, index) => items.push({ ...item, percent: sebar[index], grams: sebar[index], rupiah: 0 }));
    roleShares.push({
      role: rule.role,
      percent: porsi,
      min: rule.minPercent,
      max: rule.maxPercent,
      jumlahBahan: anggota.length,
      status: porsi < rule.minPercent ? "kurang" : porsi > rule.maxPercent ? "lebih" : "sesuai",
    });
    if (!bisaMinimum) {
      warnings.push(`Porsi ${rule.role} hanya ${porsi}% untuk ${anggota.length} bahan, jadi tiap bahan di bawah ${MIN_INGREDIENT_PERCENT}% — jumlah sekecil itu tidak berpengaruh nyata. Tambah bahan peran lain atau kurangi bahan di peran ini.`);
    }
  });

  const peranTerpakai = new Set(roleShares.filter((share) => share.jumlahBahan > 0).map((share) => share.role));
  if (memaksaProporsi && roleShares.some((share) => share.status !== "sesuai" && share.jumlahBahan > 0)) {
    warnings.push(`Dengan ${unik.length} bahan ini, rentang aturan belum bisa dipenuhi sekaligus, jadi komposisi ditampilkan apa adanya sesuai proporsi bahan pilihanmu. Tambah bahan peran lain (atau lepas satu bahan) supaya sistem bisa membagi ulang porsinya.`);
  }
  if (!peranTerpakai.has("Dasar")) warnings.push("Belum ada bahan dasar. Tambahkan pelet ikan atau roti tawar agar campuran punya fondasi.");
  if (!peranTerpakai.has("Pengikat")) warnings.push("Belum ada bahan pengikat. Sedikit tapioka, terigu, atau telur dapat membantu tekstur lebih menyatu.");
  if (!peranTerpakai.has("Pelembap")) warnings.push("Tambahkan air atau santan sedikit demi sedikit saat mengaduk; takaran cairan tidak perlu dihabiskan.");
  roleShares.filter((share) => share.status === "kurang").forEach((share) => warnings.push(`Porsi ${share.role} ${share.percent}% — di bawah aturan ${share.min}–${share.max}%. ${saranKurang(share)}`));
  roleShares.filter((share) => share.status === "lebih").forEach((share) => warnings.push(`Porsi ${share.role} ${share.percent}% — di atas aturan ${share.min}–${share.max}%. ${saranLebih(share)}`));
  if (unik.some((item) => item.id === "pandan")) warnings.push("Jika pandan yang dipakai berupa essen, takar dalam tetes terpisah—jangan dihitung sebagai gram adonan.");

  const cost100g = hitungBiayaCampuran(items.map((item) => ({ id: item.id, gram: item.percent })), wilayah);
  const costSesi = hitungBiayaCampuran(items.map((item) => ({ id: item.id, gram: (item.percent * SESI_GRAM) / BLEND_BASIS_GRAM })), wilayah);
  const rupiahPerBahan = new Map(cost100g.perBahan.map((line) => [line.id, line.rupiah]));
  items.forEach((item) => { item.rupiah = rupiahPerBahan.get(item.id) ?? 0; });

  const suggestions: BlendSuggestion[] = [];
  unik.forEach((item) => {
    const tercatat = penggantiTercatat(item.id).filter((id) => !unik.some((lain) => lain.id === id));
    const seperan = ingredientKnowledge.filter((kandidat) => kandidat.role === item.role && kandidat.id !== item.id && !unik.some((lain) => lain.id === kandidat.id));
    const pilihan = (tercatat.length ? tercatat : seperan.map((kandidat) => kandidat.id)).slice(0, 2);
    const catatan = catatanPengganti(item.id);
    if (pilihan.length) {
      const bedaPeran = pilihan.filter((id) => ingredientKnowledge.find((kandidat) => kandidat.id === id)?.role !== item.role).map((id) => ingredientKnowledge.find((kandidat) => kandidat.id === id)?.role).filter(Boolean);
      const detail = [bedaPeran.length ? `Perannya berbeda (${item.role} → ${[...new Set(bedaPeran)].join(", ")}), jadi rasio peran ikut berubah.` : null, catatan].filter(Boolean).join(" ");
      suggestions.push({ jenis: "pengganti", judul: `Tidak ada ${item.name.toLowerCase()}? Pakai ${pilihan.map(namaBahan).join(" atau ")}.`, detail, penggantiIds: pilihan, untukId: item.id });
    } else {
      suggestions.push({ jenis: "pengganti", judul: `Tidak ada ${item.name.toLowerCase()}?`, detail: catatan ?? "Belum ada pengganti seperan di basis pengetahuan; lewati saja bahan ini.", penggantiIds: [], untukId: item.id });
    }
  });

  roleShares.filter((share) => share.status === "kurang").forEach((share) => {
    const kandidat = ingredientKnowledge.filter((item) => item.role === share.role && !unik.some((lain) => lain.id === item.id)).slice(0, 2);
    if (kandidat.length && unik.length < MAX_BLEND_INGREDIENTS) {
      suggestions.push({
        jenis: "aturan",
        judul: `Tambah ${kandidat.map((item) => item.name).join(" atau ")} untuk menaikkan porsi ${share.role} (sekarang ${share.percent}%, aturan ${share.min}–${share.max}%).`,
        detail: "Cukup satu bahan tambahan; sisanya dibagi ulang otomatis.",
        penggantiIds: kandidat.map((item) => item.id),
      });
    }
  });
  roleShares.filter((share) => share.status === "lebih").forEach((share) => {
    suggestions.push({
      jenis: "aturan",
      judul: `Kurangi bahan ${share.role.toLowerCase()} (porsi ${share.percent}%, aturan ${share.min}–${share.max}%).`,
      detail: "Membuang satu bahan membuat porsi sisanya dibagi ulang otomatis mengikuti aturan.",
      penggantiIds: [],
    });
  });
  // Peran yang belum terpakai: tawarkan bahan konkret supaya pengunjung bisa
  // langsung memperbaiki komposisi, bukan hanya membaca peringatan.
  roleShares.filter((share) => share.jumlahBahan === 0).forEach((share) => {
    const kandidat = ingredientKnowledge.filter((item) => item.role === share.role).slice(0, 2);
    if (!kandidat.length || unik.length >= MAX_BLEND_INGREDIENTS) return;
    suggestions.push({
      jenis: "aturan",
      judul: `Belum ada ${share.role.toLowerCase()} (aturan ${share.min}–${share.max}%). Tambah ${kandidat.map((item) => item.name).join(" atau ")}.`,
      detail: "Porsi seluruh campuran akan dibagi ulang otomatis setelah bahan ditambahkan.",
      penggantiIds: kandidat.map((item) => item.id),
    });
  });

  if (roleShares.some((share) => share.status !== "sesuai" && share.jumlahBahan > 0)) {
    suggestions.push({
      jenis: "aturan",
      judul: `Komposisi contoh di atas sudah dibagi ulang sistem ke rentang yang paling dekat.`,
      detail: BLEND_RULES_SUMMARY,
      penggantiIds: [],
    });
  }

  return { items, roleShares, warnings, suggestions, cost100g, costSesi };
}

/**
 * Susun komposisi dari bahan terpilih: porsi per peran dibagi ulang agar masuk
 * rentang aturan, tiap bahan dapat minimal `MIN_INGREDIENT_PERCENT` bila
 * memungkinkan, lalu dilaporkan peringatan, saran pengganti, dan perkiraan biaya.
 */
export function balanceBlend(selected: IngredientKnowledge[], wilayah: Wilayah = "Nasional"): BlendBalance | null {
  if (selected.length < MIN_BLEND_INGREDIENTS) return null;
  const dasar = hitungBlend(selected, wilayah);

  const dipakai = new Set(dasar.items.map((item) => item.id));
  const hematIds = dasar.items.map((item) => {
    const kandidat = ingredientKnowledge
      .filter((kandidatItem) => kandidatItem.role === item.role && !dipakai.has(kandidatItem.id))
      .map((kandidatItem) => ({ id: kandidatItem.id, harga: hargaPerGram(kandidatItem.id, wilayah) }))
      .filter((kandidatItem) => kandidatItem.harga !== null && hargaPerGram(item.id, wilayah) !== null && kandidatItem.harga < (hargaPerGram(item.id, wilayah) as number))
      .sort((a, b) => (a.harga as number) - (b.harga as number));
    const pilihan = kandidat[0];
    if (pilihan) dipakai.add(pilihan.id);
    return pilihan ? pilihan.id : item.id;
  });

  let hemat: BlendHemat | null = null;
  const berubah = hematIds.some((id, index) => id !== dasar.items[index].id);
  if (berubah) {
    const bahan = hematIds.map((id) => ingredientKnowledge.find((item) => item.id === id)).filter((item): item is IngredientKnowledge => Boolean(item));
    if (bahan.length >= MIN_BLEND_INGREDIENTS) {
      const alternatif = hitungBlend(bahan, wilayah);
      if (alternatif.cost100g.total < dasar.cost100g.total) {
        hemat = {
          ids: hematIds,
          total100g: alternatif.cost100g.total,
          totalSesi: alternatif.costSesi.total,
          selisih100g: dasar.cost100g.total - alternatif.cost100g.total,
          selisihSesi: dasar.costSesi.total - alternatif.costSesi.total,
        };
        const penggantian = dasar.items.map((item, index) => ({ dari: item.name, ke: namaBahan(hematIds[index]), berubah: hematIds[index] !== item.id })).filter((item) => item.berubah);
        dasar.suggestions.push({
          jenis: "hemat",
          judul: `Versi hemat: ganti ${penggantian.map((item) => `${item.dari} → ${item.ke}`).join(", ")}.`,
          detail: `Perkiraan hemat ${formatRupiah(hemat.selisih100g)} per 100 g adonan dan ${formatRupiah(hemat.selisihSesi)} per sesi (± ${SESI_GRAM} g), dengan peran yang sama sehingga rasio tetap di dalam aturan. Pakai tombol "Terapkan versi hemat" di bawah untuk menggantinya sekaligus.`,
          penggantiIds: [],
        });
      }
    }
  }

  if (dasar.items.length) dasar.suggestions.push({ jenis: "pengganti", judul: "Cara memakai saran ini", detail: SUBSTITUTE_NOTE, penggantiIds: [] });

  return { ...dasar, hemat, basisGram: BLEND_BASIS_GRAM, sesiGram: SESI_GRAM, substituteNote: SUBSTITUTE_NOTE };
}

/** Perkiraan harga satu bahan untuk ditampilkan di tabel harga. */
export function hargaBahanTabel(id: string, wilayah: Wilayah): number {
  return hargaBahan(id, wilayah) ?? 0;
}
