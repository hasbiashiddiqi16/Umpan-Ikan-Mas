# UMPAN MAS

Platform rekomendasi racikan umpan ikan mas dengan katalog, komunitas, dan Content Studio.

## Konfigurasi server

Aplikasi menggunakan Netlify Database (PostgreSQL) melalui Drizzle ORM. Koneksi dikonfigurasi otomatis oleh Netlify, sehingga `DATABASE_URL` tidak perlu diatur dan impor route API saat build tidak membuka koneksi database.

Skema tabel berada di `db/schema.ts`. Migrasi di `netlify/database/migrations` diterapkan otomatis oleh Netlify saat deploy, sebelum aplikasi dipublikasikan. Setelah mengubah skema, buat migrasi baru dengan `npx drizzle-kit generate --name nama_perubahan`. Jangan menjalankan migrasi secara manual.

## Admin Content Studio

Buka `/login` untuk masuk ke dashboard. Halaman dashboard dan endpoint `/api/admin/*` dilindungi oleh sesi admin HttpOnly yang kedaluwarsa setelah 8 jam.

Atur `ADMIN_PASSWORD` sebagai environment variable server-side sebelum menjalankan aplikasi atau deploy. Untuk pengembangan lokal, salin `.env.example` menjadi `.env.local` lalu isi password yang diinginkan. Di Netlify, tambahkan `ADMIN_PASSWORD` pada environment variables dengan scope yang mencakup deploy production. Jangan gunakan awalan `NEXT_PUBLIC_` dan jangan commit file `.env.local`.

`ADMIN_SESSION_SECRET` opsional; jika tidak diatur, password admin digunakan untuk menandatangani sesi. Gunakan password yang panjang dan unik untuk deployment publik.

Di `/dashboard/konten`, gunakan **Sinkronkan katalog** setelah deploy untuk memasukkan atau memperbarui 200 resep sumber dan 5.000 ulasan contoh ke CMS. Sinkronisasi aman diulangi: setiap ulasan katalog memiliki kunci unik sehingga tidak diduplikasi. Karena sinkronisasi mengikuti data sumber, perubahan manual pada resep sumber dengan slug yang sama akan diperbarui kembali ke versi katalog terbaru.

## Izin lokasi (opsional)

Kolom lokasi tidak lagi memakai nilai bawaan seperti "Jawa Barat". Tanpa izin lokasi, form dibiarkan kosong dan pengguna mengisinya manual.

- **Banner di beranda** muncul saat pengguna belum pernah memutuskan. Pilihan "Izinkan lokasi" menjalankan deteksi; "Nanti saja" menyimpan keputusan menolak sehingga banner tidak muncul lagi dan form tetap kosong.
- **Tombol "Gunakan lokasi saya"** tersedia di setiap form berisi lokasi: Cari Umpan di beranda, AI Umpan, Sistem Pakar, filter katalog, dan form ulasan. Setelah izin diberikan, tombol berubah menjadi chip lokasi dengan aksi **Perbarui** dan **Lupakan**.
- **Form menyesuaikan lokasi**: provinsi terisi otomatis. Nama kota ikut terisi (dan dipakai filter kota katalog) hanya bila lokasi dekat dengan titik referensi kota (radius 35 km di `src/data/province-geo.ts`) dan akurasi perangkat lebih baik dari radius tersebut. Pilihan manual selalu menang dan tidak ditimpa deteksi berikutnya.
- **Deteksi berjalan sepenuhnya di perangkat.** Koordinat GPS diterjemahkan menjadi provinsi/kota memakai daftar titik referensi kota di `src/data/province-geo.ts` (perkiraan pusat kota/kabupaten, bukan batas administrasi resmi). Tidak ada permintaan jaringan atau pengiriman koordinat ke server, analitik, maupun CMS. Hasil deteksi disimpan di `localStorage` (`umpan-mas-location-consent`, `umpan-mas-location-place-v1`) dan dapat dihapus lewat tombol **Lupakan**.
- **Izin browser yang sudah pernah diberikan** (misalnya sebelum fitur ini ada) dipakai lewat `LocationPermissionSync` di root layout: form langsung menyesuaikan lokasi tanpa prompt ulang, dan pilihan "Nanti saja" tetap dihormati.
- Kegagalan deteksi ditampilkan dengan pesan spesifik: perangkat tidak mendukung, koneksi tidak HTTPS, izin ditolak, waktu habis, atau lokasi diblokir karena halaman tersemat (iframe) — pada kasus terakhir pengguna diarahkan membuka situs di tab baru atau mengisi lokasi manual.

## SEO dan performa

- Metadata halaman mencakup judul/deskripsi, canonical, Open Graph, Twitter Card, dan robots. Atur `NEXT_PUBLIC_SITE_URL` ke origin domain produksi kustom di Netlify bila domain tersebut berbeda dari `URL` bawaan Netlify; tanpa origin produksi, canonical absolut dan URL sitemap sengaja tidak diarahkan ke `localhost`.
- `/robots.txt` mengarahkan crawler ke `/sitemap.xml`. Sitemap memuat halaman publik, resep katalog, 38 halaman provinsi, dan resep CMS berstatus `published` saja. Draft, dashboard, API, dan profil lokal tidak ditujukan untuk indeks pencarian.
- Structured data memakai `Organization`/`WebSite`, `Recipe`, `BreadcrumbList`, dan `CollectionPage` untuk halaman daerah. Halaman provinsi menghubungkan konten komunitas dengan wilayah administratif Indonesia.
- UMPAN MAS adalah platform komunitas daring, bukan toko dengan lokasi fisik yang telah diverifikasi. Karena itu, jangan menambahkan alamat, nomor telepon, jam buka, atau markup `LocalBusiness` fiktif. Jika ada lokasi usaha yang benar-benar melayani pengunjung, lengkapi NAP (nama, alamat, telepon) yang konsisten dan profil Google Business Profile sebelum mengaktifkan data bisnis lokal.
- Gambar memakai `next/image` dengan preload selektif untuk gambar LCP, format AVIF/WebP, ukuran responsif, cache gambar statis, dan request analitik yang ditunda agar tidak mengganggu render awal. Setelah deploy, daftarkan domain produksi di Google Search Console dan kirim URL sitemap.

## Menjalankan secara lokal

```bash
npm install
npx netlify dev --port 8889
```
