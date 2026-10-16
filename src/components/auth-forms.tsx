"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fish, LoaderCircle, LogIn, Mail, UserRoundPlus } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { supabasePublicConfig, SUPABASE_ENV_HINT } from "@/utils/supabase/env";
import { pesanGalatAuth, tujuanAman } from "@/lib/auth-shared";

const inputClass = "min-h-12 w-full rounded-xl border border-[#e4e9e2] bg-white px-3.5 text-sm text-[#334436] outline-none transition placeholder:text-[#a0a79e] focus:border-[#748f70] focus:ring-4 focus:ring-[#345d3a]/10";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.3-2.2H12v4.3h6.5a5.6 5.6 0 0 1-2.4 3.3v2.7h3.9c2.3-2.1 3.5-5.2 3.5-9.1z" />
      <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-2.7c-1 .7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.3v2.8A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.4 14.7A7.2 7.2 0 0 1 5 12c0-.9.1-1.8.4-2.7V7.5H1.3a12 12 0 0 0 0 9l4.1-1.8z" />
      <path fill="#EA4335" d="M12 4.7c1.8 0 3 .8 3.7 1.4l3.3-3.2C17.9 1.1 15.2 0 12 0A12 12 0 0 0 1.3 7.5l4.1 2.8C6.3 6.8 8.9 4.7 12 4.7z" />
    </svg>
  );
}

function Kerangka({ judul, subjudul, children, kaki }: { judul: string; subjudul: string; children: React.ReactNode; kaki: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-md">
      <section className="rounded-[28px] border border-[#e6eae3] bg-white p-6 shadow-[0_18px_50px_rgba(38,55,40,.08)] sm:p-8">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#eef3ea] text-[#3f6247]"><Fish size={24} /></span>
        <h1 className="mt-5 text-2xl font-black tracking-tight text-[#223528]">{judul}</h1>
        <p className="mt-2 text-sm leading-6 text-[#636d63]">{subjudul}</p>
        <div className="mt-6">{children}</div>
        <div className="mt-6 border-t border-[#eef0ea] pt-5 text-center text-sm text-[#636d63]">{kaki}</div>
      </section>
    </div>
  );
}

