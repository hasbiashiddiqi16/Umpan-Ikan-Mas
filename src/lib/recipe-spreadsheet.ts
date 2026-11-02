import ExcelJS from "exceljs";
import {
  FISHING_TYPES,
  normalizeFishingType,
  SEASON_CONDITIONS,
  WATER_BODIES,
  WATER_CONDITIONS,
  WEATHER_CONDITIONS,
} from "@/data/recipes";
import { provinceDirectory } from "@/data/province-directory";
import { validateCmsRecipeInput, type CmsRecipeInput } from "@/lib/cms";
import { hargaAcuanDariLabel } from "@/lib/utils";
import type { CmsIngredient } from "@/db/schema";

/**
 * Impor resep massal dari berkas spreadsheet (Excel `.xlsx` atau `.csv`)
 * di dashboard. Satu baris = satu resep; kolomnya memakai nama yang sama
 * dengan kolom formulir resep supaya admin tidak perlu mempelajari format
 * baru. Semua baris diperiksa dengan `validateCmsRecipeInput` yang sama
 * seperti formulir, jadi nilai di luar daftar resmi (cuaca, kondisi air,
 * jenis kolam, dst.) ditolak dengan pesan per baris.
 */

/** Batas baris resep per berkas, agar satu unggahan tidak membebani server. */
export const SPREADSHEET_MAX_ROWS = 200;

export type SpreadsheetRowFailure = { baris: number; judul: string; pesan: string };

type Kolom = { key: string; header: string; width: number; wajib?: boolean };

/**
 * Urutan kolom pada template Excel (selaras formulir ringkas dashboard):
 * 5 kolom wajib di kiri, diikuti 8 kolom opsional di kanan.
 * Kolom lama yang sudah dipensiunkan dari formulir (Tingkat kesulitan, Tipe air,
 * Musim, Cocok untuk, Kurang cocok) tetap dikenali saat impor berkas lama lewat
 * `HEADER_ALIASES`, tetapi tidak lagi ditampilkan di template baru.
 */
export const RECIPE_SPREADSHEET_COLUMNS: Kolom[] = [
  { key: "title", header: "Judul", width: 30, wajib: true },
  { key: "summary", header: "Ringkasan", width: 46, wajib: true },
  { key: "fishingTypes", header: "Jenis kolam", width: 20, wajib: true },
  { key: "ingredients", header: "Bahan", width: 42, wajib: true },
  { key: "steps", header: "Langkah", width: 48, wajib: true },
  { key: "status", header: "Status", width: 14 },
  { key: "slug", header: "Slug", width: 24 },
  { key: "image", header: "URL foto", width: 28 },
  { key: "weather", header: "Cuaca", width: 22 },
  { key: "water", header: "Kondisi air", width: 22 },
  { key: "provinces", header: "Provinsi terkait", width: 26 },
  { key: "price", header: "Perkiraan biaya", width: 20 },
  { key: "author", header: "Penulis", width: 18 },
];

/**
 * Baris contoh pada template Excel: HANYA 5 kolom wajib yang diberi contoh isi.
 * Seluruh kolom opsional — termasuk merek bahan & penanda "| opsional" —
 * sengaja dibiarkan kosong.
 */
export const CONTOH_BARIS_RESEP: Readonly<Record<"title" | "summary" | "fishingTypes" | "ingredients" | "steps", string>> = {
  title: "Contoh Umpan Jagung Kukus",
  summary: "Racikan dasar jagung manis kukus dan pelet halus yang mudah disiapkan untuk kolam harian.",
  fishingTypes: "Harian",
  ingredients: [
    "Jagung manis kukus | 2 bonggol",
    "Pelet halus | 100 g",
    "Kuning telur bebek | 1 butir",
  ].join("\n"),
  steps: [
    "Parut jagung manis kukus lalu haluskan sampai lembut.",
    "Campurkan kuning telur bebek dan pelet halus sedikit demi sedikit sambil diuleni.",
    "Bentuk adonan seukuran kelereng dan siap dipasang di kail.",
  ].join("\n"),
};

