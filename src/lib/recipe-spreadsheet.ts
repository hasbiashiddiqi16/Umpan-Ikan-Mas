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

type Kolom = { key: string; header: string; width: number };

/** Urutan kolom pada template (sekaligus urutan yang disarankan di berkas admin). */
export const RECIPE_SPREADSHEET_COLUMNS: Kolom[] = [
  { key: "title", header: "Judul", width: 28 },
  { key: "slug", header: "Slug", width: 24 },
  { key: "summary", header: "Ringkasan", width: 44 },
  { key: "status", header: "Status", width: 12 },
  { key: "price", header: "Label harga", width: 18 },
  { key: "difficulty", header: "Tingkat kesulitan", width: 16 },
  { key: "weather", header: "Cuaca", width: 24 },
  { key: "water", header: "Kondisi air", width: 22 },
  { key: "waterBodies", header: "Tipe air", width: 16 },
  { key: "fishingTypes", header: "Jenis kolam", width: 22 },
  { key: "provinces", header: "Provinsi terkait", width: 26 },
  { key: "seasons", header: "Musim", width: 22 },
  { key: "ingredients", header: "Bahan", width: 46 },
  { key: "steps", header: "Langkah", width: 46 },
  { key: "suitable", header: "Cocok untuk", width: 28 },
  { key: "notSuitable", header: "Kurang cocok", width: 28 },
  { key: "author", header: "Penulis", width: 16 },
  { key: "image", header: "URL foto", width: 26 },
];

