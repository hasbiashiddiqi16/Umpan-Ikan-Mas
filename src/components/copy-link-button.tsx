"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Link2 } from "lucide-react";

type StatusSalin = "idle" | "tersalin" | "gagal";

/**
 * Tombol "Salin tautan" untuk membagikan halaman: menyalin alamat absolut
 * halaman ke clipboard, lalu memberi umpan balik singkat pada tombolnya
 * sendiri ("Tautan disalin"). Alamat disusun dari origin yang sedang dibuka
 * pengunjung, jadi selalu menunjuk domain yang benar (produksi/pratinjau).
 * Pratinjau gambar saat tautan ditempel ke platform lain diatur metadata
 * Open Graph halaman (foto utama resep), bukan komponen ini.
 */
export function CopyLinkButton({ path, className = "" }: { path: string; className?: string }) {
  const [status, setStatus] = useState<StatusSalin>("idle");
  const timer = useRef<number | null>(null);

  useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
  }, []);

  async function salinTautan() {
    const url = `${window.location.origin}${path}`;
    let sukses = false;
    try {
      await navigator.clipboard.writeText(url);
      sukses = true;
    } catch {
      // Mundur ke cara lama untuk peramban/konteks tanpa akses Clipboard API.
      const area = document.createElement("textarea");
      area.value = url;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      try {
        sukses = document.execCommand("copy");
      } catch {
        sukses = false;
      }
      area.remove();
    }
    setStatus(sukses ? "tersalin" : "gagal");
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setStatus("idle"), 2200);
  }

  return (
    <button
      type="button"
      onClick={() => void salinTautan()}
      aria-live="polite"
      className={`${className}${status === "tersalin" ? " border-[#cfe0c8] bg-[#f0f6ec] text-[#3e6b41]" : ""}`}
    >
      {status === "tersalin" ? <Check size={15} aria-hidden="true" /> : <Link2 size={15} aria-hidden="true" />}
      {status === "tersalin" ? "Tautan disalin" : status === "gagal" ? "Gagal menyalin" : "Salin tautan"}
    </button>
  );
}