/** Nama kolom yang dikenali (Bahasa Indonesia sesuai template + beberapa alias & kolom lama). */
const HEADER_ALIASES: Record<string, string> = {
  judul: "title", "nama resep": "title", title: "title",
  slug: "slug",
  ringkasan: "summary", deskripsi: "summary", summary: "summary",
  status: "status",
  "perkiraan biaya": "price", "estimasi biaya": "price", biaya: "price", "label harga": "price", harga: "price", price: "price",
  "tingkat kesulitan": "difficulty", kesulitan: "difficulty", difficulty: "difficulty",
  cuaca: "weather", weather: "weather",
  "kondisi air": "water", water: "water",
  "tipe air": "waterBodies", "jenis air": "waterBodies",
  "jenis kolam": "fishingTypes", "jenis pemancingan": "fishingTypes",
  "provinsi terkait": "provinces", provinsi: "provinces",
  musim: "seasons", seasons: "seasons",
  bahan: "ingredients", "bahan-bahan": "ingredients", ingredients: "ingredients",
  langkah: "steps", "langkah-langkah": "steps", "cara membuat": "steps", steps: "steps",
  "cocok untuk": "suitable", suitable: "suitable",
  "kurang cocok": "notSuitable", "tidak cocok": "notSuitable",
  penulis: "author", author: "author",
  "url foto": "image", foto: "image", gambar: "image", image: "image",
};

/** Kolom yang wajib ada di baris judul berkas. */
const REQUIRED_COLUMNS: Record<string, string> = {
  title: "Judul", summary: "Ringkasan", fishingTypes: "Jenis kolam", ingredients: "Bahan", steps: "Langkah",
};

/** Status boleh ditulis dalam Bahasa Indonesia maupun nilai simpannya. */
const STATUS_ALIASES: Record<string, string> = {
  draf: "draft", draft: "draft",
  tayang: "published", terbit: "published", published: "published", publish: "published",
  arsip: "archived", archived: "archived",
};

function normalizeHeader(value: string): string {
  return value.trim().toLocaleLowerCase("id-ID").replace(/\s+/g, " ");
}

/** Nilai sel Excel bisa berupa teks kaya/rumus/tautan — rapikan jadi teks biasa. */
function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    const obj = value as { richText?: { text?: string }[]; text?: string; result?: unknown };
    if (Array.isArray(obj.richText)) return obj.richText.map((part) => part.text ?? "").join("");
    if (typeof obj.text === "string") return obj.text;
    if (obj.result !== undefined) return cellText(obj.result);
  }
  return "";
}

/**
 * Daftar bernilai tertutup (cuaca, provinsi, dst.): nilainya tidak pernah
 * mengandung koma, jadi koma juga diterima sebagai pemisah selain titik
 * koma dan baris baru.
 */
function splitClosedList(text: string): string[] {
  return text.split(/[;,\n]/).map((item) => item.trim()).filter(Boolean);
}

/** Daftar teks bebas (cocok/kurang cocok): pemisahnya titik koma atau baris baru. */
function splitFreeList(text: string): string[] {
  return text.split(/[;\n]/).map((item) => item.trim()).filter(Boolean);
}

/**
 * Bahan ditulis per bahan sebagai `Nama | Merek | Takaran` (tambahkan
 * `| opsional` bila boleh dilewati), diantarai titik koma atau baris baru:
 * `Pelet ikan | Pelet Jitu | 50 g; Kroto | Segar | 1 ons | opsional`.
 */
function parseIngredients(text: string, baris: number, judul: string, failures: SpreadsheetRowFailure[]): CmsIngredient[] | null {
  const hasil: CmsIngredient[] = [];
  const bagian = text.split(/[;\n]/).map((item) => item.trim()).filter(Boolean);
  for (const [indeks, item] of bagian.entries()) {
    const kolom = item.split("|").map((part) => part.trim());
    const [name, brand, amount, penanda] = kolom.length === 2 ? [kolom[0], "", kolom[1], ""] : kolom;
    if (!name || !amount) {
      failures.push({
        baris,
        judul,
        pesan: `Bahan ke-${indeks + 1} belum lengkap — tulis "Nama | Takaran" atau "Nama | Merek | Takaran" (mis. "Pelet ikan | Pelet Jitu | 50 g").`,
      });
      return null;
    }
    hasil.push({
      name,
      brand: brand && brand !== "-" ? brand : "",
      amount,
      ...(/opsional|optional/i.test(penanda ?? "") ? { optional: true } : {}),
    });
  }
  return hasil;
}

