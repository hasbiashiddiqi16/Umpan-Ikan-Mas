export default function Loading() {
  return (
    <main className="mx-auto min-h-screen max-w-7xl px-5 py-12 sm:px-8" aria-busy="true" aria-live="polite">
      <span className="sr-only">Memuat racikan UMPAN MAS…</span>
      <div className="mb-8 h-10 w-56 animate-pulse rounded-xl bg-[#e8ede5]" />
      <div className="mb-10 h-5 max-w-xl animate-pulse rounded-lg bg-[#edf1eb]" />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((item) => <div key={item} className="overflow-hidden rounded-[22px] border border-[#e8ebe5] bg-white"><div className="h-[190px] animate-pulse bg-[#e9eee6] sm:h-[205px]" /><div className="space-y-4 p-5"><div className="h-5 w-2/3 animate-pulse rounded bg-[#e9eee6]" /><div className="h-4 w-1/2 animate-pulse rounded bg-[#f0f3ed]" /><div className="h-9 w-full animate-pulse rounded-xl bg-[#f0f3ed]" /></div></div>)}</div>
    </main>
  );
}
