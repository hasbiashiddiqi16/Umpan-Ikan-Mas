/**
 * Penilaian risiko isi ulasan untuk moderasi berbasis risiko.
 *
 * Ulasan pengunjung tidak lagi menunggu persetujuan editor satu per satu:
 * kiriman yang bersih langsung tampil (`approved`), sedangkan yang terdeteksi
 * mencurigakan ditahan (`pending`) beserta alasannya agar admin cukup
 * meninjau pengecualian. Fungsi ini murni menilai isi kiriman — sinyal
 * perilaku (pemilik mengulas resepnya sendiri, banyak kiriman dari satu
 * perangkat) dinilai terpisah di rute pengiriman karena butuh basis data.
 *
 * Ditahan bukan berarti ditolak: admin tetap yang memutuskan di dashboard,
 * dan pengirim tetap melihat salinan tertahannya sendiri berlabel
 * "Menunggu pemeriksaan".
 */
export type HasilRisikoUlasan = {
  /** `true` berarti ulasan ditahan untuk ditinjau admin. */
  tinggi: boolean;
  /** Alasan yang dapat dibaca admin; disimpan di kolom `hold_reason`. */
  alasan: string[];
};

const POLA_TAUTAN = /(https?:\/\/|www\.|wa\.me|t\.me|bit\.ly|linktr\.ee|tinyurl|s\.id\/)/i;
const POLA_TELEPON = /(?:\+62|62|0)8\d{7,13}/;
const KATA_TERLARANG = [
  "anjing", "bangsat", "bajingan", "kontol", "memek", "ngentot", "jancok",
  "tolol", "goblok", "brengsek", "keparat", "fuck", "shit", "bitch",
  "porno", "bokep", "judi", "slot gacor", "togel", "maxwin", "situs slot",
];
const NAMA_PENYAMAR = ["admin", "redaksi", "moderator", "official", "customer service", "tim umpan", "umpan mas"];

export function nilaiRisikoUlasan(input: { nama: string; komentar: string }): HasilRisikoUlasan {
  const alasan: string[] = [];
  const komentar = input.komentar;
  const namaKecil = input.nama.trim().toLowerCase();

  if (POLA_TAUTAN.test(komentar)) alasan.push("Mengandung tautan");
  // Nomor telepon ditulis dengan banyak pemisah (spasi/strip), jadi yang
  // dinilai adalah rangkaian angkanya saja.
  const angkaSaja = komentar.replace(/[^\d+]/g, "");
  if (POLA_TELEPON.test(angkaSaja)) alasan.push("Mengandung nomor telepon");
  const komentarKecil = komentar.toLowerCase();
  if (KATA_TERLARANG.some((kata) => komentarKecil.includes(kata))) {
    alasan.push("Mengandung kata kasar atau promosi terlarang");
  }
  if (NAMA_PENYAMAR.some((pola) => namaKecil.includes(pola))) {
    alasan.push("Nama menyerupai admin/redaksi");
  }
  const huruf = komentar.replace(/[^A-Za-zÀ-ÿ]/g, "");
  if (huruf.length >= 20) {
    const kapital = huruf.replace(/[^A-ZÀ-Þ]/g, "").length;
    if (kapital / huruf.length > 0.7) alasan.push("Huruf kapital berlebihan");
  }
  if (/([\s\S])\1{5,}/.test(komentar)) alasan.push("Karakter berulang seperti spam");

  return { tinggi: alasan.length > 0, alasan };
}