/** Langkah boleh diberi nomor ("1. ...") — nomornya dibuang agar tampil seragam. */
function parseSteps(text: string): string[] {
  return splitFreeList(text).map((step) => step.replace(/^\d+\s*[.)]\s*/, "")).filter(Boolean);
}


/**
 * Periksa nilai kolom pilihan terhadap daftar resminya sebelum validasi
 * akhir, supaya pesan galat Excel menyebut kolom dan nilai yang salah
 * (mis. Cuaca "Hujann") alih-alih pesan umum. Mengembalikan daftar pesan
 * untuk baris itu (kosong = lolos).
 */
function periksaPilihan(
  baris: number,
  judul: string,
  kolom: string,
  values: string[],
  allowed: readonly string[],
  samakan?: (value: string) => string,
): SpreadsheetRowFailure[] {
  const tidakSah = values.filter((value) => !allowed.includes(samakan ? samakan(value) : value));
  if (!tidakSah.length) return [];
  return [{
    baris,
    judul,
    pesan: `${kolom} "${tidakSah.join('", "')}" tidak dikenal — nilai yang sah: ${allowed.join(", ")}.`,
  }];
}

type BarisMentah = { baris: number; cells: string[] };

/**
 * Ubah baris-baris teks (baris pertama = judul kolom) menjadi payload resep
 * yang siap simpan. Galat fatal (berkas kosong, kolom wajib hilang, terlalu
 * banyak baris) dilempar sebagai `Error`; galat per baris dikumpulkan di
 * `failures` supaya admin bisa memperbaiki semuanya sekaligus.
 */
