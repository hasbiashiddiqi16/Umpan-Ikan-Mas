/**
 * Penampung khusus dashboard admin (rute dinamis di balik login). Halaman
 * publik tidak memakai `loading.tsx` sama sekali — kontennya sudah lengkap
 * di HTML awal berkat SSG/ISR — tetapi navigasi antarhalaman admin tetap
 * butuh umpan balik selama data dimuat.
 */
export default function Loading() {
  return (
    <main className="mx-auto min-h-[60vh] max-w-6xl px-5 py-10 sm:px-8" aria-busy="true" aria-live="polite">
      <span className="sr-only">Memuat dashboard UMPAN MAS…</span>
      <div aria-hidden="true">
        <div className="mb-8 h-9 w-64 animate-pulse rounded-lg bg-[#e9eee6]" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-32 animate-pulse rounded-[20px] bg-[#edf1eb]" />
          ))}
        </div>
        <div className="mt-4 h-64 animate-pulse rounded-[20px] bg-[#edf1eb]" />
      </div>
    </main>
  );
}
