# UMPAN MAS

Platform rekomendasi racikan umpan ikan mas dengan katalog, komunitas, dan Content Studio.

## Konfigurasi server

Aplikasi menggunakan PostgreSQL melalui Drizzle ORM. Impor route API saat build tidak membuka koneksi database.

- **Di Netlify**: koneksi tersedia otomatis lewat `NETLIFY_DB_URL` yang disuntikkan Netlify, jadi tidak ada yang perlu diatur.
- **Di host lain** (misalnya Vercel): setel `DATABASE_URL` dengan connection string basis data yang sama (salin dari Netlify → Project → Database → Connection string). Tanpa variabel itu, fitur yang memakai database — ulasan, konten resep, analitik, dan unggahan logo/poster — tidak berfungsi, sementara halaman publik tetap tampil dengan data bawaan.

Skema tabel berada di `db/schema.ts`. Migrasi di `netlify/database/migrations` diterapkan otomatis oleh Netlify saat deploy, sebelum aplikasi dipublikasikan. Host lain tidak menerapkannya, jadi jalankan sekali:

```bash
DATABASE_URL="postgres://…" npm run db:migrate
```

Perintah itu aman diulang: nama migrasi dicatat di tabel `cms_migrations`, dan basis data yang sudah dimigrasi Netlify tetap dikenali. Setelah mengubah skema, buat migrasi baru dengan `npx drizzle-kit generate --name nama_perubahan`.

### Memakai PostgreSQL Supabase sebagai basis data

Supabase kini hanya menerbitkan alamat **IPv6** untuk koneksi langsung (`db.<project-ref>.supabase.co`). Vercel dan host ber-IPv4 lain tidak bisa menjangkaunya — gejalanya `getaddrinfo ENOTFOUND db.<ref>.supabase.co` di `/api/health`. Pakai **Session pooler** yang IPv4:

```
postgresql://postgres.<project-ref>:<PASSWORD>@aws-0-<wilayah>.pooler.supabase.com:5432/postgres?sslmode=require
```

String itu disalin dari Supabase → tombol **Connect** → *Session pooler* (password basis data, bukan kunci API). Tempel apa adanya sebagai `DATABASE_URL` di host Anda, lalu deploy ulang — tabel `cms_*` dibuat otomatis saat deploy (lihat bagian berikutnya).

Aplikasi menyesuaikan connection string sendiri: host non-lokal mendapat `sslmode=require`, dan khusus host Supabase ditambah `uselibpqcompat=true` karena sertifikat Supabase ditandatangani CA internal yang tidak ada di trust store Node — tanpa itu `pg` menolak koneksi dengan "self-signed certificate in certificate chain". TLS tetap aktif, hanya verifikasi sertifikat yang dilewati (semantik `sslmode=require` di libpq). `sslmode=disable`, `sslmode=verify-full`, dan `sslmode=verify-ca` yang Anda tulis sendiri tidak pernah diubah. `/api/health` melaporkan hasilnya di kolom `ssl`: `required` (terverifikasi), `required-unverified` (Supabase), `disabled`, atau `default`.

### Menerapkan migrasi

Migrasi diterapkan otomatis setiap deploy: skrip `vercel-build` pada `package.json` menjalankan `node scripts/migrate.mjs --optional` sebelum `next build`, jadi Vercel membuat/memperbarui tabel `cms_*` sendiri. Mode `--optional` membuat deploy tetap berhasil bila `DATABASE_URL` belum disetel atau basis data sedang tidak dapat dihubungi (hanya dicatat sebagai peringatan).

Menjalankan manual — aman diulang, migrasi yang sudah ada dilewati:

```bash
DATABASE_URL="postgresql://…" npm run db:migrate
```

Tanpa Node sama sekali? Salin isi berkas `UMPAN-MAS-buat-tabel.sql` (dibuat dari migrasi yang sama) ke Supabase → SQL Editor → Run.