export function parseRecipeSpreadsheet(rows: BarisMentah[]): { recipes: CmsRecipeInput[]; failures: SpreadsheetRowFailure[] } {
  const [header, ...dataRows] = rows.filter((row) => row.cells.some((cell) => cell.trim()));
  if (!header) throw new Error("Berkas kosong — isi minimal baris judul kolom dan satu baris resep.");

  const kolomKe: Record<string, number> = {};
  header.cells.forEach((cell, indeks) => {
    const key = HEADER_ALIASES[normalizeHeader(cell)];
    if (key && kolomKe[key] === undefined) kolomKe[key] = indeks;
  });
  const hilang = Object.entries(REQUIRED_COLUMNS)
    .filter(([key]) => kolomKe[key] === undefined)
    .map(([, label]) => label);
  if (hilang.length) {
    throw new Error(`Kolom wajib tidak ditemukan: ${hilang.join(", ")}. Unduh template Excel dari dashboard agar nama kolomnya sama persis.`);
  }

  const failures: SpreadsheetRowFailure[] = [];
  const recipes: CmsRecipeInput[] = [];
  const slugTerpakai = new Map<string, number>();
  const normBaris = (teks: string) => teks.replace(/\r\n/g, "\n").trim();
  let contohDilewati = 0;

  for (const row of dataRows.slice(0, SPREADSHEET_MAX_ROWS + 1)) {
    const ambil = (key: string) => {
      const indeks = kolomKe[key];
      return indeks === undefined ? "" : (row.cells[indeks] ?? "").trim();
    };
    const adalahContohUtuh =
      normBaris(ambil("title")) === CONTOH_BARIS_RESEP.title &&
      normBaris(ambil("summary")) === CONTOH_BARIS_RESEP.summary &&
      normBaris(ambil("fishingTypes")) === CONTOH_BARIS_RESEP.fishingTypes &&
      normBaris(ambil("ingredients")) === CONTOH_BARIS_RESEP.ingredients &&
      normBaris(ambil("steps")) === CONTOH_BARIS_RESEP.steps &&
      ["status", "slug", "image", "weather", "water", "provinces", "price", "author"].every((key) => !ambil(key));
    if (adalahContohUtuh) {
      contohDilewati += 1;
      continue;
    }

    const title = ambil("title");
    const judul = title || "(judul kosong)";
    const ingredients = ambil("ingredients")
      ? parseIngredients(ambil("ingredients"), row.baris, judul, failures)
      : [];
    if (ingredients === null) continue;

    const daftarPeriksa: [string, string[], readonly string[], ((value: string) => string)?][] = [
      ["Cuaca", splitClosedList(ambil("weather")), WEATHER_CONDITIONS],
      ["Kondisi air", splitClosedList(ambil("water")), WATER_CONDITIONS],
      ["Tipe air", splitClosedList(ambil("waterBodies")), WATER_BODIES],
      ["Jenis kolam", splitClosedList(ambil("fishingTypes")), FISHING_TYPES, normalizeFishingType],
      ["Musim", splitClosedList(ambil("seasons")), SEASON_CONDITIONS],
      ["Provinsi terkait", splitClosedList(ambil("provinces")), provinceDirectory.map((provinsi) => provinsi.name)],
    ];
    const gagalPeriksa = daftarPeriksa.flatMap(([kolom, values, allowed, samakan]) =>
      periksaPilihan(row.baris, judul, kolom, values, allowed, samakan));
    const kesulitan = ambil("difficulty");
    if (kesulitan && !["Mudah", "Menengah", "Tingkat lanjut"].includes(kesulitan)) {
      gagalPeriksa.push({ baris: row.baris, judul, pesan: `Tingkat kesulitan "${kesulitan}" tidak dikenal — nilai yang sah: Mudah, Menengah, Tingkat lanjut.` });
    }
    const statusMentah = ambil("status");
    if (statusMentah && STATUS_ALIASES[normalizeHeader(statusMentah)] === undefined) {
      gagalPeriksa.push({ baris: row.baris, judul, pesan: `Status "${statusMentah}" tidak dikenal — isi draft, published, atau archived (kosong = draft).` });
    }
    if (gagalPeriksa.length) { failures.push(...gagalPeriksa); continue; }

    const priceLabel = ambil("price") || "Rp15.000–30.000";
    const parsed = validateCmsRecipeInput({
      title,
      slug: ambil("slug"),
      summary: ambil("summary"),
      status: STATUS_ALIASES[normalizeHeader(ambil("status"))] ?? ambil("status"),
      difficulty: ambil("difficulty"),
      price: priceLabel,
      // Harga acuan tidak diketik di Excel: diturunkan dari label harga,
      // sama seperti formulir dashboard.
      priceValue: hargaAcuanDariLabel(priceLabel),
      image: ambil("image"),
      author: ambil("author"),
      weather: splitClosedList(ambil("weather")),
      water: splitClosedList(ambil("water")),
      waterBodies: splitClosedList(ambil("waterBodies")),
      fishingTypes: splitClosedList(ambil("fishingTypes")),
      provinces: splitClosedList(ambil("provinces")),
      seasons: splitClosedList(ambil("seasons")),
      suitable: splitFreeList(ambil("suitable")),
      notSuitable: splitFreeList(ambil("notSuitable")),
      ingredients,
      steps: parseSteps(ambil("steps")),
    });
    if (!parsed.data) {
      failures.push({ baris: row.baris, judul, pesan: parsed.error ?? "Data baris ini tidak valid." });
      continue;
    }
    const dipakaiBaris = slugTerpakai.get(parsed.data.slug);
    if (dipakaiBaris !== undefined) {
      failures.push({
        baris: row.baris,
        judul,
        pesan: `Slug "${parsed.data.slug}" juga dipakai pada baris ${dipakaiBaris} — ubah slug salah satu baris.`,
      });
      continue;
    }
    slugTerpakai.set(parsed.data.slug, row.baris);
    recipes.push(parsed.data);
  }

  if (dataRows.length - contohDilewati > SPREADSHEET_MAX_ROWS) {
    throw new Error(`Berkas berisi ${dataRows.length - contohDilewati} baris resep — batasnya ${SPREADSHEET_MAX_ROWS} baris per unggahan. Pecah berkasnya lalu unggah bertahap.`);
  }
  if (contohDilewati > 0 && recipes.length === 0 && failures.length === 0) {
    throw new Error("Berkas masih berisi baris contoh bawaan template saja. Ganti baris ke-2 dengan resepmu atau tambahkan baris resep baru di bawahnya.");
  }
  return { recipes, failures };
}

