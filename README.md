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

Supabase kini hanya menerbitkan alamat **IPv6** untuk koneksi langsung (`db.<project-ref>.supabase.co`). Vercel dan host ber-IPv4 lain tidak bisa menjangkaunya — gejalanya `getaddrinfo ENOTFOUND db.<ref>.supabase.co` di `/api/health`. Pakai **Transaction pooler** yang IPv4:

```
postgresql://postgres.<project-ref>:<PASSWORD>@aws-0-<wilayah>.pooler.supabase.com:6543/postgres?sslmode=require
```

String itu disalin dari Supabase → tombol **Connect** → *Transaction pooler* (password basis data, bukan kunci API). Mode transaksi (port 6543) wajib untuk hosting serverless seperti Vercel: koneksi server dikembalikan setiap transaksi selesai. Mode session (port 5432) hanya menyediakan 15 slot klien dan pernah jenuh (`EMAXCONNSESSION`) karena setiap instance serverless menahan koneksinya sendiri. Kode aplikasi juga membatasi pool per instance (maks 3 koneksi, idle 5 detik) di `src/db/index.ts` sebagai pengaman tambahan. Tempel apa adanya sebagai `DATABASE_URL` di host Anda, lalu deploy ulang — tabel `cms_*` dibuat otomatis saat deploy (lihat bagian berikutnya).

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

## Akun pengguna (Supabase Auth)

Pengunjung bisa **daftar dan masuk** untuk membagikan resep sendiri. Akun memakai **Supabase Auth** dengan dua cara masuk: **email + kata sandi** dan **Google**. Tidak ada kunci rahasia (service role) di aplikasi: peramban hanya memakai kunci publishable, sesi disimpan Supabase sebagai cookie, dan setiap route `/api/user/*` memeriksa sesi itu di server (`src/lib/auth-user.ts`) sebelum menyentuh basis data lewat jalur Drizzle yang sudah ada.

Yang didapat pengguna setelah masuk:

- **Bagikan resep — langsung tayang.** Setiap kelompok pilihan majemuk pada formulir (jenis kolam, cuaca, kondisi air, tipe air, musim, provinsi) punya tombol **Semua** untuk memilih/mengosongkan sekaligus — pola yang sama juga ada di formulir dashboard admin (`MultiSelectDropdown` dan pemilih jenis kolam); batas daftar pada `validateCmsRecipeInput` dinaikkan menjadi 40 agar "Semua provinsi" (38) sah. Formulir `/bagikan` memakai validasi yang sama persis dengan dashboard admin (`validateCmsRecipeInput`). Resep terkirim berstatus `published` dengan penulis nama akun dan `owner_id` id pengguna; slug dibuat unik otomatis. Batas wajar 10 resep per akun per hari mencegah spam. Hanya pemilik (atau admin) yang boleh menyunting/menghapusnya; admin tetap bisa mengarsipkan resep bermasalah dari dashboard. Foto diunggah lewat `/api/user/recipes/[id]/photo` dengan pemeriksaan yang sama seperti dashboard (maks 3 MB, tipe berkas diperiksa dari isi berkasnya).
- **Satu ikon profil di header.** Demi tampilan yang minimalis, header publik hanya menyisakan ikon cari dan ikon profil. Ikon profil membuka menu berisi Masuk, Daftar, Bagikan Resep, dan Favorit Saya untuk pengunjung; setelah masuk, menu yang sama berisi Akun Saya (satu halaman `/profil`), Bagikan Resep, Resep Saya, Ulasan Saya, Favorit, dan Keluar. Tidak ada lagi tombol Masuk/Daftar maupun ikon hati/profil terpisah di header.
- **Akun Saya (`/profil`).** Tiga tab: **Resep Saya** (sunting/hapus + status tayang), **Ulasan Saya** (semua ulasan yang dikirim saat masuk beserta status moderasinya), dan **Favorit** tersinkron. Nama tampil bisa diganti dari halaman ini.
- **Favorit tersinkron antarperangkat.** Favorit pengunjung anonim tetap lokal (localStorage `umpan-mas-favorites`). Saat masuk, daftar lokal dan daftar akun **digabung** (tidak ada yang terhapus) lalu disimpan ke tabel `user_favorites`; perubahan berikutnya ikut terkirim, jadi membuka situs di perangkat lain menampilkan favorit yang sama.
- **Ulasan tetap boleh anonim.** Formulir ulasan tidak berubah bagi pengunjung biasa. Bila ulasan dikirim saat masuk, server mengisi `cms_reviews.user_id` dan memakai nama akun, sehingga ulasan itu muncul di tab Ulasan Saya pengirimnya. Aturan lama (token perangkat, batas kiriman, honeypot/Turnstile, pemeriksaan risiko otomatis, tinjauan editor untuk yang ditahan) tetap berlaku untuk semua kiriman.

Rute `/masuk`, `/daftar`, `/bagikan`, `/profil`, dan `/auth` diberi `noindex` oleh `src/proxy.ts` dan metadata halamannya. Migrasi `20261016150000_add_user_accounts` menambahkan `cms_recipes.owner_id`, `cms_reviews.user_id`, dan tabel `user_favorites`.

**Yang perlu diatur sekali di Supabase (dashboard proyek, bukan kode):** aktifkan provider **Email** dan **Google** di *Authentication → Providers* (Google butuh Client ID/Secret dari Google Cloud), lalu di *Authentication → URL Configuration* isi **Site URL** dengan alamat produksi dan tambahkan `<alamat-produksi>/auth/callback` ke **Redirect URLs**. Tanpa itu, tombol Google menjawab galat "provider is not enabled" dan tautan konfirmasi email tidak kembali ke situs — aplikasi menampilkannya sebagai pesan yang mudah dipahami, bukan halaman galat.

## Admin Content Studio

Buka `/login` untuk masuk ke dashboard. Halaman dashboard dan endpoint `/api/admin/*` dilindungi oleh sesi admin HttpOnly yang kedaluwarsa setelah 8 jam.

**Area admin tidak dipromosikan dan tidak untuk diindeks:**

- **Tidak ada tautan publik ke `/dashboard`.** Footer hanya memuat tautan jelajah publik; dashboard dibuka lewat alamat langsung `/login`.
- **Pagar autentikasi di proxy.** `src/proxy.ts` (konvensi Next.js 16, sebelumnya `middleware.ts`) mengalihkan setiap permintaan ke `/dashboard*` tanpa cookie sesi yang sah ke `/login` — 307 + `Cache-Control: no-store`, sebelum halaman dirender. Pemeriksaannya sengaja ringan (`verifyAdminSessionSignature()`: bentuk, tanda tangan HMAC, dan masa berlaku; tanpa menyentuh basis data), sehingga aman dipanggil pada setiap permintaan. Pemeriksaan penuh — termasuk nomor versi password — tetap dilakukan `isAdminAuthenticated()` di `src/app/dashboard/layout.tsx` dan di setiap route handler admin, jadi sesi yang passwordnya sudah diganti tetap ditolak meski tanda tangannya masih sah.
- **`noindex` berlapis.** Respons `/dashboard*` dan `/login` diberi `X-Robots-Tag: noindex, nofollow`; layout dashboard juga memuat metadata `robots` `index: false, follow: false`; `robots.txt` melarang `/api`, `/dashboard`, dan `/login`; sitemap hanya memuat rute publik.

**Pengguna terdaftar di `/dashboard/pengguna`.** Menu ini menampilkan akun yang mendaftar lewat Supabase Auth (nama, email, jalur masuk Google/email, status konfirmasi email, tanggal daftar, terakhir masuk) digabung dengan aktivitasnya di situs: resep yang dibagikan (`cms_recipes.owner_id`), ulasan yang dikirim (`cms_reviews.user_id`), dan favorit tersinkron (`user_favorites`). Datanya dibaca baca-saja dari skema `auth` pada Postgres proyek Supabase yang sama lewat `DATABASE_URL` (`GET /api/admin/users`, khusus sesi admin) — tidak ada kunci service role tambahan. Sifatnya hanya-baca: menghapus atau memblokir akun tetap dilakukan dari dashboard Supabase (Authentication → Users). Bila `DATABASE_URL` tidak menunjuk proyek Supabase yang sama, halaman menampilkan penjelasan, bukan galat.

Atur `ADMIN_PASSWORD` sebagai environment variable server-side sebelum menjalankan aplikasi atau deploy. Untuk pengembangan lokal, salin `.env.example` menjadi `.env.local` lalu isi password yang diinginkan. Di Netlify, tambahkan `ADMIN_PASSWORD` pada environment variables dengan scope yang mencakup deploy production. Jangan gunakan awalan `NEXT_PUBLIC_` dan jangan commit file `.env.local`.

`ADMIN_SESSION_SECRET` opsional; jika tidak diatur, password admin digunakan untuk menandatangani sesi. Gunakan password yang panjang dan unik untuk deployment publik.

