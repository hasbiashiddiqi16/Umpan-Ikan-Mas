/**
 * Kerangka penampung (skeleton) untuk status loading.
 *
 * Halaman publik dirender di server (SSG/ISR), jadi skeleton ini hanya muncul
 * sebentar saat navigasi sisi klien menunggu muatan RSC — bukan splash yang
 * menutupi konten yang sebenarnya sudah tersedia. Bentuknya meniru tata letak
 * aslinya agar tidak ada pergeseran tata letak (CLS) saat konten tiba.
 * Blok berdenyut selalu `aria-hidden`. Skeleton di sini hanya dipakai
 * sebagai penampung pulau `Suspense` (bagian yang menunggu rating dari
 * database) — bukan lagi sebagai layar loading satu halaman penuh, supaya
 * konten statis selalu tampil lebih dulu.
 */

const blok = "animate-pulse rounded bg-[#e9eee6]";
const blokMuda = "animate-pulse rounded bg-[#f0f3ed]";

/** Meniru `RecipeCard`: foto 190/205px, judul, badge meta, dan kaki kartu. */
export function RecipeCardSkeleton() {
  return (
    <div aria-hidden="true" className="overflow-hidden rounded-[22px] border border-[#e8ebe5] bg-white">
      <div className="h-[190px] animate-pulse bg-[#e9eee6] sm:h-[205px]" />
      <div className="space-y-4 p-5">
        <div className={`${blok} h-5 w-2/3`} />
        <div className={`${blokMuda} h-4 w-1/2`} />
        <div className="flex gap-1.5">
          <div className={`${blokMuda} h-7 w-[106px] rounded-full`} />
          <div className={`${blokMuda} h-7 w-[106px] rounded-full`} />
          <div className={`${blokMuda} hidden h-7 w-[106px] rounded-full min-[440px]:block`} />
        </div>
        <div className={`${blokMuda} h-11 w-full rounded-xl`} />
      </div>
    </div>
  );
}


