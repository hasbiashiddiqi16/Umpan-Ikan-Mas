import Link from "next/link";
import type { ReactNode } from "react";
import { Search, Star } from "lucide-react";

export function Badge({ children, tone = "sage", className = "" }: { children: ReactNode; tone?: "sage" | "gold" | "dark" | "cream"; className?: string }) {
  const tones = {
    sage: "bg-[#e7f0e7] text-[#34583b]",
    gold: "bg-[#fbf0d5] text-[#8a5d10]",
    dark: "bg-[#193a2c] text-white",
    cream: "bg-[#f4f0e7] text-[#5d625b]",
  };
  return <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${tones[tone]} ${className}`}>{children}</span>;
}

export function Rating({ value, count, compact = false }: { value: number; count?: number; compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm" aria-label={`Rating ${value.toFixed(1)} dari 5${count ? `, ${count} ulasan` : ""}`}>
      <Star size={14} fill="currentColor" className="text-[#d6a344]" aria-hidden="true" />
      <span className="font-bold text-[#27332a]">{value.toFixed(1)}</span>
      {count !== undefined && !compact && <span className="text-[#7b817a]">({count})</span>}
    </span>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  action,
  light = false,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  light?: boolean;
}) {
  return (
    <div className="mb-7 flex items-end justify-between gap-5">
      <div className="max-w-2xl">
        {eyebrow && <p className={`mb-2 text-xs font-bold uppercase tracking-[.16em] ${light ? "text-[#c6d9c4]" : "text-[#718272]"}`}>{eyebrow}</p>}
        <h2 className={`text-2xl font-extrabold tracking-tight sm:text-[2rem] ${light ? "text-white" : "text-[#1d2d22]"}`}>{title}</h2>
        {subtitle && <p className={`mt-2 max-w-xl text-sm leading-6 sm:text-base ${light ? "text-white/70" : "text-[#6f766f]"}`}>{subtitle}</p>}
      </div>
      {action && <div className="hidden shrink-0 sm:block">{action}</div>}
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Cari resep, bahan, atau essen...",
  label = "Cari resep",
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
}) {
  return (
    <label className={`flex min-h-12 items-center gap-3 rounded-2xl border border-[#e3e7df] bg-white px-4 transition focus-within:border-[#718d69] focus-within:ring-4 focus-within:ring-[#496c4f]/10 ${className}`}>
      <Search size={18} className="shrink-0 text-[#869086]" aria-hidden="true" />
      <span className="sr-only">{label}</span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="w-full bg-transparent text-sm text-[#243328] outline-none placeholder:text-[#a2a8a0]"
      />
    </label>
  );
}

export function EmptyState({ title = "Umpan tidak ditemukan.", description = "Coba kata kunci lain seperti ‘kroto’, ‘pelet’, atau ‘umpan putih’." }: { title?: string; description?: string }) {
  return (
    <div className="col-span-full flex min-h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-[#d9dfd7] bg-[#fbfcf9] px-6 py-12 text-center">
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-[#edf2e9] text-2xl" aria-hidden="true">🎣</div>
      <h3 className="text-lg font-bold text-[#26372b]">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-[#737b72]">{description}</p>
      <Link href="/katalog" className="mt-5 text-sm font-bold text-[#315c3b] underline-offset-4 hover:underline">Jelajahi katalog</Link>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="mt-20 bg-[#172d22] text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-8 md:grid-cols-[1.5fr_1fr_1fr] md:py-16">
        <div>
          <Link href="/" className="inline-flex items-center gap-2 text-lg font-extrabold tracking-tight"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#dcae55] text-lg">🎣</span> UMPAN MAS</Link>
          <p className="mt-4 max-w-sm text-sm leading-6 text-white/65">Teman racik dan teman mancing. Temukan umpan ikan mas yang relevan dengan kondisi di kolammu.</p>
        </div>
        <div>
          <p className="text-sm font-bold">Jelajahi</p>
          <div className="mt-4 grid gap-3 text-sm text-white/65">
            <Link className="hover:text-white" href="/katalog">Katalog umpan</Link>
            <Link className="hover:text-white" href="/ai-umpan">AI Umpan</Link>
            <Link className="hover:text-white" href="/sistem-pakar">Sistem Pakar & racik bahan</Link>
            <Link className="hover:text-white" href="/cuaca">Umpan berdasarkan cuaca</Link>
            <Link className="hover:text-white" href="/provinsi">Umpan per provinsi</Link>
          </div>
        </div>
        <div>
          <p className="text-sm font-bold">UMPAN MAS</p>
          <p className="mt-4 text-sm leading-6 text-white/65">Berbagi pengalaman, bukan janji hasil. Kondisi tiap kolam dan kebiasaan ikan bisa berbeda.</p>
          <Link className="mt-4 inline-flex text-xs font-semibold text-white/55 transition hover:text-white" href="/dashboard">Content Studio →</Link>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-7xl px-5 py-5 text-xs text-white/50 sm:px-8">© 2025 UMPAN MAS · Dibuat untuk cerita mancing berikutnya.</p>
      </div>
    </footer>
  );
}