Kata sandi dashboard juga bisa diganti tanpa deploy dari **Studio → Keamanan** di dalam dashboard. Kata sandi baru disimpan sebagai hash scrypt di tabel `cms_settings` (kunci `admin_password`) dan menimpa `ADMIN_PASSWORD` selama ada. Setiap penggantian menaikkan nomor versi yang ikut ditanamkan ke cookie sesi, sehingga sesi di perangkat lain otomatis berakhir sementara perangkat yang mengganti tetap masuk. Tombol "Pakai password server lagi" menghapus penimpa tersebut sehingga `ADMIN_PASSWORD` berlaku kembali. Bila Anda lupa kata sandi yang dipasang di dashboard: ubah `ADMIN_PASSWORD` di host lalu deploy ulang, masuk dengan nilai baru itu, dan pasang kata sandi pilihan Anda lagi. Jangan menghapus `ADMIN_PASSWORD` dari environment — ia adalah kunci cadangan sekaligus penanda tangan sesi bila `ADMIN_SESSION_SECRET` kosong.

Di `/dashboard/konten`, gunakan **Sinkronkan katalog** setelah deploy untuk memasukkan atau memperbarui 3 resep sumber DKI Jakarta dan 9 ulasan contoh ke CMS. Sinkronisasi aman diulangi: setiap ulasan katalog memiliki kunci unik sehingga tidak diduplikasi. Karena sinkronisasi mengikuti data sumber, perubahan manual pada resep sumber dengan slug yang sama akan diperbarui kembali ke versi katalog terbaru. Migrasi `20261015123000_prune_catalog_to_dki_jakarta` menghapus resep dan ulasan lama dari basis data, jadi katalog lama tidak hidup lagi hanya karena sinkronisasi dijalankan.

**Impor resep dari Excel.** Di `/dashboard/konten` ada tombol **Template Excel** (mengunduh `template-impor-resep.xlsx`: lembar "Resep" berisi dua baris contoh dan lembar "Petunjuk" berisi cara mengisi plus daftar nilai sah tiap kolom) dan **Impor Excel** untuk mengunggah berkas `.xlsx`/`.csv` (maks 2 MB, maks 200 baris). Satu baris = satu resep dengan nama kolom yang sama seperti formulir (Judul, Ringkasan, Cuaca, Jenis kolam, Bahan, Langkah, dst.); nilai ganda dipisahkan titik koma, bahan ditulis `Nama | Merek | Takaran` (tambahkan `| opsional` bila boleh dilewati), dan harga acuan diturunkan otomatis dari Label harga seperti di formulir. `POST /api/admin/recipes/import-spreadsheet` memeriksa semua baris dengan `validateCmsRecipeInput` yang sama seperti formulir (plus pemeriksaan per kolom agar pesan galat menyebut kolom dan nilai yang salah): bila satu baris tidak valid, tidak ada yang disimpan dan dashboard menampilkan laporan per baris. Slug yang sudah ada diperbarui, slug baru dibuat — jadi mengunggah ulang berkas yang sama aman.

## Istilah jenis kolam: "Galatama"

Situs memakai istilah **Galatama** untuk kolam galatama (jenis kolam yang memancingkan ikan mas hasil tebaran, bukan kolam harian atau kolam lomba). Sebelumnya situs memakai sebutan "Galat", yang tidak dikenal di dunia pemancingan; sebutan itu sudah tidak dipakai lagi di antarmuka.

Sebutan lama tetap **dibaca** agar data yang sudah tersimpan (resep CMS dan ulasan) tidak hilang:

- `normalizeFishingType` / `normalizeFishingTypes` di `src/data/recipes.ts` mengubah "Galat" menjadi "Galatama" saat data dibaca; `normalizeFishingText` melakukan hal yang sama untuk kalimat seperti "Kolam galat".
- Validasi penyimpanan (`src/lib/cms.ts`, API ulasan) masih menerima "Galat" dari formulir/tautan lama, tetapi selalu menuliskan "Galatama".
- Migrasi `netlify/database/migrations/20261014060000_rename_galat_to_galatama` merapikan nilai yang sudah ada di basis data (kategori, larik jenis, teks syarat, ringkasan resep, dan jenis ulasan). Migrasi ini aman dijalankan berulang karena hanya mengganti kata "Galat" utuh, bukan bagian dari "Galatama".

## Takaran kroto dan bahan amis

Setiap resep katalog punya dua tambahan yang sama, keduanya bertanda `optional` pada data bahan:

- **Kroto `1 ons`** (bukan gram) mengikuti kebiasaan pemancing. Resep yang memang berbasis kroto (Umpan Putih Kroto dan Roti Tawar Kroto Lomba) memakai kroto sebagai bahan inti; resep lain (Vanila Telur Bebek) menerimanya sebagai **tambahan opsional**.
- **Ikan tuna kaleng amis `2 sdm`** bermerek **Deho / Sunbell Katsuo**, plus **minyak ikan amis `1 sdm`**. Baris tuna dilewati bila resep sudah memakai ikan kalengan (mis. Sarden).

Bahan bertanda `optional` dipisahkan ke bagian **Tambahan opsional** di halaman resep dan tidak dihitung sebagai pembeda pada pencarian maupun skor kecocokan bahan di Sistem Pakar, karena tersedia di semua resep. Catatan `1 ons ≈ 100 g` tampil di bawah bagian tersebut dan pada `recipeIngredient` di structured data. Di Content Studio, kolom keempat pada baris bahan menandai opsional (`Kroto | Segar | 1 ons | opsional`) agar penanda ini bertahan saat resep disunting lewat dashboard.

## Tinggi dan panah dropdown di ponsel

Semua dropdown (<select>) di halaman publik memakai kelas bersama `select-field` (`src/app/globals.css`) plus padding dari `SELECT_FIELD_CLASS` di `src/components/form-fields.tsx`:

- **Tinggi dari padding, bukan `min-height`.** iOS Safari (mis. iPhone 7) mengabaikan `min-height` pada `<select>`, sehingga field tampak pendek dan teks nyaris menempel ke tepi atas/bawah. Karena itu tingginya ditentukan `py-3` (dan `pr-11` untuk ruang panah), lalu `min-h-*` hanya jadi penyelaras di layar besar (`sm:py-2.5`).
- **Panah digambar sendiri.** Tampilan bawaan peramban dimatikan (`appearance: none` lewat `.select-field`) karena panah bawaannya menempel ke tepi. Komponen `SelectBox` (`src/components/form-fields.tsx`) menaruh ikon `ChevronDown` di dalam field dengan jarak `right-3.5` (14px) dari tepi kanan dan `pointer-events-none`, jadi area klik tetap milik dropdown dan teks punya jarak 14px dari panah.
- Dropdown publik yang memakainya: `filter-bar.tsx` (termasuk panel filter mobile), `province-explorer.tsx`, `quick-finder.tsx`, `expert-system.tsx`, `ai-wizard.tsx` (tetap ada ikon pin di kiri), dan `recipe-review-section.tsx`.
- Dropdown di dashboard/admin sengaja **tidak** diubah (`fieldClass` di `appearance-manager.tsx`, `content-manager.tsx`, dan `security-manager.tsx`).

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

- Muncul pada **kunjungan pertama**, **setiap sesi peramban baru** (tab ditutup paksa lalu dibuka lagi — penanda sesi ikut terhapus), dan **lagi setelah lewat 24 jam** sejak terakhir dilihat. Jatah 24 jam juga berlaku untuk tab yang dibiarkan terbuka lama: begitu tab kembali aktif, popup tampil lagi.
- Selama masa sembunyi itu — sesi yang sama dan belum 24 jam — pengunjung yang berpindah halaman tidak melihatnya berulang kali.
- Dibuka setelah halaman tenang (± 1,4 detik) dan ditunda selama pengunjung masih aktif berinteraksi.
- Tidak muncul di `/dashboard` dan `/login` (termasuk saat dipaksa lewat `?sambutan=1`).
- Penanda disimpan berlapis: `localStorage` (kunci `umpan-mas-promo-welcome-seen-v1`, berisi waktu terakhir dilihat), lalu `sessionStorage`, lalu memori. Jadi kalau penyimpanan diblokir — mode privat atau halaman dibuka di dalam iframe yang di-sandbox — popup tetap tampil sekali per sesi, bukan malah tidak pernah muncul.
- Penanda dari versi lama yang masih berbentuk `"1"` (tanpa waktu) dibaca sebagai "pernah dilihat", sehingga popup muncul sekali lagi lalu memakai penanda waktu yang baru.

**Melihat ulang untuk pratinjau**

Tambahkan `?sambutan=1` pada alamat yang dibuka (mis. `/?sambutan=1` atau `/katalog?sambutan=1`) untuk memaksa popup tampil walau penanda sudah tersimpan. Di dashboard, tombol **Tampilkan lagi** pada kartu popup menghapus penandanya di semua lapisan. Cara lain: hapus kunci `umpan-mas-promo-welcome-seen-v1` dari penyimpanan peramban lalu muat ulang.

**Mengubah isi popup.** Teksnya dibakar ke gambar, jadi ubah salinan di `scripts/build-promo-poster.mjs` lalu jalankan ulang skrip (butuh `npm install --no-save @napi-rs/canvas`). Angka statistik di poster juga statis — perbarui di skrip saat katalog bertambah. Skrip otomatis memeriksa setiap baris muat di kolomnya dan kontras teks di atas latar poster minimal 4,5:1.

## Ulasan komunitas: tersimpan di server, akun opsional

Ulasan pengunjung **disimpan di PostgreSQL** (tabel `cms_reviews`) dan dibagikan ke semua pengunjung — bukan lagi hanya di peramban pengirimnya. Peramban tetap punya salinan sementara supaya ulasan langsung tampil, tetapi sumber kebenarannya server:

- **Kiriman lewat API, bukan penyimpanan peramban.** `POST /api/public/reviews` menyimpan baris lalu menilai risikonya (`src/lib/review-risk.ts`): kiriman bersih langsung berstatus `approved` dan tampil publik, sedangkan yang mencurigakan — tautan, nomor telepon, kata kasar/promosi, nama menyamar sebagai admin, huruf kapital berlebihan, karakter berulang, ulasan dari pemilik resep, atau banyak kiriman dari satu perangkat dalam sejam — ditahan sebagai `pending` beserta alasan di `hold_reason` untuk ditinjau editor di dashboard (**Studio → Moderasi Ulasan**). `GET /api/public/reviews[?slug=]` mengirim ulasan yang sudah disetujui (dan tidak bertanggal masa depan) ke semua orang. Menghapus data peramban hanya menghapus salinan lokal; ulasan yang sudah terkirim tetap ada di server dan tetap tampil.
- **Token perangkat anonim.** `POST /api/public/reviews/token` menerbitkan token bertanda tangan HMAC (`x-review-device`, berlaku 400 hari) yang berisi id acak. Peramban menyimpannya di `localStorage` (`umpan-mas-review-device-v1`). Token yang hilang diperbarui otomatis tanpa kehilangan id-nya; token yang dikarang klien selalu ditolak server.
- **Satu ulasan per resep per perangkat per 24 jam.** Server menghitung baris milik perangkat itu untuk resep tersebut (`cms_reviews_device_recipe_created_idx`) dan menjawab `429` beserta pesan serta header `Retry-After`. Kiriman identik yang terulang (mis. percobaan ulang jaringan) **tidak digandakan** — dijawab dengan ID ulasan yang sudah ada. Ulasan yang **ditolak** moderator tidak dihitung, jadi penulisnya boleh memperbaiki kirimannya.
- **Batas yang diketahui.** Menghapus data peramban (atau berpindah peramban) membuat perangkat mendapat id baru, seperti orang yang berganti perangkat — aturan 24 jam per resep mengikuti id itu. Jaring pengamannya adalah batas per IP di bawah, ditambah pemeriksaan risiko yang menahan kiriman mencurigakan sebelum tampil.
- **Batasan tambahan.** Batas bawaan 8 ulasan per perangkat per hari dan 24 per IP per hari; IP dikenali dari `x-real-ip`/`x-forwarded-for` (entri terakhir, yaitu proxy terdekat) dan hanya disimpan sebagai sidik jari HMAC. Tidak ada IP, token, atau nama mentah yang disimpan sebagai data pelacakan.
- **Honeypot & Cloudflare Turnstile.** Formulir ulasan memuat kolom tersembunyi `website`; kiriman yang mengisinya dijawab "sukses" palsu tanpa disimpan. Turnstile aktif otomatis **hanya bila kedua kunci disetel** (`NEXT_PUBLIC_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY`); kalau hanya salah satu terisi, penyaring itu dimatikan supaya formulir tidak pernah macet. Kegagalan verifikasi dijawab `400` dengan kode `turnstile`.
- **Antrean moderasi.** `GET /api/admin/reviews` dan `PATCH /api/admin/reviews/[id]` tetap satu-satunya jalan menyetujui/menolak; keduanya butuh sesi admin. Status moderasi hanya bisa diperiksa pemilik kiriman lewat `POST /api/public/reviews/status` (perangkat lain, termasuk yang menebak ID baris, mendapat `missing`).
- **Tombol Laporkan untuk pengunjung.** Ulasan yang sudah tampil punya tombol **Laporkan** (alasan: spam, kasar, tidak relevan, lainnya) lewat `POST /api/public/reviews/report` ke tabel `cms_review_reports` (migrasi `20261017170000_add_review_reports`): satu laporan per perangkat per ulasan, maks. 10 laporan per perangkat per hari. Laporan terbuka tampil bagi admin sebagai penghitung `laporanTerbuka` dan tab **Dilaporkan** di Studio → Moderasi Ulasan; admin bisa **Abaikan laporan** (status `diabaikan`) atau memutuskan ulasannya (laporan otomatis `selesai`). Tiga pelapor berbeda menahan ulasan itu otomatis (`pending`, alasan “Dilaporkan N pengunjung”) sampai admin memutuskan.
- **Pengali batas tanpa ubah kode.** `REVIEW_PER_RECIPE_PER_DEVICE_LIMIT`, `REVIEW_PER_DEVICE_DAILY_LIMIT`, dan `REVIEW_IP_DAILY_LIMIT` (nilai `0` mematikan batas yang bersangkutan). Semuanya opsional; lihat `.env.example`.
- Migrasi `netlify/database/migrations/20261014120000_add_review_rate_limits` menambahkan kolom `device`, `ip_hash`, dan `payload_hash` beserta indeksnya. Basis data gratis (mis. Supabase) sudah cukup — tidak ada layanan tambahan yang perlu dibayar.
- **Hasil tangkapan tidak berdiri sendiri.** Formulir ulasan meminta tiga hal sekaligus (semuanya opsional): **jumlah ikan**, **durasi sesi**, dan **jumlah joran**. Angka "8 ekor" tanpa durasi tidak bisa dibandingkan — 8 ekor dalam 8 jam berbeda artinya dari 8 ekor dalam 2 jam. Karena itu laju (`ekor/jam`) **hanya** dihitung kalau durasinya diisi (`src/lib/catch-details.ts`), dan badge di kartu ulasan menampilkan rinciannya apa adanya: `🐟 8 ekor · ⏱️ 2 jam · 🎣 2 joran · 📈 4 ekor/jam`. Tanpa durasi, yang tampil hanya angkanya — tidak ada laju yang dikarang. Batas server: durasi 30 menit–24 jam (`session_minutes`), joran 1–10 (`rod_count`), keduanya divalidasi di API. Migrasi `20261014190000_add_review_session_details` menambahkan kedua kolom itu. Data contoh di tab komunitas katalog juga memakai format yang sama supaya jelas cara membacanya.
- **Catatan jujur soal lokasi.** Kota dan provinsi ikut tersimpan pada baris ulasan (memang untuk ditampilkan sebagai asal cerita), jadi teks di formulir tidak lagi mengatakan "lokasi tidak dikirim ke server". Deteksi GPS-nya sendiri tetap berjalan di perangkat; yang dikirim hanya nama kota/provinsi yang tampil di ulasan.

**Komunitas kini menjadi tab di katalog.** Halaman mandiri `/komunitas` dilebur menjadi tab **Cerita & Ulasan Komunitas** di `/katalog` (`CommunityView` dirender tanpa hero saat menyemat di tab), dan `/komunitas` menjawab pengalihan permanen 308 ke `/katalog?tab=komunitas` — tautan lama dan hasil pencarian tidak mati, sitemap tidak lagi memuat `/komunitas`, dan menu desktop tidak lagi memisahkan Komunitas dari Katalog. Isi dan perilakunya (cerita hasil mancing, ulasan disetujui, contoh berlabel) tidak berubah.

**Sub-tab Racikan adalah etalase kiriman warga.** Resep terbit yang dibagikan pengguna lewat `/bagikan` tampil di sana sebagai kartu racikan komunitas (foto, nama pengirim, tanggal bagikan, tautan ke detail resep), ditandai penanda `dariKomunitas` dari API resep publik — ID pemilik akun tidak pernah dikirim ke publik. Kartu laporan contoh hanya menjadi pengisi sub-tab itu selama belum ada kiriman warga, sama seperti blok contoh ulasan yang mundur begitu ulasan asli masuk.

## Kejujuran data ulasan dan laporan

Situs tidak menampilkan angka komunitas yang dikarang. Aturannya:

