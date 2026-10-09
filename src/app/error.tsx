"use client";

import Link from "next/link";
import { RefreshCw, ShieldAlert } from "lucide-react";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#fbfcf9] px-5 py-12">
      <section className="w-full max-w-lg rounded-[28px] border border-[#e4e9e1] bg-white p-7 text-center shadow-[0_20px_60px_rgba(35,52,37,.08)] sm:p-10">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#f7eee5] text-[#9b6943]"><ShieldAlert size={25} /></span>
        <p className="mt-5 text-xs font-bold uppercase tracking-[.16em] text-[#899186]">Ada kendala sebentar</p>
        <h1 className="mt-2 text-2xl font-black text-[#29392d]">Terjadi kesalahan.</h1>
        <p className="mt-2 text-sm leading-6 text-[#778176]">Silakan coba lagi. Racikan dan halaman lainnya tetap bisa kamu jelajahi.</p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row"><button type="button" onClick={() => reset()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#294b34] px-5 text-sm font-bold text-white hover:bg-[#203d29]"><RefreshCw size={15} /> Coba lagi</button><Link href="/" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#e4e9e1] px-5 text-sm font-bold text-[#536253] hover:bg-[#f6f8f4]">Kembali ke beranda</Link></div>
      </section>
    </main>
  );
}