Buka `/api/health` untuk memeriksa kesiapan: endpoint itu melaporkan nama variabel lingkungan yang dipakai, jumlah baris tiap tabel, dan langkah perbaikan bila koneksi atau tabel belum siap — tanpa membocorkan rahasia.

## Supabase

Paket `@supabase/supabase-js` dan `@supabase/ssr` sudah terpasang, tetapi aplikasi ini **tetap berjalan tanpa Supabase**: bila kedua variabel di bawah kosong, halaman publik, dashboard, dan seluruh route API bekerja seperti biasa.

Setel dua variabel ini di `.env.local` (pengembangan) dan di dashboard hosting (produksi):

```bash
NEXT_PUBLIC_SUPABASE_URL="https://<project-ref>.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_…"
```

Kunci itu memang dirancang untuk dipakai di peramban — jangan pernah memakai kunci rahasia (service role / secret key) pada variabel `NEXT_PUBLIC_*`.

Berkas pendukung mengikuti struktur resmi Supabase di dalam `src/`:

- `src/utils/supabase/env.ts` — membaca dan memvalidasi variabel lingkungan. Kunci `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` dipakai lebih dulu, dengan cadangan `NEXT_PUBLIC_SUPABASE_ANON_KEY` untuk proyek lama.
- `src/utils/supabase/client.ts` — klien untuk komponen peramban (`createClient()`).
- `src/utils/supabase/server.ts` — klien untuk Server Component, Server Action, dan route handler (`await createClient()`).
- `src/utils/supabase/middleware.ts` — `updateSession(request)`: memperbarui cookie sesi Supabase pada setiap permintaan.
- `src/proxy.ts` — memanggil `updateSession` untuk semua halaman (kecuali berkas statis). Next.js 16 mengganti nama konvensi `middleware.ts` menjadi `proxy.ts`, tugas dan urutan kerjanya sama.

Di sisi basis data, aplikasi ini memakai PostgreSQL miliknya sendiri melalui Drizzle (lihat bagian sebelumnya), bukan Postgres Supabase — jadi tidak ada tabel `todos` contoh dan tidak ada migrasi Supabase di sini. Bila nanti tabel Supabase mulai dipakai lewat PostgREST, jalankan RLS di setiap tabel dan buat kebijakan sesuai kebutuhan.

Untuk memastikan konfigurasi benar, jalankan:

```bash
npm run supabase:check   # atau: node scripts/supabase-check.mjs
```

Perintah itu memeriksa variabel lingkungan, format kunci, ketersediaan endpoint REST, dan (bila `DATABASE_URL` disetel) koneksi PostgreSQL — nilainya tidak pernah ditampilkan, hanya statusnya.

## Admin Content Studio

Buka `/login` untuk masuk ke dashboard. Halaman dashboard dan endpoint `/api/admin/*` dilindungi oleh sesi admin HttpOnly yang kedaluwarsa setelah 8 jam.

Atur `ADMIN_PASSWORD` sebagai environment variable server-side sebelum menjalankan aplikasi atau deploy. Untuk pengembangan lokal, salin `.env.example` menjadi `.env.local` lalu isi password yang diinginkan. Di Netlify, tambahkan `ADMIN_PASSWORD` pada environment variables dengan scope yang mencakup deploy production. Jangan gunakan awalan `NEXT_PUBLIC_` dan jangan commit file `.env.local`.

`ADMIN_SESSION_SECRET` opsional; jika tidak diatur, password admin digunakan untuk menandatangani sesi. Gunakan password yang panjang dan unik untuk deployment publik.