- **Ulasan contoh hanya 3 per resep dan selalu berlabel.** `src/data/reviews.ts` menyimpan contoh penulisan ulasan (`sample: true`, kunci `catalog:<slug>:01..03`) dengan tanggal yang dipatok di masa lampau dan kota yang berbeda-beda. Di halaman resep contoh ditaruh di blok "Contoh penulisan ulasan" berlabel **Data contoh**, dan dijelaskan bahwa contoh itu bukan kiriman pengunjung serta tidak dihitung.
- **Angka asli hanya dari ulasan pengunjung.** `src/lib/review-summary.ts` (`getRecipeRatings()`) menghitung jumlah dan rata-rata rating dari `cms_reviews` dengan syarat: status `approved`, `seed_key` kosong (bukan contoh), dan `created_at <= now()`. Dipakai oleh `GET /api/public/reviews/summary` dan dibaca komponen lewat `src/lib/use-ratings.ts`.
- **Kalau belum ada ulasan, tulis apa adanya.** Kartu resep, halaman resep, dan bagian ulasan menampilkan **"Belum ada rating"** / **"Belum ada ulasan"** — bukan angka katalog.
- **Angka katalog tidak lagi tampil sebagai statistik.** `rating`, `reviewCount`, dan `users` di `src/data/recipes.ts` kini dikosongkan (0) pada tiga resep yang dipertahankan dan hanya dipakai internal (tampilan admin di Content Studio, selalu diberi label "angka katalog"), bukan sebagai statistik komunitas. Urutan "Rating Tertinggi"/"Ulasan Terbanyak" di katalog dan pilihan racikan di halaman cuaca memakai rating ulasan nyata, dan "N racikan" pada kartu cuaca dihitung dari katalog — bukan angka tetap.
- **Tanggal masa depan ditolak.** `src/lib/review-dates.ts` menyediakan `isFutureReviewDate` (toleransi jam 60 detik) dan `clampReviewCreatedAt`. API publik menolak `POST` bertanggal masa depan (400), API baca (`/api/public/reviews`, `/api/admin/reviews`, ringkasan) menyaring `created_at <= now()`, dan sinkronisasi katalog memangkas tanggal contoh yang melewati waktu server.
- **Laporan mancing di halaman komunitas diberi label "Data contoh"** (`src/data/fishingReports.ts` memakai tanggal relatif seperti "2 hari lalu", jadi tidak pernah bertanggal masa depan).
- Migrasi `netlify/database/migrations/20261014090000_prune_sample_reviews_and_future_dates` menyisakan 3 contoh per resep dan merapikan tanggal yang sudah terlanjur melewati waktu server.
- **Katalog dipangkas ke data jujur DKI Jakarta.** `src/data/recipes.ts` kini hanya memuat Umpan Putih Kroto, Vanila Telur Bebek, dan Roti Tawar Kroto Lomba — tiga resep yang data asalnya memang mencantumkan DKI Jakarta — dan ketiganya berlabel provinsi `["DKI Jakarta"]`. Migrasi `20261015123000_prune_catalog_to_dki_jakarta` menghapus 197 resep lain dari `cms_recipes` dan semua ulasan selain 9 contoh berlabel untuk ketiga resep itu dari `cms_reviews` (termasuk ulasan non-contoh), serta mengosongkan angka katalog pada resep yang dipertahankan. Berkas foto resep yang tidak terpakai ikut dihapus dari `public/images` (menyusut dari ±18 MB menjadi di bawah 1 MB).

## Badge resep diturunkan dari satu field

Badge di kartu **tidak lagi ditulis manual per kartu**. Aturannya:

- **Satu field: jenis pemancingan.** `src/data/recipes.ts` menghitung `category` dari `fishingTypes` resep lewat `primaryFishingType()` — dan kalau nama resep menyebut jenisnya (mis. "Roti Tawar Kroto Lomba"), jenis itulah yang dipakai. Semua resep katalog mengikuti jalur yang sama, jadi tidak ada kategori hasil urutan kartu.
- **Satu tempat menulis teks badge.** `src/lib/recipe-badge.ts` (`recipeBadge()`) menentukan label dan warna badge dari `recipe.category`; semua kartu, kepala halaman resep, dan kartu rekomendasi AI Umpan memakainya. Karena sumbernya sama dengan tag kondisi, badge tidak mungkin lagi bertentangan dengan tag — mis. badge "Lomba" dengan tag "Harian".
- **Tidak ada badge berdasarkan posisi.** Prop `featured` pada `RecipeCard` dihapus, termasuk label "🏆 Rekomendasi" yang dulu otomatis diberikan ke kartu pertama. Setiap kartu menampilkan jenis resep yang sebenarnya.
- **Tag kondisi menampilkan seluruh jenis.** Kartu menulis "🎣 Harian / Lomba" (bukan hanya jenis pertama), dan jenis pertama selalu sama dengan badge.
- **Kategori "Premium"/"Ekonomis" dihapus.** Itu tingkat harga, bukan jenis kolam; informasinya sudah ada pada filter Budget dan "Estimasi biaya" di kartu. Formulir dashboard tidak lagi menampilkan kolom kategori sama sekali (kolom "Kategori" di daftar konten juga dihapus; jenis kolam sudah terwakili chip-nya) — kategori tetap dihitung otomatis dari jenis pemancingan oleh `validateCmsRecipeInput`, jadi data baru tidak bisa lagi memasukkan kategori yang bertentangan.
- **Jenis kolam dipilih, bukan diketik, di formulir dashboard.** Editor resep memakai pemilih centang Harian/Lomba/Galatama (istilah "Jenis kolam", sama seperti halaman publik) — satu resep boleh dicentang untuk beberapa jenis sekaligus, termasuk ketiganya bila racikan memang cocok untuk semua jenis kolam. Formulir menolak bila belum ada yang dipilih, dan `validateCmsRecipeInput` ikut menolak daftar jenis kosong, jadi tidak ada lagi resep tanpa jenis kolam yang tak pernah cocok dengan saringan mana pun.
- **Satu sumber jumlah resep publik.** Semua angka dan daftar resep di situs publik (beranda, katalog beserta hitungan per jenis kolam, indeks + detail provinsi per daerah, panduan cuaca, AI Umpan, Sistem Pakar termasuk statistik "Resep", racikan terkait di detail, dan halaman favorit) kini berasal dari `getPublicRecipeData()` di `src/lib/public-recipes.ts` — resep dashboard berstatus `published` menimpa katalog bawaan per slug, resep yang di dashboard masih draft/arsip menyembunyikan versi katalognya, dan kegagalan baca basis data saat runtime **tidak** lagi jatuh ke katalog bawaan atau peta rating kosong — semua bacaan render (daftar resep, rating ulasan, detail resep) memakai helper coba-ulang bersama `bacaDenganCobaUlang` di `src/lib/db-retry.ts` (3 kali percobaan) lalu render digagalkan sebagai galat agar cache ISR tidak menyimpan hitungan basi (katalog bawaan hanya dipakai bila basis data memang tidak terkonfigurasi atau saat build, dan halaman detail menangkap kegagalannya khusus untuk bagian racikan terkait). Sebelumnya halaman server hanya menghitung katalog bawaan `src/data/recipes.ts`, jadi jumlah publik tidak sesuai dashboard (mis. Jawa Barat tampil "0 racikan tercatat" padahal ada resep terbit berprovinsi Jawa Barat). Komponen klien menerima daftar gabungan ini sebagai data awal dari server (ISR 1 jam + `revalidatePath` saat resep disimpan) lalu menyegarkannya lewat `/api/public/recipes`.
- **Foto racikan di formulir dashboard diunggah, bukan dipilih.** Editor resep mengunggah berkas PNG/JPEG/WebP (maks 3 MB, diperiksa dari isi berkas) ke `POST /api/admin/recipes/photo`; foto tersimpan di tabel media berkunci berversi `recipe-<slug>-v<versi>` (kunci lama milik resep yang sama ikut dihapus) dan dilayani `/api/media/recipe-<slug>-v<versi>`, lalu alamat itulah yang disimpan di kolom `image` resep. Alamat berubah setiap foto diganti, karena pengoptimal gambar menyimpan hasil berdasarkan alamat — alamat tetap akan terus menyajikan foto lama dari cache. Setiap penyimpanan resep dari dashboard (buat/sunting/hapus/sinkron/impor Excel) juga memanggil `revalidatePath` untuk halaman detail, katalog, beranda, cuaca, komunitas, dan provinsi terkait, jadi perubahan langsung tampil di publik tanpa menunggu ISR 1 jam. Tombol "Pakai foto bawaan" mengembalikan resep ke foto katalog bawaan.
- **Kolom kondisi di formulir dashboard adalah dropdown, bukan teks bebas.** Cuaca, Kondisi air, Tipe air, Musim, dan Provinsi terkait dipilih dari daftar resmi (`WEATHER_CONDITIONS`, `WATER_CONDITIONS`, `WATER_BODIES`, `SEASON_CONDITIONS` di `src/data/recipes.ts` + 38 provinsi) dan boleh lebih dari satu pilihan; daftar yang sama dipakai `validateCmsRecipeInput`, jadi nilai formulir tidak mungkin ditolak server atau luput dari saringan publik. Foto racikan pada resep baru mulai **kosong** (tidak lagi foto bawaan katalog); bila disimpan tanpa foto, halaman publik tetap memakai foto bawaan agar tidak ada gambar rusak.
- **Panel dropdown formulir melayang, dan Tingkat kesulitan kini dropdown yang sama.** Panel pilihan pada dropdown kondisi membuka sebagai lapisan melayang (klik di luar atau Escape menutupnya) agar grid "Kondisi & harga" tidak berantakan saat dibuka, dan Tingkat kesulitan memakai dropdown kustom bercangkang sama seperti kolom pilihan lain (bukan lagi `<select>` bawaan peramban).
- **Field "Harga acuan (angka, Rp)" dihapus dari formulir resep.** Angkanya penting (dipakai saringan budget dan urutan "Harga Terendah"), tetapi tidak perlu diketik: `hargaAcuanDariLabel()` (`src/lib/utils.ts`) menurunkannya dari Label harga sebagai titik tengah rentang — persis pola resep katalog (teruji pada ketiga resep yang dipertahankan). Admin cukup menulis label seperti "Rp20.000–25.000".
- **Resep dari dashboard ikut aturan yang sama.** `normalizeCmsRecipeRecord()` dan `cmsRecipeToRecipe()` menghitung ulang kategori **dan** mengurutkan jenis pemancingan dari judul + daftar jenisnya, sehingga baris lama yang masih menyimpan kategori manual (mis. "Premium") tetap tampil dengan badge yang sama dengan tag kondisinya. `validateCmsRecipeInput` menyimpan jenis dalam urutan itu juga, jadi basis data tidak menyimpan nilai yang bertentangan.