/** Nama kolom yang dikenali (Bahasa Indonesia sesuai template + beberapa alias). */
const HEADER_ALIASES: Record<string, string> = {
  judul: "title", "nama resep": "title", title: "title",
  slug: "slug",
  ringkasan: "summary", deskripsi: "summary", summary: "summary",
  status: "status",
  "label harga": "price", harga: "price", price: "price",
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
  title: "Judul", summary: "Ringkasan", ingredients: "Bahan", steps: "Langkah",
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
    const [name, brand, amount, penanda] = kolom;
    if (!name || !amount) {
      failures.push({
        baris,
        judul,
        pesan: `Bahan ke-${indeks + 1} belum lengkap — formatnya "Nama | Merek | Takaran" (mis. "Pelet ikan | Pelet Jitu | 50 g").`,
      });
      return null;
    }
    hasil.push({
      name,
      brand: brand || "-",
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

  for (const row of dataRows.slice(0, SPREADSHEET_MAX_ROWS + 1)) {
    const ambil = (key: string) => {
      const indeks = kolomKe[key];
      return indeks === undefined ? "" : (row.cells[indeks] ?? "").trim();
    };
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

  if (dataRows.length > SPREADSHEET_MAX_ROWS) {
    throw new Error(`Berkas berisi ${dataRows.length} baris resep — batasnya ${SPREADSHEET_MAX_ROWS} baris per unggahan. Pecah berkasnya lalu unggah bertahap.`);
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
  for (let nomor = 1; nomor <= batas; nomor++) {
    const row = sheet.getRow(nomor);
    const cells: string[] = [];
    const kolom = Math.min(Math.max(row.cellCount, 1), RECIPE_SPREADSHEET_COLUMNS.length + 4);
    for (let c = 1; c <= kolom; c++) cells.push(cellText(row.getCell(c).value));
    rows.push({ baris: nomor, cells });
  }
  return rows;
}

/** Dua baris contoh pada template: resep asli katalog agar formatnya jelas. */
const TEMPLATE_EXAMPLES: Record<string, string>[] = [
  {
    title: "Umpan Putih Kroto",
    slug: "umpan-putih-kroto",
    summary: "Racikan lembut beraroma gurih yang jadi andalan pemancing saat hujan dan air kolam mulai keruh.",
    status: "published",
    price: "Rp20.000–25.000",
    difficulty: "Mudah",
    weather: "Hujan; Mendung; Berawan",
    water: "Keruh; Hijau",
    waterBodies: "Kolam",
    fishingTypes: "Harian; Lomba",
    provinces: "DKI Jakarta",
    seasons: "Musim Hujan; Peralihan",
    ingredients: "Pelet ikan | Pelet Jitu | 50 g; Susu bubuk | Dancow Full Cream | 20 g; Tepung terigu | Rose Brand | 25 g; Telur ayam | - | 1 butir; Santan | Kara | 30 ml; Kroto segar | - | 1 ons; Essen pandan | Sesuai selera | 3–5 tetes | opsional",
    steps: "Haluskan pelet hingga teksturnya lembut; Campurkan susu bubuk dan tepung sampai merata; Masukkan telur dan santan sedikit demi sedikit; Aduk hingga adonan kalis dan mudah dibentuk; Tambahkan kroto dan essen, aduk perlahan; Kukus 15–20 menit, lalu dinginkan sebelum digunakan",
    suitable: "Hujan; Air keruh; Kolam harian; Ikan mas aktif",
    notSuitable: "Air sangat jernih; Kondisi sangat panas",
    author: "Tim UMPAN MAS",
    image: "",
  },
  {
    title: "Roti Tawar Kroto Lomba",
    slug: "roti-tawar-kroto-lomba",
    summary: "Tekstur lembut dari roti tawar dengan kroto segar untuk sesi lomba berdurasi panjang.",
    status: "published",
    price: "Rp30.000–38.000",
    difficulty: "Menengah",
    weather: "Hujan; Mendung",
    water: "Keruh; Hijau",
    waterBodies: "Kolam",
    fishingTypes: "Lomba",
    provinces: "DKI Jakarta",
    seasons: "Musim Hujan",
    ingredients: "Roti tawar | Sari Roti | 2 lembar; Kroto | Segar | 1 ons; Susu bubuk | Full cream | 15 g; Santan | Kara | 15 ml",
    steps: "Remas roti tawar hingga halus; Tambahkan susu bubuk dan santan; Masukkan kroto, aduk perlahan; Bentuk kecil dan simpan dalam wadah tertutup",
    suitable: "Kolam lomba; Hujan; Air kehijauan",
    notSuitable: "Kolam air bening; Cuaca panas terik",
    author: "Tim UMPAN MAS",
    image: "",
  },
];

/** Bangun berkas template `.xlsx` (lembar "Resep" + lembar "Petunjuk"). */
export async function buildRecipeTemplateWorkbook(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Resep");
  sheet.columns = RECIPE_SPREADSHEET_COLUMNS.map((kolom) => ({ header: kolom.header, key: kolom.key, width: kolom.width }));
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8EFE4" } };
  for (const contoh of TEMPLATE_EXAMPLES) sheet.addRow(contoh);
  sheet.eachRow((row) => { row.alignment = { vertical: "top", wrapText: true }; });

  const guide = workbook.addWorksheet("Petunjuk");
  guide.getColumn(1).width = 118;
  const barisPetunjuk = [
    "CARA MENGISI TEMPLATE IMPOR RESEP",
    "",
    "1. Satu baris = satu resep. Isi mulai baris ke-2; dua baris contoh di lembar \"Resep\" boleh diganti atau dihapus.",
    "2. Unggah lewat Dashboard → Konten → Impor Excel. Format .xlsx atau .csv, ukuran maksimal 2 MB, maksimal 200 baris per berkas.",
    "3. Kolom wajib: Judul, Ringkasan, Bahan, Langkah. Jenis kolam wajib diisi minimal satu (Harian/Lomba/Galatama).",
    "4. Nilai yang lebih dari satu dipisahkan titik koma (;). Contoh Cuaca: Hujan; Mendung; Berawan.",
    "5. Bahan ditulis per bahan: Nama | Merek | Takaran — antar bahan dipisahkan titik koma atau baris baru. Tambahkan \"| opsional\" di belakang bahan yang boleh dilewati. Contoh: Pelet ikan | Pelet Jitu | 50 g; Kroto | Segar | 1 ons | opsional.",
    "6. Langkah dipisahkan titik koma atau baris baru; nomor di awal langkah otomatis dibuang.",
    "7. Harga acuan untuk saringan budget dihitung otomatis dari Label harga (titik tengah rentangnya) — tidak ada kolom angka harga.",
    "8. Slug boleh dikosongkan (dibuat otomatis dari judul). Bila slug sama dengan resep yang sudah ada, resep itu DIPERBARUI — bukan dibuat duplikat.",
    "9. URL foto boleh dikosongkan (resep memakai foto bawaan) atau diisi alamat foto yang diawali \"/\" — misalnya alamat hasil unggah foto dari formulir resep (/api/media/recipe-...).",
    "10. Semua baris diperiksa dulu sebelum disimpan: bila ada satu baris tidak valid, tidak ada yang disimpan. Perbaiki baris yang disebut dalam laporan, lalu unggah lagi.",
    "",
    "NILAI YANG SAH UNTUK KOLOM PILIHAN",
    `Cuaca: ${WEATHER_CONDITIONS.join("; ")}`,
    `Kondisi air: ${WATER_CONDITIONS.join("; ")}`,
    `Tipe air: ${WATER_BODIES.join("; ")}`,
    `Jenis kolam: ${FISHING_TYPES.join("; ")}`,
    `Musim: ${SEASON_CONDITIONS.join("; ")}`,
    "Tingkat kesulitan: Mudah; Menengah; Tingkat lanjut",
    "Status: draft (draf, belum tayang); published (tayang); archived (arsip). Kosong = draft.",
    `Provinsi terkait (38 provinsi): ${provinceDirectory.map((provinsi) => provinsi.name).join(", ")}`,
  ];
  barisPetunjuk.forEach((teks, indeks) => {
    const cell = guide.getCell(`A${indeks + 1}`);
    cell.value = teks;
    cell.alignment = { wrapText: true, vertical: "top" };
    if (indeks === 0 || teks === "NILAI YANG SAH UNTUK KOLOM PILIHAN") cell.font = { bold: true };
  });

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