Kata sandi dashboard juga bisa diganti tanpa deploy dari **Studio → Keamanan** di dalam dashboard. Kata sandi baru disimpan sebagai hash scrypt di tabel `cms_settings` (kunci `admin_password`) dan menimpa `ADMIN_PASSWORD` selama ada. Setiap penggantian menaikkan nomor versi yang ikut ditanamkan ke cookie sesi, sehingga sesi di perangkat lain otomatis berakhir sementara perangkat yang mengganti tetap masuk. Tombol "Pakai password server lagi" menghapus penimpa tersebut sehingga `ADMIN_PASSWORD` berlaku kembali. Bila Anda lupa kata sandi yang dipasang di dashboard: ubah `ADMIN_PASSWORD` di host lalu deploy ulang, masuk dengan nilai baru itu, dan pasang kata sandi pilihan Anda lagi. Jangan menghapus `ADMIN_PASSWORD` dari environment — ia adalah kunci cadangan sekaligus penanda tangan sesi bila `ADMIN_SESSION_SECRET` kosong.

Di `/dashboard/konten`, gunakan **Sinkronkan katalog** setelah deploy untuk memasukkan atau memperbarui 200 resep sumber dan 5.000 ulasan contoh ke CMS. Sinkronisasi aman diulangi: setiap ulasan katalog memiliki kunci unik sehingga tidak diduplikasi. Karena sinkronisasi mengikuti data sumber, perubahan manual pada resep sumber dengan slug yang sama akan diperbarui kembali ke versi katalog terbaru.

## Istilah jenis kolam: "Galatama"

Situs memakai istilah **Galatama** untuk kolam galatama (jenis kolam yang memancingkan ikan mas hasil tebaran, bukan kolam harian atau kolam lomba). Sebelumnya situs memakai sebutan "Galat", yang tidak dikenal di dunia pemancingan; sebutan itu sudah tidak dipakai lagi di antarmuka.

Sebutan lama tetap **dibaca** agar data yang sudah tersimpan (resep CMS dan ulasan) tidak hilang:

- `normalizeFishingType` / `normalizeFishingTypes` di `src/data/recipes.ts` mengubah "Galat" menjadi "Galatama" saat data dibaca; `normalizeFishingText` melakukan hal yang sama untuk kalimat seperti "Kolam galat".
- Validasi penyimpanan (`src/lib/cms.ts`, API ulasan) masih menerima "Galat" dari formulir/tautan lama, tetapi selalu menuliskan "Galatama".
- Migrasi `netlify/database/migrations/20261014060000_rename_galat_to_galatama` merapikan nilai yang sudah ada di basis data (kategori, larik jenis, teks syarat, ringkasan resep, dan jenis ulasan). Migrasi ini aman dijalankan berulang karena hanya mengganti kata "Galat" utuh, bukan bagian dari "Galatama".

## Takaran kroto dan bahan amis

Setiap resep katalog punya dua tambahan yang sama, keduanya bertanda `optional` pada data bahan:

- **Kroto `1 ons`** (bukan gram) mengikuti kebiasaan pemancing. Resep yang memang berbasis kroto — nama resep menyebut kroto, atau resep inti yang bahannya memuat kroto seperti Sarden Susu Premium — memakai kroto sebagai bahan inti. Resep lain, termasuk resep turunan yang mewarisi bahan template, memakai kroto sebagai **tambahan opsional**.
- **Ikan tuna kaleng amis `2 sdm`** bermerek **Deho / Sunbell Katsuo**, plus **minyak ikan amis `1 sdm`**. Baris tuna dilewati bila resep sudah memakai ikan kalengan (mis. Sarden).

Bahan bertanda `optional` dipisahkan ke bagian **Tambahan opsional** di halaman resep dan tidak dihitung sebagai pembeda pada pencarian maupun skor kecocokan bahan di Sistem Pakar, karena tersedia di semua resep. Catatan `1 ons ≈ 100 g` tampil di bawah bagian tersebut dan pada `recipeIngredient` di structured data. Di Content Studio, kolom keempat pada baris bahan menandai opsional (`Kroto | Segar | 1 ons | opsional`) agar penanda ini bertahan saat resep disunting lewat dashboard.

## Popup sambutan pengunjung baru

Kunjungan pertama menampilkan popup sambutan (`src/components/promo-modal.tsx`) yang **seluruh isinya berupa gambar**: ucapan selamat datang, ringkasan isi website, angka statistik, sorotan fitur, dan catatan "tampil sekali" semuanya sudah menyatu di dalam poster.

