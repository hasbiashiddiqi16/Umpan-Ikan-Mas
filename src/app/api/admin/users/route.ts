import { sql } from "drizzle-orm";
import { db } from "@/db";
import { requireAdminApi } from "@/lib/admin-auth";
import { databaseErrorResponse } from "@/lib/database-status";

export const dynamic = "force-dynamic";

type BarisPengguna = {
  id: string;
  email: string;
  nama_meta: string | null;
  providers: string | null;
  email_terkonfirmasi: boolean;
  created_at: string;
  last_sign_in_at: string | null;
  jumlah_resep: number;
  jumlah_ulasan: number;
  jumlah_favorit: number;
};

function pesanSkemaAuth(error: unknown): string | null {
  const teks = error instanceof Error ? `${error.message} ${(error as { cause?: unknown }).cause ?? ""}` : String(error);
  if (/auth\.users|auth\.identities|schema ["']?auth|relation .*auth/i.test(teks)) {
    return "Daftar pengguna belum bisa dibaca dari basis data ini. Pastikan DATABASE_URL menunjuk Postgres proyek Supabase yang sama dengan NEXT_PUBLIC_SUPABASE_URL (skema auth proyek itu yang memuat akun terdaftar).";
  }
  return null;
}

/**
 * Pengguna terdaftar (Supabase Auth) beserta aktivitasnya di situs.
 *
 * Akun tinggal di skema `auth` milik proyek Supabase, sedangkan situs
 * memakai proyek Postgres yang sama lewat DATABASE_URL — jadi daftar ini
 * cukup dibaca dengan SQL baca-saja, tanpa kunci service role tambahan.
 * Setiap pengguna digabung dengan hitungan resep yang ia bagikan
 * (`cms_recipes.owner_id`), ulasan yang ia kirim (`cms_reviews.user_id`),
 * dan favorit tersinkronnya (`user_favorites`).
 */
export async function GET() {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;
  try {
    const hasil = await db.execute(sql`
      select
        u.id::text as id,
        coalesce(u.email, '') as email,
        coalesce(
          u.raw_user_meta_data->>'display_name',
          u.raw_user_meta_data->>'full_name',
          u.raw_user_meta_data->>'name',
          ''
        ) as nama_meta,
        coalesce(
          (select string_agg(distinct i.provider, ', ' order by i.provider)
             from auth.identities i where i.user_id = u.id),
          'email'
        ) as providers,
        (u.email_confirmed_at is not null) as email_terkonfirmasi,
        u.created_at::text as created_at,
        u.last_sign_in_at::text as last_sign_in_at,
        (select count(*)::int from cms_recipes r where r.owner_id = u.id) as jumlah_resep,
        (select count(*)::int from cms_reviews rv where rv.user_id = u.id) as jumlah_ulasan,
        (select count(*)::int from user_favorites f where f.user_id = u.id) as jumlah_favorit
      from auth.users u
      order by u.created_at desc
      limit 300
    `);
    const rows = (Array.isArray(hasil) ? hasil : (hasil as { rows?: unknown[] }).rows ?? []) as BarisPengguna[];
    return Response.json({
      tersedia: true,
      users: rows.map((row) => {
        const email = typeof row.email === "string" ? row.email : "";
        const namaMeta = typeof row.nama_meta === "string" ? row.nama_meta.trim() : "";
        return {
          id: row.id,
          email,
          name: namaMeta || (email.split("@")[0] ?? "") || "Pengguna",
          providers: typeof row.providers === "string" && row.providers ? row.providers : "email",
          emailConfirmed: Boolean(row.email_terkonfirmasi),
          createdAt: row.created_at,
          lastSignInAt: row.last_sign_in_at,
          recipeCount: Number(row.jumlah_resep ?? 0),
          reviewCount: Number(row.jumlah_ulasan ?? 0),
          favoriteCount: Number(row.jumlah_favorit ?? 0),
        };
      }),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const pesan = pesanSkemaAuth(error);
    if (pesan) {
      return Response.json({ tersedia: false, users: [], pesan }, { headers: { "Cache-Control": "no-store" } });
    }
    return databaseErrorResponse(error, "Pengguna terdaftar belum dapat dimuat.");
  }
}