## Satu sumber angka, skor kecocokan, dan label "Populer"

**Satu sumber angka.** Semua angka komunitas di halaman publik berasal dari satu tempat: tabel `cms_reviews`. `getRecipeRatings()` (`src/lib/review-summary.ts`) menghitung jumlah dan rata-rata rating hanya dari ulasan pengunjung yang sudah disetujui (`seed_key` kosong) dan tidak bertanggal masa depan. Angka katalog `rating`, `reviewCount`, dan `users` di `src/data/recipes.ts` tidak pernah ditampilkan sebagai statistik komunitas — hanya dipakai internal (kurasi dan urutan sistem) serta tampilan Content Studio.

**Definisi "mencoba".** Tulisan "N pemancing mencoba" berarti **jumlah ulasan pengunjung** pada resep itu: satu ulasan = satu pemancing yang mencoba. Angkanya tidak pernah melebihi jumlah ulasan, dan selalu disertai penjelasan di halaman resep ("Satu ulasan berarti satu pemancing yang mencoba racikan ini…"). Kalimat penjelas yang sama dipakai pada atribut `title` kartu resep lewat `describeRating()` (`src/lib/rating-utils.ts`). Tombol "Saya coba" belum ada; kalau nanti ditambahkan, angkanya harus tetap berasal dari tabel yang sama.

**Skor kecocokan ("Match").** `calculateMatchScore()` (`src/lib/recommendation.ts`) hanya memakai kondisi yang **diisi pengunjung** (tipe air, kondisi air, cuaca, jenis pemancingan, musim, provinsi), dengan bobot yang tinggal di `src/lib/recommendation-config.ts` — lihat bagian "Bobot skor kecocokan" di bawah. Tanpa isian nilainya 0 dan **tidak ditampilkan sama sekali** — jadi tidak ada lagi "100% match" di beranda sebelum pengunjung mengisi apa pun. Isian disimpan di `localStorage` (`umpan-mas-preferences-v1`) oleh Cari Cepat, langkah AI Umpan, Sistem Pakar, filter katalog, dan provinsi hasil izin lokasi; komponen membacanya lewat `useVisitorPreferences()` (`src/lib/visitor-preferences.ts`). Kotak skor di halaman resep juga merinci kondisi yang dipakai menghitungnya.

**Label "Populer".** Kalau pengunjung belum mengisi apa pun, tempat skor match diisi label **"Populer"** — hanya untuk resep yang paling banyak diulas (`POPULAR_MIN_REVIEWS = 2`, maksimal 10 resep; `popularRecipeSlugs()`). Kalau belum ada resep yang memenuhi ambang itu, tidak ada label yang tampil. Di beranda, bagian racikan berjudul "Racikan Populer" hanya dipakai saat sudah ada ulasan pengunjung; sebelumnya tetap "Racikan Pilihan" dengan urutan kurasi.

**Sistem pakar & AI Umpan.** Analisis sistem pakar baru muncul setelah pengunjung memilih minimal 2 bahan, dan hanya ulasan pengunjung yang dipakai sebagai bukti komunitas — ulasan contoh tidak ikut analisis. Tanpa bukti komunitas, nilainya netral (50), bukan diambil dari rating katalog.

## Peringkat rating memakai rata-rata Bayesian

Urutan **"Rating Tertinggi"** di katalog tidak lagi memakai rata-rata mentah, karena rata-rata mentah membuat resep dengan 5 ulasan bintang 5 mengalahkan resep dengan 200 ulasan rata-rata 4,8. Yang dipakai adalah rata-rata Bayesian (setara "weighted rating" IMDb):

```
skor = v/(v+m) · R + m/(v+m) · C
```

- `v` = jumlah ulasan pengunjung yang sudah disetujui untuk resep itu, `R` = rata-rata resep itu.
- `C` = rata-rata **seluruh** ulasan yang sudah disetujui (`globalReviewAverage()` di `src/lib/rating-utils.ts`) — dihitung dari setiap ulasan (Σ jumlah × rata-rata ÷ total ulasan), bukan rata-rata dari rata-rata resep. Kalau belum ada ulasan sama sekali, `C` tidak diketahui dan tidak ada skor yang dikarang.
- `m` = ambang, **20** (`BAYESIAN_MIN_REVIEWS`). Resep dengan 5 ulasan berarti separuh jalan antara rata-ratanya sendiri dan rata-rata situs; resep dengan 200 ulasan hampir tidak terpengaruh.
- Satu rumus, satu nilai: `bayesianRatingScore()` dan `ratingScoreRanker()` di `src/lib/rating-utils.ts`, dipakai lewat `useRatingSummary()`. Nilai `C` dan `m` dikirim server pada `GET /api/public/reviews/summary` (`global`, `minReviews`) supaya katalog dan server tidak menghitung angka yang berbeda.

Aturan yang menyertainya, agar tetap jujur:

- **Skor hanya untuk mengurutkan, bukan angka yang ditampilkan.** Kartu resep tetap menampilkan rata-rata asli dan jumlah ulasannya; skor Bayesian tidak pernah muncul sebagai rating.
- **Resep tanpa ulasan selalu di bawah** resep yang sudah diulas (bukan ditempatkan di posisi `C`), dan tetap menampilkan "Belum ada rating".
- **Urutan berbasis jumlah ulasan tidak berubah.** "Racikan Populer" (beranda), "Ulasan Terbanyak" (katalog), urutan pilihan di `/cuaca`, urutan resep provinsi, dan pemutus seri rekomendasi memakai **jumlah** ulasan lebih dulu; rata-rata di sana hanya pemutus seri pada jumlah yang sama — dan pada jumlah yang sama, urutan rata-rata setara dengan urutan skor Bayesian.
- Pengunjung diberi tahu: saat memilih "Rating Tertinggi", katalog menampilkan catatan `BAYESIAN_HINT` yang menjelaskan mengapa resep berulasan sedikit tidak langsung melompat ke atas.
- **Dashboard memakai angka yang sama.** `GET /api/admin/recipes` mengirim peta rating ulasan nyata, `global` (C), dan `minReviews` (m) — nilainya identik dengan `/api/public/reviews/summary`. Pustaka racikan di Content Studio punya pilihan urutan **"Skor rating (Bayesian)"** (default tetap "Terakhir diubah", karena urutan editorial tidak berubah) dan setiap baris menampilkan dua baris angka yang sengaja dipisah: "angka katalog ★ …" (angka kurasi, selalu berlabel) dan "Ulasan nyata ★ … dari N ulasan · skor peringkat …" atau "Belum ada ulasan pengunjung". Ikhtisar `/dashboard` juga menampilkan rumus, ambang `m`, dan nilai `C` dari data nyata (dari `GET /api/admin/analytics`) supaya editor tahu dari mana urutan katalog berasal. Antrean moderasi tetap urut waktu — memoderasi tidak pernah diurutkan dari rating.

## Bobot skor kecocokan: satu berkas, status jujur, dan evaluasi hit-rate@3

**Bobot tidak lagi ditulis di dalam kode.** Semua bobot skor kecocokan tinggal di `src/lib/recommendation-config.ts`, lengkap dengan alasan tiap bobot, versi (`sementara-1 (2026-10-14)`), dan status yang jujur: **masih dugaan awal, belum diuji data**. Bobot lama yang juga tidak pernah diuji disimpan sebagai `MATCH_WEIGHTS_LAMA` hanya untuk pembanding.

| Kondisi | Bobot lama | Bobot sekarang | Alasan singkat |
| --- | --- | --- | --- |
| Tipe air (kolam/sungai/danau) | — | **25** | Karakter air berbeda antarkolam; satu provinsi punya banyak kolam yang tidak sama. |
| Kondisi air (keruh/hijau/jernih/kekuningan) | 30 | 20 | Warna dan kejernihan air langsung memengaruhi pilihan aroma. |
| Cuaca | 22 | 20 | Mengubah suhu dan keaktifan ikan saat sesi berjalan. |
| Jenis pemancingan | 22 | 20 | Tekanan kolam saat harian, lomba, dan galatama berbeda. |
| Musim | 10 | 10 | Lebih lambat berubah daripada kondisi harian. |
| Provinsi | 16 | **5** | Hanya proksi administratif — pemancing memilih kolam, bukan provinsi. |

Total selalu 100 (dijaga `MATCH_WEIGHTS_TOTAL`/`MATCH_WEIGHTS_BALANCED`), dan halaman `/sistem-pakar` menampilkan tabel bobot beserta alasannya lewat blok "Dari mana angka kecocokan ini?" — jadi pengunjung bisa melihat angkanya, bukan sekadar percaya.

**Tipe air (kolam/sungai/danau).** Resep punya field `waterBodies` (`WaterBody` di `src/data/recipes.ts`), berbeda dari `water` yang berisi kondisi air. Label katalog **diturunkan dari teks resep** (`waterBodiesFromText`) dan tidak menebak: resep yang tidak menyebut sungai/danau tidak diberi label itu. Semua resep katalog saat ini berlabel **Kolam** karena setiap entri "cocok untuk" menyebut kolam; resep yang tidak menyebut apa pun memakai label bawaan katalog (`DEFAULT_WATER_BODIES`). Editor bisa mengubahnya dari kolom **"Tipe air"** di Content Studio (`cms_recipes.water_bodies`, migrasi `20261014180000_add_water_body`). Pengunjung bisa memilih tipe air di filter katalog ("Semua tipe air") dan di Sistem Pakar; pilihannya tersimpan bersama kondisi lain di `umpan-mas-preferences-v1`.