Popup ini murni informasi awal, jadi:

- **Tidak bisa di-scroll.** Tidak ada area scroll di dalam popup, dan tinggi poster dibatasi sisa tinggi layar sehingga gambar selalu tampil utuh. Ukurannya dihitung ulang saat layar berubah ukuran atau diputar.
- **Aksinya hanya menutup**: ikon silang di kanan atas, klik/ketuk di luar kartu, atau tombol `Esc` (padanan papan ketik untuk tombol tutup). Tidak ada tombol ajakan atau tautan di dalamnya — pengunjung menutup popup lalu menjelajah dari navigasi biasa.

**Berkas gambar** (`public/images/`, dirender oleh `scripts/build-promo-poster.mjs` dari `promo-welcome.jpg`)

| Berkas | Ukuran | Dipakai untuk |
| --- | --- | --- |
| `promo-welcome-mobile.jpg` | 860x1216 (2x dari 430 px) | layar < 640 px, teks di bawah gambar |
| `promo-welcome-desktop.jpg` | 1640x1040 (2x dari 820 px) | layar >= 640 px, teks di sisi kiri gambar |

**Aksesibilitas.** Pembaca layar tetap mendapat isi poster sebagai teks (judul dan ringkasan tersembunyi yang dipakai `aria-labelledby`/`aria-describedby`). Scroll halaman dikunci selama popup terbuka, fokus keyboard jatuh ke tombol tutup dan tertahan di dalam dialog, lalu kembali ke elemen sebelumnya setelah ditutup.

**Kapan muncul**

- Tampil **sekali per perangkat**, dibuka setelah halaman tenang dan ditunda selama pengunjung masih aktif berinteraksi.
- Tidak muncul di `/dashboard` dan `/login` (termasuk saat dipaksa lewat `?sambutan=1`).
- Penanda disimpan berlapis: `localStorage` (kunci `umpan-mas-promo-welcome-seen-v1`), lalu `sessionStorage`, lalu memori. Jadi kalau penyimpanan diblokir — mode privat atau halaman dibuka di dalam iframe yang di-sandbox — popup tetap tampil sekali per muat halaman, bukan malah tidak pernah muncul.

**Melihat ulang untuk pratinjau**

Tambahkan `?sambutan=1` pada alamat yang dibuka (mis. `/?sambutan=1` atau `/katalog?sambutan=1`) untuk memaksa popup tampil walau penanda sudah tersimpan. Cara lain: hapus kunci `umpan-mas-promo-welcome-seen-v1` dari penyimpanan peramban lalu muat ulang.

**Mengubah isi popup.** Teksnya dibakar ke gambar, jadi ubah salinan di `scripts/build-promo-poster.mjs` lalu jalankan ulang skrip (butuh `npm install --no-save @napi-rs/canvas`). Angka statistik di poster juga statis — perbarui di skrip saat katalog bertambah. Skrip otomatis memeriksa setiap baris muat di kolomnya dan kontras teks di atas latar poster minimal 4,5:1.

## Izin lokasi (opsional)

Kolom lokasi tidak lagi memakai nilai bawaan seperti "Jawa Barat". Tanpa izin lokasi, form dibiarkan kosong dan pengguna mengisinya manual.