/** Pengurai CSV sederhana: mendukung koma/titik koma/tab, tanda kutip, dan BOM. */
function parseCsv(text: string): BarisMentah[] {
  const bersih = text.replace(/^\uFEFF/, "");
  const barisPertama = bersih.split(/\r\n|\r|\n/, 1)[0] ?? "";
  const delimiter = [";", ",", "\t"]
    .map((kandidat) => ({ kandidat, jumlah: barisPertama.split(kandidat).length - 1 }))
    .sort((a, b) => b.jumlah - a.jumlah)[0]?.kandidat ?? ",";

  const records: string[][] = [];
  let record: string[] = [];
  let cell = "";
  let dalamKutip = false;
  for (let i = 0; i < bersih.length; i++) {
    const ch = bersih[i];
    if (dalamKutip) {
      if (ch === '"') {
        if (bersih[i + 1] === '"') { cell += '"'; i++; } else dalamKutip = false;
      } else cell += ch;
      continue;
    }
    if (ch === '"') { dalamKutip = true; continue; }
    if (ch === delimiter) { record.push(cell); cell = ""; continue; }
    if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && bersih[i + 1] === "\n") i++;
      record.push(cell); cell = "";
      records.push(record); record = [];
      continue;
    }
    cell += ch;
  }
  record.push(cell);
  records.push(record);
  return records.map((cells, indeks) => ({ baris: indeks + 1, cells }));
}

/** Baca berkas `.xlsx`/`.csv` menjadi baris-baris teks (dengan nomor baris aslinya). */
export async function readSpreadsheetRows(buffer: Buffer, filename: string): Promise<BarisMentah[]> {
  if (/\.csv$/i.test(filename)) return parseCsv(buffer.toString("utf-8"));

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  const sheet = workbook.getWorksheet("Resep") ?? workbook.worksheets[0];
  if (!sheet) throw new Error("Lembar kerja tidak ditemukan di dalam berkas Excel ini.");

  const rows: BarisMentah[] = [];
  const batas = Math.min(sheet.rowCount, SPREADSHEET_MAX_ROWS + 500);
  const batasKolom = Math.max(RECIPE_SPREADSHEET_COLUMNS.length + 8, 24);
  for (let nomor = 1; nomor <= batas; nomor++) {
    const row = sheet.getRow(nomor);
    const cells: string[] = [];
    const kolom = Math.min(Math.max(row.cellCount, 1), batasKolom);
    for (let c = 1; c <= kolom; c++) cells.push(cellText(row.getCell(c).value));
    rows.push({ baris: nomor, cells });
  }
  return rows;
}