export function MasukForm({ next, pesan }: { next?: string; pesan?: string }) {
  const router = useRouter();
  const tujuan = tujuanAman(next);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(() => (pesan ? pesan.slice(0, 300) : ""));
  const [sibuk, setSibuk] = useState(false);
  const tersedia = Boolean(supabasePublicConfig());

  async function denganGoogle() {
    setError("");
    if (!tersedia) { setError(SUPABASE_ENV_HINT); return; }
    setSibuk(true);
    const supabase = createClient();
    const { error: galat } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(tujuan)}` },
    });
    if (galat) { setSibuk(false); setError(pesanGalatAuth(galat.message)); }
  }

  async function kirim(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!tersedia) { setError(SUPABASE_ENV_HINT); return; }
    setSibuk(true);
    const supabase = createClient();
    const { error: galat } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setSibuk(false);
    if (galat) { setError(pesanGalatAuth(galat.message)); return; }
    router.replace(tujuan);
    router.refresh();
  }

  return (
    <Kerangka judul="Selamat datang kembali" subjudul="Masuk untuk membagikan resep, melihat ulasanmu, dan menyinkronkan favorit antarperangkat."
      kaki={<>Belum punya akun? <Link href={`/daftar?next=${encodeURIComponent(tujuan)}`} className="font-bold text-[#2f5b3a] hover:underline">Daftar gratis</Link></>}>
      {!tersedia ? <p className="rounded-xl bg-[#fdf3e3] px-4 py-3 text-sm leading-6 text-[#7a5a17]">{SUPABASE_ENV_HINT}</p> : null}
      <button type="button" onClick={denganGoogle} disabled={sibuk} className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-[#dfe5dc] bg-white px-4 text-sm font-bold text-[#334436] transition hover:bg-[#f6f8f4] disabled:opacity-60">
        <GoogleIcon /> Lanjutkan dengan Google
      </button>
      <div className="my-5 flex items-center gap-3 text-xs font-semibold text-[#8a938a]"><span className="h-px flex-1 bg-[#e6eae3]" />atau dengan email<span className="h-px flex-1 bg-[#e6eae3]" /></div>
      <form onSubmit={kirim} className="space-y-4">
        <label className="block"><span className="mb-1.5 block text-sm font-bold text-[#344638]">Email</span><input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@email.com" className={inputClass} /></label>
        <label className="block"><span className="mb-1.5 block text-sm font-bold text-[#344638]">Kata sandi</span><input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Kata sandimu" className={inputClass} /></label>
        {error ? <p role="alert" className="rounded-xl bg-[#fbf0ec] px-4 py-3 text-sm leading-6 text-[#8a4433]">{error}</p> : null}
        <button type="submit" disabled={sibuk} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#294b34] px-5 text-sm font-bold text-white transition hover:bg-[#223f2b] disabled:opacity-60">
          {sibuk ? <LoaderCircle size={17} className="animate-spin" /> : <LogIn size={17} />} Masuk
        </button>
      </form>
      <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-[#7c857c]"><Mail size={14} className="mt-0.5 shrink-0" /> Lupa kata sandi? Buka halaman daftar ulang tidak perlu — cukup hubungi kami lewat halaman komunitas bila terkunci.</p>
    </Kerangka>
  );
}

export function DaftarForm({ next }: { next?: string }) {
  const router = useRouter();
  const tujuan = tujuanAman(next);
  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [sibuk, setSibuk] = useState(false);
  const tersedia = Boolean(supabasePublicConfig());

  async function denganGoogle() {
    setError("");
    if (!tersedia) { setError(SUPABASE_ENV_HINT); return; }
    setSibuk(true);
    const supabase = createClient();
    const { error: galat } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(tujuan)}` },
    });
    if (galat) { setSibuk(false); setError(pesanGalatAuth(galat.message)); }
  }

  async function kirim(event: FormEvent) {
    event.preventDefault();
    setError(""); setInfo("");
    if (nama.trim().length < 2) { setError("Isi nama tampil minimal 2 karakter."); return; }
    if (password.length < 6) { setError("Kata sandi minimal 6 karakter."); return; }
    if (!tersedia) { setError(SUPABASE_ENV_HINT); return; }
    setSibuk(true);
    const supabase = createClient();
    const { data, error: galat } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { display_name: nama.trim() },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(tujuan)}`,
      },
    });
    setSibuk(false);
    if (galat) { setError(pesanGalatAuth(galat.message)); return; }
    if (data.session) { router.replace(tujuan); router.refresh(); return; }
    setInfo("Pendaftaran diterima! Kami mengirim tautan konfirmasi ke emailmu. Klik tautan itu, lalu masuk untuk mulai membagikan resep.");
  }

  return (
    <Kerangka judul="Buat akun gratis" subjudul="Satu akun untuk membagikan racikan andalanmu, menyimpan ulasan, dan favorit yang tersinkron di semua perangkat."
      kaki={<>Sudah punya akun? <Link href={`/masuk?next=${encodeURIComponent(tujuan)}`} className="font-bold text-[#2f5b3a] hover:underline">Masuk di sini</Link></>}>
      {!tersedia ? <p className="rounded-xl bg-[#fdf3e3] px-4 py-3 text-sm leading-6 text-[#7a5a17]">{SUPABASE_ENV_HINT}</p> : null}
      <button type="button" onClick={denganGoogle} disabled={sibuk} className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-[#dfe5dc] bg-white px-4 text-sm font-bold text-[#334436] transition hover:bg-[#f6f8f4] disabled:opacity-60">
        <GoogleIcon /> Daftar dengan Google
      </button>
      <div className="my-5 flex items-center gap-3 text-xs font-semibold text-[#8a938a]"><span className="h-px flex-1 bg-[#e6eae3]" />atau dengan email<span className="h-px flex-1 bg-[#e6eae3]" /></div>
      <form onSubmit={kirim} className="space-y-4">
        <label className="block"><span className="mb-1.5 block text-sm font-bold text-[#344638]">Nama tampil</span><input type="text" required autoComplete="name" maxLength={100} value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Mis. Budi Pemancing" className={inputClass} /></label>
        <label className="block"><span className="mb-1.5 block text-sm font-bold text-[#344638]">Email</span><input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@email.com" className={inputClass} /></label>
        <label className="block"><span className="mb-1.5 block text-sm font-bold text-[#344638]">Kata sandi</span><input type="password" required autoComplete="new-password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimal 6 karakter" className={inputClass} /></label>
        {error ? <p role="alert" className="rounded-xl bg-[#fbf0ec] px-4 py-3 text-sm leading-6 text-[#8a4433]">{error}</p> : null}
        {info ? <p role="status" className="rounded-xl bg-[#eef6ec] px-4 py-3 text-sm leading-6 text-[#2f5b3a]">{info}</p> : null}
        <button type="submit" disabled={sibuk} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#294b34] px-5 text-sm font-bold text-white transition hover:bg-[#223f2b] disabled:opacity-60">
          {sibuk ? <LoaderCircle size={17} className="animate-spin" /> : <UserRoundPlus size={17} />} Daftar sekarang
        </button>
      </form>
    </Kerangka>
  );
}