**Ulasan ikut mencatat tipe air (opsional).** Formulir ulasan punya pilihan "Tipe air (opsional, Kolam/Sungai/Danau)" yang disimpan di `cms_reviews.water_body` dan divalidasi server. Ini yang membuat dimensi tipe air bisa dievaluasi nanti — tanpa data ini, bobotnya tidak akan pernah punya bukti.

**Evaluasi hit-rate@3.** Pertanyaannya: kalau pengunjung melaporkan kondisi mancingnya dan resepnya **berhasil**, apakah resep itu muncul di 3 teratas? `TUNING_TARGET` (`src/lib/recommendation-config.ts`) menetapkan:

- **rating tetap sinyal utama**: syarat pertama dan wajib adalah rating ≥ 4;
- **"tangkapan tinggi" diukur sebagai laju** (`TUNING_TARGET.highCatchPerHourMin = 1,5 ekor/jam`), bukan angka mentah — karena 8 ekor dalam 8 jam tidak sama dengan 8 ekor dalam 2 jam. Laju hanya dihitung kalau durasi sesi diisi dan sesinya ≥ 60 menit (`minSessionMinutesForRate`), supaya sesi setengah jam tidak diekstrapolasi;
- ulasan yang menyebut tangkapan **tanpa durasi** tidak dihitung sebagai "berhasil"; jumlahnya dilaporkan terpisah (`strictAbsoluteOnly`) supaya tidak ada yang disembunyikan;
- laporan tetap menampilkan dua angka: **ketat** (rating ≥ 4 **dan** laju tinggi) dan **longgar** (rating ≥ 4 saja);
- hit-rate@3 dihitung di `src/lib/recommendation-eval.ts` dengan **fungsi urutan yang sama** seperti situs (`getRecommendedRecipes` dengan bobot sebagai parameter — tidak ada rumus tandingan);
- ulasan yang sedang diuji **dikeluarkan dari bukti pemutus seri** (leave-one-out), supaya resep tidak dibantu ulasan yang justru sedang dinilai;
- hanya ulasan nyata yang sudah disetujui yang dihitung (ulasan contoh dan yang belum disetujui tidak pernah ikut);
- **tuning hanya disarankan setelah ≥ 30 ulasan "berhasil"**. Di bawah itu laporan hanya menampilkan keadaan dan berkata "Belum bisa dituning" — bobot tidak diubah berdasarkan sampel tipis.

Cara menjalankannya (server harus jalan; hitung ulang kapan saja):

```
ADMIN_PASSWORD="..." npm run eval:rekomendasi                    # server lokal :3000
BASE_URL="https://situs-anda" ADMIN_PASSWORD="..." npm run eval:rekomendasi
```

Sumbernya `GET /api/admin/recommendation-eval`, dan panel **"Uji urutan rekomendasi · hit-rate@3"** di `/dashboard/analitik` menampilkan bobot aktif, nilai hit-rate, sampel, kandidat bobot yang diuji, serta status tuning. Kalau hasilnya menunjukkan kandidat lain lebih baik **dan** sampelnya sudah cukup, bobot baru ditulis di `src/lib/recommendation-config.ts` (satu tempat), lalu evaluasi dijalankan lagi.

## Aturan komposisi, pengganti bahan, dan perkiraan biaya per wilayah

Sebelumnya komposisi di `/sistem-pakar` hanya "menjumlahkan persentase mengikuti bobot bahan": tidak ada pembatas, jadi kombinasi tak lazim (mis. empat bahan aroma) lewat tanpa satu pun peringatan, penanda pilihan hanya berbunyi `0/6 dipilih` dari 12 bahan tanpa menjelaskan batasnya, dan budget cuma menyaring resep — tidak pernah menilai racikannya. Sekarang:

**Tabel aturan rasio per peran.** `BLEND_ROLE_RULES` di `src/lib/blend-rules.ts`, dan tabelnya tampil apa adanya di halaman:

| Peran | Rentang | Alasan |
| --- | --- | --- |
| Dasar | 40–60% | Fondasi adonan harus jadi porsi terbesar: di bawah 40% adonan mudah lepas, di atas 60% pengikat dan aroma tidak kebagian tempat. |
| Pengikat | 10–25% | Cukup untuk menyatukan adonan, tetapi tidak sampai keras seperti karet. |
| Protein | 5–20% | Tambahan berprotein sebagai daya tarik; berlebihan membuat adonan sulit dipulung. |
| Aroma | 5–25% | Aroma bekerja sebagai penanda; kalau dominan, karakter bahan dasar justru tertutup. |
| Pelembap | 5–20% | Menjaga adonan tidak kering; kelebihan cairan membuat adonan lepas dari kail. |

**Cara porsi dihitung.** Bobot bahan tetap jadi titik awal, lalu porsi per peran dirapikan agar masuk rentang: proporsi bahan → dibatasi ke rentang peran (sisa dibagi ulang ke peran yang masih punya ruang) → dibulatkan ke bilangan bulat yang tetap berjumlah 100% → tiap bahan minimal **4%** (`MIN_INGREDIENT_PERCENT`) supaya tidak ada bahan yang cuma "titik" di adonan. Kalau rentang tidak bisa dipenuhi sekaligus — mis. hanya dua bahan sehingga Dasar tetap 75% sementara aturannya 40–60% — komposisi **tidak** dipaksa masuk aturan: yang tampil tetap proporsi pilihan pengunjung, disertai peringatan porsi mana yang keluar rentang, penyebabnya, dan apa yang bisa ditambah/dikurangi. Rentang ini titik awal yang bisa diperiksa, bukan formula baku.

**Peringatan dan saran yang bisa diklik.** Setiap pelanggaran aturan jadi peringatan berisi angka (mis. "Porsi Aroma 100% — di atas aturan 5–25%"), termasuk peran yang belum terpakai. Saran di panel hasil bisa langsung dipakai: tombol **"Pakai X"** mengganti bahan seperan (atau menambah satu bahan untuk memperbaiki porsi), dan **"Terapkan versi hemat"** mengganti seluruh pilihan dengan bahan seperan yang lebih murah sekaligus.

**Pengganti bahan seperan.** `src/data/ingredient-substitutes.ts` menyimpan catatan pengganti, dan penggantinya selalu diambil dari peran yang sama supaya rasio antar peran tidak rusak: tidak ada tapioka → terigu ("adonan sedikit lebih padat, kurangi 1–2 g"), pelet ↔ roti tawar, susu bubuk ↔ keju (mulai separuh takaran), telur ↔ santan (peran berbeda, jadi rasio ikut berubah — hal itu ditulis di saran). Bahan yang belum punya pengganti seperan (kroto) ditulis jujur: lewati saja, jangan diganti bahan berperan lain tanpa menghitung ulang rasio.

**Harga bahan per wilayah.** `src/data/ingredient-prices.ts` menyimpan harga dasar nasional (pelet Rp 1.200/100 g, kroto Rp 12.000 per ons, roti tawar Rp 6.000/100 g, keju Rp 13.000/100 g, essen pandan dihitung per pemakaian) dikali **faktor wilayah**: Nasional 1,00 · Jawa 0,96 · Bali & Nusa Tenggara 1,04 · Sumatera 1,06 · Sulawesi 1,10 · Kalimantan 1,12 · Maluku & Papua 1,24. Provinsi pengunjung dipetakan ke wilayah (`WILAYAH_PROVINSI`); tanpa provinsi dipakai harga nasional. Semuanya berlabel **perkiraan harga pasar (Oktober 2026), bukan harga tetap**, ditampilkan lengkap di halaman supaya bisa diperiksa dan diperbarui di satu tempat. Bahan ber-mode "pakai" tidak dihitung per gram.

**Estimasi biaya dihitung dari komposisi.** `hitungBiayaCampuran()` menjumlahkan gram tiap bahan (hasil komposisi) × harga wilayah, ditampilkan per 100 g adonan **dan** per sesi (± 250 g, `SESI_GRAM`), beserta rincian rupiah tiap bahan. Tidak ada bahan yang diam-diam dianggap gratis: bahan tanpa harga dihitung sebagai 0 dan jumlahnya dilaporkan.

**Budget kini juga menilai komposisi.** Perkiraan biaya satu sesi dibandingkan dengan rentang budget yang dipilih; kalau melewati batas atasnya, muncul peringatan berisi angka + tawaran versi hemat (dan berapa rupiah lebih murahnya per sesi). Budget tetap menyaring resep seperti sebelumnya, jadi satu isian dipakai di dua tempat: pilihan resep dan biaya racikan.

**Batas pilihan bahan diperjelas.** Bahan dikelompokkan per peran dengan judul seperti "Dasar · aturan 40–60% · 2 bahan" dan penghitung sendiri ("1 dipilih"); penghitung utama berbunyi `4/6 dipilih · sisa 2 slot` (atau "penuh"), bahan lain otomatis nonaktif saat pilihan penuh, dan halaman menyebut batasnya secara eksplisit: "Pilih 2–6 bahan dari 12 bahan yang tersedia, satu bahan minimal 4%".

