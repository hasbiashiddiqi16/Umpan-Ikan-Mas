/**
 * Kompresi gambar di peramban sebelum diunggah.
 *
 * Foto dari kamera mudah mencapai 2–4 MB padahal di situs tidak pernah
 * ditampilkan sebesar ukuran aslinya. Mengecilkan resolusi ke kebutuhan
 * tampil dan menyimpannya sebagai WebP membuat berkas jauh lebih ringan
 * (target sekitar 200 KB) tanpa terlihat pecah, sekaligus menghemat
 * penyimpanan basis data dan waktu unggah. Orientasi EXIF foto HP
 * dibetulkan saat gambar dimuat, dan metadata ikut terbuang.
 *
 * Fungsi ini tidak pernah melempar galat: bila peramban tidak mendukung
 * salah satu langkahnya, berkas asli dikembalikan apa adanya dan validasi
 * di server tetap menjadi pengaman terakhir.
 */

export type OpsiKompresi = {
  /** Lebar terbesar hasil (piksel). Tinggi mengikuti rasio asli. */
  lebarMaks: number;
  /** Sasaran ukuran berkas (byte). Lihat `kualitasLantai`. */
  targetBytes: number;
  /**
   * Kualitas terendah yang boleh dipakai saat mengejar `targetBytes`
   * (0–1, bawaan 0,65). Kompresi berhenti di lantai ini walau target belum
   * tercapai, agar foto yang ramai detail tidak rusak demi angka ukuran.
   */
  kualitasLantai?: number;
};

export type HasilKompresi = {
  file: File;
  ukuranAsli: number;
  ukuranHasil: number;
  /** Benar bila berkas benar-benar dikode ulang/dikecilkan. */
  terkompresi: boolean;
};

const KUALITAS_AWAL = 0.82;
const LANGKAH_KUALITAS = 0.06;

/** Ukuran berkas ringkas untuk keterangan ke pengguna, mis. "168 KB". */
export function formatUkuranBerkas(bytes: number): string {
  if (bytes < 1000) return `${bytes} B`;
  if (bytes < 1_000_000) return `${Math.round(bytes / 1000)} KB`;
  return `${(bytes / 1_000_000).toFixed(1).replace(".", ",")} MB`;
}

function gantiEkstensi(nama: string, ekstensi: string): string {
  const bersih = nama.replace(/\.[^.]+$/, "");
  return `${bersih || "gambar"}.${ekstensi}`;
}

function enkode(canvas: HTMLCanvasElement, tipe: string, kualitas: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, tipe, kualitas));
}

/** Muat gambar dengan orientasi EXIF diterapkan; mundur ke muatan biasa bila opsi tidak didukung. */
async function muatBitmap(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return createImageBitmap(file);
  }
}

export async function kompresGambar(file: File, opsi: OpsiKompresi): Promise<HasilKompresi> {
  const ukuranAsli = file.size;
  const apaAdanya: HasilKompresi = { file, ukuranAsli, ukuranHasil: file.size, terkompresi: false };
  // Hanya raster yang diterima formulir situs; berkas lain lolos apa adanya.
  if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) return apaAdanya;

  try {
    const bitmap = await muatBitmap(file);
    const skala = Math.min(1, opsi.lebarMaks / bitmap.width);
    // Sudah cukup kecil dan tidak perlu dikecilkan: jangan dikode ulang
    // supaya kualitas berkas asli tetap utuh.
    if (skala >= 1 && file.size <= opsi.targetBytes) {
      bitmap.close();
      return apaAdanya;
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * skala));
    canvas.height = Math.max(1, Math.round(bitmap.height * skala));
    const konteks = canvas.getContext("2d");
    if (!konteks) {
      bitmap.close();
      return apaAdanya;
    }
    konteks.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const lantai = opsi.kualitasLantai ?? 0.65;
    let kualitas = KUALITAS_AWAL;
    let blob = await enkode(canvas, "image/webp", kualitas);

    if (!blob || blob.type !== "image/webp") {
      // Peramban tanpa encoder WebP: PNG dipertahankan untuk berkas PNG
      // (jaga latar transparan logo), selain itu JPEG.
      const tipe = file.type === "image/png" ? "image/png" : "image/jpeg";
      blob = await enkode(canvas, tipe, 0.85);
      if (!blob) return apaAdanya;
      const hasil = new File([blob], gantiEkstensi(file.name, tipe === "image/png" ? "png" : "jpg"), { type: tipe });
      return pilihHasil(file, hasil, skala);
    }

    // Turunkan kualitas bertahap sampai target tercapai atau lantai kualitas.
    while (blob.size > opsi.targetBytes && kualitas > lantai) {
      kualitas = Math.max(lantai, Math.round((kualitas - LANGKAH_KUALITAS) * 100) / 100);
      const ulang = await enkode(canvas, "image/webp", kualitas);
      if (!ulang) break;
      blob = ulang;
    }
    const hasil = new File([blob], gantiEkstensi(file.name, "webp"), { type: "image/webp" });
    return pilihHasil(file, hasil, skala);
  } catch {
    return apaAdanya;
  }
}

/**
 * Hasil kode ulang dipakai bila memang lebih ringan. Pengecualian: bila
 * gambar memang harus dikecilkan resolusinya, hasil selalu dipakai agar
 * master yang disimpan tidak berukuran piksel berlebihan.
 */
function pilihHasil(asli: File, hasil: File, skala: number): HasilKompresi {
  if (skala < 1 || hasil.size < asli.size) {
    return { file: hasil, ukuranAsli: asli.size, ukuranHasil: hasil.size, terkompresi: true };
  }
  return { file: asli, ukuranAsli: asli.size, ukuranHasil: asli.size, terkompresi: false };
}