/** Bangun berkas template `.xlsx` (lembar "Resep" + lembar "Petunjuk"). */
export async function buildRecipeTemplateWorkbook(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Resep", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  sheet.columns = RECIPE_SPREADSHEET_COLUMNS.map((kolom) => ({ header: kolom.header, key: kolom.key, width: kolom.width }));

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  RECIPE_SPREADSHEET_COLUMNS.forEach((kolom, indeks) => {
    const cell = headerRow.getCell(indeks + 1);
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: kolom.wajib ? "FFE2EBD9" : "FFF3F5F1" },
    };
  });

  // Baris ke-2 hanya mengisi kolom wajib; semua kolom opsional dibiarkan kosong.
  sheet.addRow(CONTOH_BARIS_RESEP);
  sheet.eachRow((row) => { row.alignment = { vertical: "top", wrapText: true }; });

  const guide = workbook.addWorksheet("Petunjuk");
  guide.getColumn(1).width = 118;
  const barisPetunjuk = [
    "CARA MENGISI TEMPLATE IMPOR RESEP",
    "",
    "1. Satu baris = satu resep. Baris ke-2 pada lembar \"Resep\" adalah contoh pengisian untuk 5 kolom wajib saja — seluruh kolom opsional sengaja dibiarkan kosong.",
    "2. Ganti atau hapus baris contoh ke-2 sebelum mengunggah (bila baris contoh tidak diubah sama sekali, sistem akan melewatinya otomatis agar tidak ikut masuk ke daftar resep).",
    "3. Unggah lewat Dashboard → Konten → Upload Excel. Format .xlsx atau .csv, ukuran maksimal 2 MB, maksimal 200 baris resep per berkas.",
    "4. Kolom wajib (5 kolom berlatar hijau muda di kiri): Judul, Ringkasan, Jenis kolam, Bahan, Langkah.",
    "5. Kolom opsional (8 kolom di kanan, boleh dikosongkan): Status, Slug, URL foto, Cuaca, Kondisi air, Provinsi terkait, Perkiraan biaya, Penulis.",
    "6. Bahan ditulis satu bahan per baris di dalam sel yang sama dengan format wajib: Nama bahan | Takaran (contoh: Pelet halus | 100 g). Bila ingin mencantumkan merek (opsional), tulis: Nama bahan | Merek | Takaran. Bila bahan boleh dilewati, tambahkan \"| opsional\" di belakang.",
    "7. Tulis setiap langkah meracik pada baris baru di dalam sel yang sama. Nomor urut di awal langkah otomatis dirapikan.",
    "8. Untuk kolom pilihan (Jenis kolam, Cuaca, Kondisi air, Provinsi terkait), pisahkan beberapa nilai dengan koma sesuai daftar NILAI YANG SAH di bawah.",
    "9. Perkiraan biaya boleh dikosongkan (otomatis memakai rentang bawaan Rp15.000–30.000) atau diisi pilihan cepat seperti di formulir (< Rp25.000, Rp25.000–50.000, > Rp50.000). Angka acuan filter budget dihitung otomatis.",
    "10. Slug boleh dikosongkan (dibuat otomatis dari judul). Bila slug sama dengan resep yang sudah ada, resep tersebut DIPERBARUI — bukan dibuat duplikat.",
    "11. URL foto boleh dikosongkan (memakai foto bawaan) atau diisi alamat foto yang diawali \"/\" (mis. /api/media/recipe-...).",
    "12. Semua baris diperiksa dulu sebelum disimpan: bila ada satu baris tidak valid, tidak ada yang disimpan dan baris yang perlu diperbaiki dilaporkan.",
    "",
    "NILAI YANG SAH UNTUK KOLOM PILIHAN",
    `Jenis kolam (wajib minimal satu): ${FISHING_TYPES.join(", ")}`,
    `Cuaca (opsional): ${WEATHER_CONDITIONS.join(", ")}`,
    `Kondisi air (opsional): ${WATER_CONDITIONS.join(", ")}`,
    "Perkiraan biaya (opsional): < Rp25.000, Rp25.000–50.000, > Rp50.000 (atau rentang seperti Rp15.000–30.000)",
    "Status (opsional): draft (draf, belum tayang), published (tayang), archived (arsip). Kosong berarti draft.",
    `Provinsi terkait (opsional, 38 provinsi): ${provinceDirectory.map((provinsi) => provinsi.name).join(", ")}`,
  ];
  barisPetunjuk.forEach((teks, indeks) => {
    const cell = guide.getCell(`A${indeks + 1}`);
    cell.value = teks;
    cell.alignment = { wrapText: true, vertical: "top" };
    if (indeks === 0 || teks === "NILAI YANG SAH UNTUK KOLOM PILIHAN") cell.font = { bold: true };
  });

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
