"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import { bacaLaporanTerkirim, laporkanUlasan, tandaiLaporanTerkirim } from "@/lib/review-client";
import { useHydrated } from "@/lib/use-location";

const ALASAN_LAPORAN = [
  ["spam", "Spam / promosi"],
  ["kasar", "Kata kasar"],
  ["tidak-relevan", "Tidak relevan"],
  ["lainnya", "Lainnya"],
] as const;

/**
 * Tombol Laporkan pada kartu ulasan yang sudah tampil publik.
 *
 * Satu laporan per perangkat per ulasan (diingat di peramban dan ditegakkan
 * server). Laporan tidak menghapus apa pun saat itu juga: admin meninjaunya
 * di Studio → Moderasi Ulasan, dan tiga pelapor berbeda menahan ulasan itu
 * otomatis sampai ada keputusan.
 */
export function ReviewReportButton({ reviewId }: { reviewId: number }) {
  const hydrated = useHydrated();
  const [terbuka, setTerbuka] = useState(false);
  const [terkirim, setTerkirim] = useState(false);
  const [mengirim, setMengirim] = useState(false);
  // Dibaca setelah hidrasi supaya render server dan render pertama klien sama.
  const sudah = hydrated && bacaLaporanTerkirim().includes(reviewId);

  if (terkirim) {
    return <p className="mt-3 text-[11px] font-semibold text-[#4f724f]">Laporan terkirim — terima kasih, admin akan meninjaunya.</p>;
  }
  if (sudah) {
    return <p className="mt-3 text-[11px] font-semibold text-[#969d94]">Kamu sudah melaporkan ulasan ini dari perangkat ini.</p>;
  }

  async function kirim(reason: string) {
    setMengirim(true);
    const hasil = await laporkanUlasan(reviewId, reason);
    setMengirim(false);
    if (hasil.ok) {
      tandaiLaporanTerkirim(reviewId);
      setTerkirim(true);
      setTerbuka(false);
    }
  }

  return (
    <div className="mt-3">
      {!terbuka ? (
        <button type="button" onClick={() => setTerbuka(true)} className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#969d94] transition hover:text-[#905d4b]">
          <Flag size={11} /> Laporkan
        </button>
      ) : (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold text-[#666d63]">Alasan:</span>
          {ALASAN_LAPORAN.map(([nilai, label]) => (
            <button key={nilai} type="button" disabled={mengirim} onClick={() => void kirim(nilai)} className="min-h-7 rounded-full border border-[#e4e9e2] px-2.5 text-[11px] font-bold text-[#626e62] transition hover:bg-[#f5f7f3] disabled:opacity-50">
              {label}
            </button>
          ))}
          <button type="button" onClick={() => setTerbuka(false)} className="min-h-7 px-1.5 text-[11px] font-bold text-[#969d94]">
            Batal
          </button>
        </div>
      )}
    </div>
  );
}