Bukti pengujian (dijalankan di dev :3000 dan produksi :3100): **63 uji murni** aturan/pengganti/harga (termasuk 781 kombinasi bahan yang harus tetap berjumlah 100%), **40 uji interaktif jsdom** memakai komponen asli (klik bahan, "Pakai X", versi hemat, ubah provinsi ke Papua, ubah budget kecil/besar), dan **29 uji halaman tersaji + regresi** (semua halaman penting 200, `/dashboard` tetap 307 + noindex, API evaluasi tetap 401 tanpa sesi).

## Foto adonan per resep dan alt text unik

Setiap resep kini punya foto dan alt text-nya sendiri, diatur dari satu
tempat: `src/data/recipe-photos.ts`. Setelah katalog dipangkas, yang
tersisa hanya tiga berkas foto resep:

- **Umpan Putih Kroto** memakai berkas klasik `/images/recipe-putih.jpg`
  yang memang cocok dengan adonannya.
- **Vanila Telur Bebek** memakai `/images/recipes/vanila-telur-bebek.jpg`.
- **Roti Tawar Kroto Lomba** memakai
  `/images/recipes/roti-tawar-kroto-lomba.jpg`.

Pemetaannya dikunci dari slug di `CORE_RECIPE_PHOTOS`. Berkas foto 197
resep lama yang sudah dihapus ikut dibuang dari `public/images/recipes/`
(plus dua berkas klasik yang tidak terpakai), jadi folder gambar menyusut
dari ±18 MB menjadi di bawah 1 MB; skrip pembuat foto turunan
(`scripts/buat-foto-racikan.py`) ikut dihapus karena katalog turunan sudah
tidak ada. Foto resep baru cukup diunggah dari dashboard (tersimpan di
tabel media), bukan dibuat dari skrip.

- **Alt text unik per resep** disimpan di field `imageAlt`, diturunkan oleh
  `buildRecipeImageAlt` dari nama resep, warna adonan pada fotonya, bahan
  inti, jenis pemancingan, dan kondisi air. Field yang sama dipakai kartu
  katalog, kartu rekomendasi, halaman detail (termasuk metadata berbagi/Open
  Graph), dan resep CMS dari dashboard — tidak ada lagi alt generik yang
  diulang antarresep.
- **Foto pengirim ulasan tidak dikarang.** Ulasan pengunjung saat ini tidak
  memiliki unggahan foto, jadi kartu komunitas menampilkan foto racikan
  katalog dari resep yang dicoba dengan label "Ilustrasi racikan" dan alt
  yang menyatakannya sebagai ilustrasi katalog — bukan seolah-olah foto
  kiriman pemancingnya. Bila unggahan foto ulasan ditambahkan nanti, foto
  itulah yang harus menggantikan ilustrasi ini.

## Ikon SVG (bukan emoji) dan kontras WCAG AA

Emoji tidak lagi dipakai sebagai ikon utama di situs maupun dashboard.
Dulu screen reader membacakan nama emoji ("fishing rod", "fire", …) karena
emoji menjadi satu-satunya penanda visual di tombol, badge, dan pilihan.

- **Ikon = SVG Lucide** (`lucide-react`, sudah dipakai situs). Aturannya:
  ikon di samping teks yang sudah menamai isinya bersifat dekoratif dan
  diberi `aria-hidden="true"` (screen reader membaca teksnya saja), sedangkan
  ikon yang berdiri sendiri dibungkus elemen ber-`aria-label` — mis. medali
  peringkat di hasil sistem pakar adalah tautan ber-`aria-label="Peringkat
  1: …"`. Pola rating bintang yang sudah ada (SVG + `aria-label` ringkas)
  dipertahankan.
- Helper bersama ada di `src/components/shared.tsx`: `WeatherIcon`,
  `WaterIcon`, `WaterBodyIcon`, `FishingTypeIcon`, dan `CatchIcon`
  (dipakai badge kartu resep, kartu komunitas, ulasan, dan moderasi).
  Badge tangkapan di `src/lib/catch-details.ts` kini membawa kunci ikon
  (`ikan`/`durasi`/`joran`/`laju`), bukan karakter emoji. Pilihan bahan di
  sistem pakar memakai kunci ikon per bahan dari
  `src/data/ingredient-knowledge.ts`.
- Judul bagian yang dulu berawalan emoji (🏆/🔥/🌦️/🗺️/🎯) kini teks bersih;
  label `eyebrow` di atasnya sudah memberi konteks.
- **Kontras WCAG AA**: warna teks abu/hijau kecil yang tidak mencapai
  4,5:1 di latar terang digelapkan sambil mempertahankan rona warnanya
  (termasuk teks 9–11px di kartu dan dashboard), dan bintang rating
  digelapkan ke 4,3:1 agar memenuhi kontras grafis 3:1 (WCAG 1.4.11).
- Terverifikasi: tidak ada karakter emoji tersisa di `src/`, dan halaman
  publik yang tersaji (/, /katalog, /cuaca, /sistem-pakar, /ai-umpan,
  /resep/…) mengandung 0 emoji dengan ikon SVG + `aria-label`
  di seluruh halamannya.

## Ukuran gambar: `sizes` per konteks, satu `priority`, format AVIF/WebP

Semua URL `/_next/image` dulu bisa meminta lebar 3840, termasuk thumbnail
kartu. Penyebabnya bukan satu hal: atribut `sizes` belum mengikuti konteks
tampil, beberapa logo ikut memakai `priority`, dan daftar `deviceSizes`
bawaan Next masih menyediakan 3840 sehingga lebar itu selalu ditawarkan.

- **`sizes` per konteks** (browser memilih lebar terkecil yang cukup dari
  `srcset`, termasuk faktor DPR):
  - kartu resep (grid katalog 1/2/3 kolom): `(max-width: 640px) 90vw,
    (max-width: 1280px) 45vw, 33vw` — ponsel ±384px, desktop ±640px;
  - kartu komunitas: `(max-width: 768px) 90vw, (max-width: 1280px) 45vw, 33vw`;
  - kartu rekomendasi: `(max-width: 768px) 100vw, (max-width: 1280px) 44vw, 560px`;
  - hero beranda: `(max-width: 1279px) 100vw, 1280px`; hero halaman resep:
    `(max-width: 1023px) 100vw, 48vw`.
- **`priority`/`preload` hanya untuk hero beranda** (`src/components/hero.tsx`).
  Logo navigasi, logo halaman login, dan hero halaman resep tidak lagi
  dipreload — halaman resep tetap mendapat gambar utamanya lebih dulu lewat
  urutan dokumen tanpa preload paksa.
- **`deviceSizes` dibatasi** `[640, 750, 828, 1080, 1200, 1920, 2048]` di
  `next.config.ts`: 3840 dibuang, jadi tidak ada lagi penawaran/permintaan
  `w=3840`; 2048 tetap cukup untuk hero 1280px pada DPR 2.
- **Format AVIF/WebP aktif** (`images.formats: ["image/avif", "image/webp"]`):
  terverifikasi server membalas `image/avif` untuk browser yang menerima
  AVIF, `image/webp` sebagai cadangan, dan JPEG untuk sisanya. Contoh
  thumbnail kartu `w=384` kini ±18 KB dari berkas asli 190 KB.
