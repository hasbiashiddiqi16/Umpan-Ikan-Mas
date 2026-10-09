import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#fbfcf9] px-5 py-12">
      <section className="w-full max-w-lg rounded-[28px] border border-[#e4e9e1] bg-white p-7 text-center shadow-[0_20px_60px_rgba(35,52,37,.08)] sm:p-10">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#edf2e9] text-[#486848]"><Search size={23} /></span>
        <p className="mt-5 text-xs font-bold uppercase tracking-[.16em] text-[#899186]">404 · Spot belum ditemukan</p>
        <h1 className="mt-2 text-2xl font-black text-[#29392d]">Halaman ini belum ada.</h1>
        <p className="mt-2 text-sm leading-6 text-[#778176]">Mungkin tautannya berubah. Yuk kembali jelajahi racikan dan cerita pemancing.</p>
        <Link href="/" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#294b34] px-5 text-sm font-bold text-white hover:bg-[#203d29]"><ArrowLeft size={15} /> Ke beranda</Link>
      </section>
    </main>
  );
}