- **Banner di beranda** muncul saat pengguna belum pernah memutuskan. Pilihan "Izinkan lokasi" menjalankan deteksi; "Nanti saja" menyimpan keputusan menolak sehingga banner tidak muncul lagi dan form tetap kosong.
- **Tombol "Gunakan lokasi saya"** tersedia di setiap form berisi lokasi: Cari Umpan di beranda, AI Umpan, Sistem Pakar, filter katalog, dan form ulasan. Setelah izin diberikan, tombol berubah menjadi chip lokasi dengan aksi **Perbarui** dan **Lupakan**.
- **Form menyesuaikan lokasi**: provinsi terisi otomatis. Nama kota ikut terisi (dan dipakai filter kota katalog) hanya bila lokasi dekat dengan titik referensi kota (radius 35 km di `src/data/province-geo.ts`) dan akurasi perangkat lebih baik dari radius tersebut. Pilihan manual selalu menang dan tidak ditimpa deteksi berikutnya.
- **Deteksi berjalan sepenuhnya di perangkat.** Koordinat GPS diterjemahkan menjadi provinsi/kota memakai daftar titik referensi kota di `src/data/province-geo.ts` (perkiraan pusat kota/kabupaten, bukan batas administrasi resmi). Tidak ada permintaan jaringan atau pengiriman koordinat ke server, analitik, maupun CMS. Hasil deteksi disimpan di `localStorage` (`umpan-mas-location-consent`, `umpan-mas-location-place-v1`) dan dapat dihapus lewat tombol **Lupakan**.
- **Izin browser yang sudah pernah diberikan** (misalnya sebelum fitur ini ada) dipakai lewat `LocationPermissionSync` di root layout: form langsung menyesuaikan lokasi tanpa prompt ulang, dan pilihan "Nanti saja" tetap dihormati.
- Kegagalan deteksi ditampilkan dengan pesan spesifik: perangkat tidak mendukung, koneksi tidak HTTPS, izin ditolak, waktu habis, atau lokasi diblokir karena halaman tersemat (iframe) — pada kasus terakhir pengguna diarahkan membuka situs di tab baru atau mengisi lokasi manual.

## SEO dan performa

- **Aset merek**: logo berada di `public/images/logo-umpan-mas.png` (512px, latar transparan) dan dirujuk lewat `src/lib/brand.ts` agar hanya ada satu sumber. Favicon memakai konvensi Next.js: `src/app/icon.png` (256px) dan `src/app/apple-icon.png` (180px, diratakan ke putih karena iOS tidak mendukung transparansi). Logo juga dikirim sebagai `logo`/`image` pada structured data `Organization` agar Google dapat menampilkan identitas merek.
- Metadata halaman mencakup judul/deskripsi, canonical, Open Graph, Twitter Card, dan robots. Atur `NEXT_PUBLIC_SITE_URL` ke origin domain produksi kustom di Netlify bila domain tersebut berbeda dari `URL` bawaan Netlify; tanpa origin produksi, canonical absolut dan URL sitemap sengaja tidak diarahkan ke `localhost`.
- `/robots.txt` mengarahkan crawler ke `/sitemap.xml`. Sitemap memuat halaman publik, resep katalog, 38 halaman provinsi, dan resep CMS berstatus `published` saja. Draft, dashboard, API, dan profil lokal tidak ditujukan untuk indeks pencarian.
- Structured data memakai `Organization`/`WebSite`, `Recipe`, `BreadcrumbList`, dan `CollectionPage` untuk halaman daerah. Halaman provinsi menghubungkan konten komunitas dengan wilayah administratif Indonesia.
- UMPAN MAS adalah platform komunitas daring, bukan toko dengan lokasi fisik yang telah diverifikasi. Karena itu, jangan menambahkan alamat, nomor telepon, jam buka, atau markup `LocalBusiness` fiktif. Jika ada lokasi usaha yang benar-benar melayani pengunjung, lengkapi NAP (nama, alamat, telepon) yang konsisten dan profil Google Business Profile sebelum mengaktifkan data bisnis lokal.
- Gambar memakai `next/image` dengan preload selektif untuk gambar LCP, format AVIF/WebP, ukuran responsif, cache gambar statis, dan request analitik yang ditunda agar tidak mengganggu render awal. Setelah deploy, daftarkan domain produksi di Google Search Console dan kirim URL sitemap.

## Menjalankan secara lokal

```bash
npm install
npm run dev            # http://localhost:3000
npm run supabase:check # opsional: periksa konfigurasi Supabase & PostgreSQL
```