- **Semua gambar lain ikut dioptimalkan** — tidak ada lagi `unoptimized`
  di `src/`. Logo navbar/footer (tampil 36–44px) kini melewati pengoptimal:
  dari berkas PNG 512px 145 KB menjadi AVIF `w=64` ±2 KB dengan `srcset`
  1x/2x saja (48/96). Poster popup (tampil ≤430px ponsel / ≤820px desktop)
  memakai `sizes` sesuai lebar modalnya: dari 88–122 KB menjadi ±22–28 KB
  AVIF. Thumbnail konten di dashboard juga teroptimasi. Satu pengecualian:
  pratinjau di dashboard Tampilan (logo, logo footer, hero, poster popup,
  latar popup) sengaja `unoptimized` — pratinjau itu memakai penanda versi
  `?v=` agar gambar yang baru diunggah langsung terlihat, sedangkan
  pengoptimal Next menolak `src` lokal ber-query string (400 "url
  parameter is not allowed") sehingga pratinjaunya sempat hilang/rusak.
  Berkasnya dimuat langsung dari `/api/media/...` yang memang ringan;
  gambar publik tetap teroptimasi penuh.
  Syaratnya, `/api/media/[key]` kini menyajikan berkas bawaan langsung
  dengan status 200 (membaca `public/`), bukan redirect 307 — pengoptimal
  Next menolak sumber ber-redirect, jadi tanpa ini logo/poster bawaan gagal
  dioptimalkan. Unggahan dashboard tetap didahulukan dari database.
- Berkas sumber ikut dipangkas: logo PNG 512px 145 KB → PNG8 256px 24 KB
  (tampil maks 104px), dan 14 foto JPG >140 KB dikompresi ulang (hemat
  ±0,5 MB) tanpa mengubah dimensinya.

## Render server (SSG/ISR): tanpa splash, skeleton hanya untuk pulau data

Halaman publik tidak lagi pernah menampilkan layar loading satu halaman
penuh. Sebelumnya setiap halaman — termasuk yang sinkron — membuka dengan
skeleton generik karena `src/app/loading.tsx` membuat Next menyajikan
dokumen "cangkang + konten yang ditukar masuk lewat skrip"; hero (elemen
LCP) ikut tertunda di balik pertukaran itu. Sekarang polanya:

- **SSG/ISR untuk semua halaman publik.** Beranda, `/cuaca`,
  `/provinsi/[slug]`, dan `/resep/[slug]` mengekspor
  `export const revalidate = 3600`: HTML statis dibangun ulang di latar
  belakang paling lambat tiap jam (pengunjung tidak pernah menunggu
  render), dan angka rating dari database ikut segar maksimal sejam —
  tanpa halaman berubah menjadi render dinamis per kunjungan.
- **`loading.tsx` dihapus dari rute publik.** Tanpa batas loading, Next
  menunggu render selesai saat prerender sehingga HTML awal yang diterima
  pengunjung sudah memuat judul, hero, dan konten lengkap (terverifikasi:
  tidak ada batas tertunda di HTML `/`, `/katalog`,
  `/resep/...`). Hanya `/dashboard` (dinamis, di balik login) yang
  mempertahankan `loading.tsx` sendiri untuk umpan balik navigasi admin.
- **Yang menunggu data dibungkus `Suspense`, bukan menahan halaman.**
  Halaman beranda dan cuaca kini sinkron; seksi yang urutannya bergantung
  pada rating pengunjung (Rekomendasi Terbaik, Racikan Populer, grid
  provinsi populer, daftar panduan cuaca, statistik provinsi) adalah
  komponen server async kecil di dalam `<Suspense>` dengan penampung
  skeleton yang meniru tata letak aslinya (`src/components/skeletons.tsx`),
  jadi hero tampil duluan dan tidak ada pergeseran tata letak berarti.
  `getRecipeRatings()` dibungkus `cache()` React agar pulau-pulau dalam
  satu halaman berbagi satu query.
- **Angka rating tidak lagi berkedip dari klien.** Seksi server yang sudah
  menghitung rating untuk pengurutan kini meneruskannya ke kartu resep
  (`initialRating` → `useRecipeRating()`): HTML awal langsung memuat angka
  yang benar, bukan "Belum ada rating" yang berganti setelah pengambilan
  `/api/public/reviews/summary` di peramban. Pola yang sama berlaku untuk
  rating di kepala halaman detail (`LiveRecipeRating`) dan kotak ringkasan
  ulasan: agregat server (ISR) tampil sampai data klien selesai dimuat,
  setelah itu data klien yang berwenang penuh.
- **Banner izin lokasi tidak lagi menggeser konten.** Banner kini melayang
  (`position: fixed`) di atas navigasi bawah, bukan menyisip di alur
  halaman setelah hidrasi — pergeseran tata letak (CLS) dari kemunculannya
  hilang, isi dan perilakunya sama.
- **LCP dijaga strukturnya:** gambar hero beranda tetap satu-satunya yang
  di-`preload` (muncul sebagai `<link rel="preload" as="image">` di
  `<head>` dengan `fetchPriority` tinggi), dan kini hero benar-benar
  berada di cangkang HTML pertama, bukan di segmen tersembunyi.
  Pemeriksaan PageSpeed Insights untuk angka LCP final dilakukan manual
  di https://pagespeed.web.dev untuk URL produksi setelah deploy (API
  publiknya tidak selalu tersedia dari lingkungan pengembangan).

## Izin lokasi (opsional)

Kolom lokasi tidak lagi memakai nilai bawaan seperti "Jawa Barat". Tanpa izin lokasi, form dibiarkan kosong dan pengguna mengisinya manual.

- **Banner di beranda** muncul melayang di bagian bawah layar (tidak menggeser konten) saat pengguna belum pernah memutuskan. Pilihan "Izinkan lokasi" menjalankan deteksi; "Nanti saja" menyimpan keputusan menolak sehingga banner tidak muncul lagi dan form tetap kosong.
- **Tombol "Gunakan lokasi saya"** tersedia di setiap form berisi lokasi: Cari Umpan di beranda, AI Umpan, Sistem Pakar, filter katalog, dan form ulasan. Setelah izin diberikan, tombol berubah menjadi chip lokasi dengan aksi **Perbarui** dan **Lupakan**.
- **Form menyesuaikan lokasi**: provinsi terisi otomatis. Nama kota ikut terisi (dan dipakai filter kota katalog) hanya bila lokasi dekat dengan titik referensi kota (radius 35 km di `src/data/province-geo.ts`) dan akurasi perangkat lebih baik dari radius tersebut. Pilihan manual selalu menang dan tidak ditimpa deteksi berikutnya.
- **Deteksi berjalan sepenuhnya di perangkat.** Koordinat GPS diterjemahkan menjadi provinsi/kota memakai daftar titik referensi kota di `src/data/province-geo.ts` (perkiraan pusat kota/kabupaten, bukan batas administrasi resmi). Tidak ada permintaan jaringan atau pengiriman koordinat ke server, analitik, maupun CMS. Hasil deteksi disimpan di `localStorage` (`umpan-mas-location-consent`, `umpan-mas-location-place-v1`) dan dapat dihapus lewat tombol **Lupakan**.
- **Izin browser yang sudah pernah diberikan** (misalnya sebelum fitur ini ada) dipakai lewat `LocationPermissionSync` di root layout: form langsung menyesuaikan lokasi tanpa prompt ulang, dan pilihan "Nanti saja" tetap dihormati.
- Kegagalan deteksi ditampilkan dengan pesan spesifik: perangkat tidak mendukung, koneksi tidak HTTPS, izin ditolak, waktu habis, atau lokasi diblokir karena halaman tersemat (iframe) — pada kasus terakhir pengguna diarahkan membuka situs di tab baru atau mengisi lokasi manual.

## SEO dan performa

- **Aset merek**: logo berada di `public/images/logo-umpan-mas.png` (512px, latar transparan) dan dirujuk lewat `src/lib/brand.ts` agar hanya ada satu sumber. Favicon memakai konvensi Next.js: `src/app/icon.png` (256px) dan `src/app/apple-icon.png` (180px, diratakan ke putih karena iOS tidak mendukung transparansi). Logo juga dikirim sebagai `logo`/`image` pada structured data `Organization` agar Google dapat menampilkan identitas merek.
- Metadata halaman mencakup judul/deskripsi, canonical, Open Graph, Twitter Card, dan robots. Atur `NEXT_PUBLIC_SITE_URL` ke origin domain produksi kustom di Netlify bila domain tersebut berbeda dari `URL` bawaan Netlify; tanpa origin produksi, canonical absolut dan URL sitemap sengaja tidak diarahkan ke `localhost`.
- `/robots.txt` mengarahkan crawler ke `/sitemap.xml`. Sitemap memuat halaman publik, resep katalog, 38 halaman provinsi, dan resep CMS berstatus `published` saja. Draft, dashboard, API, dan profil lokal tidak ditujukan untuk indeks pencarian. Area admin ditutup tiga lapis: `Disallow` di `robots.txt`, header `X-Robots-Tag: noindex, nofollow` dari `src/proxy.ts`, dan metadata `robots` di layout dashboard.
- Structured data memakai `Organization`/`WebSite`, `Recipe`, `BreadcrumbList`, dan `CollectionPage` untuk halaman daerah. Halaman provinsi menghubungkan konten komunitas dengan wilayah administratif Indonesia.
- UMPAN MAS adalah platform komunitas daring, bukan toko dengan lokasi fisik yang telah diverifikasi. Karena itu, jangan menambahkan alamat, nomor telepon, jam buka, atau markup `LocalBusiness` fiktif. Jika ada lokasi usaha yang benar-benar melayani pengunjung, lengkapi NAP (nama, alamat, telepon) yang konsisten dan profil Google Business Profile sebelum mengaktifkan data bisnis lokal.
- Gambar memakai `next/image` dengan preload selektif untuk gambar LCP, format AVIF/WebP, ukuran responsif, cache gambar statis, dan request analitik yang ditunda agar tidak mengganggu render awal. Setelah deploy, daftarkan domain produksi di Google Search Console dan kirim URL sitemap.
- **Hasil PageSpeed (17 Okt 2026, data lab)**: mobile Performance 84 (FCP 1,4 dtk, LCP 3,5 dtk, TBT 30 ms, CLS 0,017), desktop 94 (LCP 0,7 dtk, CLS 0), Accessibility 96, SEO 100; belum ada data lapangan CrUX. Perbaikan susulannya: cache `/api/media` panjang (foto berversi `immutable` setahun; aset tetap sehari + `stale-while-revalidate`, pratinjau dasbor tetap segar lewat `?v=`), hero LCP memakai `fetchPriority="high"`, poster popup memakai art direction `<picture>` agar hanya satu varian terunduh, klien Supabase di header dimuat dinamis, dan `browserslist` modern di `package.json` memangkas polyfill lama.

## Pemeriksaan otomatis (CI)

Setiap pull request menjalankan GitHub Actions (`.github/workflows/ci.yml`): `npm ci`, `npm run typecheck`, `npm run lint`, dan `npm run build` di Node 22. PR yang gagal di salah satu langkah tidak seharusnya digabung.

## Menjalankan secara lokal

```bash
npm install
npm run dev            # http://localhost:3000
npm run supabase:check # opsional: periksa konfigurasi Supabase & PostgreSQL
```
