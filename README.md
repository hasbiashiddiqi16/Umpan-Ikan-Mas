# UMPAN MAS

Platform rekomendasi racikan umpan ikan mas dengan katalog, komunitas, dan Content Studio.

## Konfigurasi server

Aplikasi menggunakan Netlify Database (PostgreSQL) melalui Drizzle ORM. Koneksi dikonfigurasi otomatis oleh Netlify, sehingga `DATABASE_URL` tidak perlu diatur dan impor route API saat build tidak membuka koneksi database.

Skema tabel berada di `db/schema.ts`. Migrasi di `netlify/database/migrations` diterapkan otomatis oleh Netlify saat deploy, sebelum aplikasi dipublikasikan. Setelah mengubah skema, buat migrasi baru dengan `npx drizzle-kit generate --name nama_perubahan`. Jangan menjalankan migrasi secara manual.

## Admin Content Studio

Buka `/login` untuk masuk ke dashboard. Halaman dashboard dan endpoint `/api/admin/*` dilindungi oleh sesi admin HttpOnly yang kedaluwarsa setelah 8 jam.

Atur `ADMIN_PASSWORD` sebagai environment variable server-side sebelum menjalankan aplikasi atau deploy. Untuk pengembangan lokal, salin `.env.example` menjadi `.env.local` lalu isi password yang diinginkan. Di Netlify, tambahkan `ADMIN_PASSWORD` pada environment variables dengan scope yang mencakup deploy production. Jangan gunakan awalan `NEXT_PUBLIC_` dan jangan commit file `.env.local`.

`ADMIN_SESSION_SECRET` opsional; jika tidak diatur, password admin digunakan untuk menandatangani sesi. Gunakan password yang panjang dan unik untuk deployment publik.

## Menjalankan secara lokal

```bash
npm install
npx netlify dev --port 8889
```
