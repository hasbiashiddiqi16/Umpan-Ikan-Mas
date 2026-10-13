import type { NextRequest } from "next/server";

import { updateSession } from "@/utils/supabase/middleware";

/**
 * Titik masuk proxy (konvensi Next.js 16, sebelumnya `middleware.ts`).
 * Tugasnya hanya menyegarkan sesi Supabase; tidak ada pengalihan atau pemblokiran
 * rute di sini, jadi permintaan tetap diteruskan apa adanya.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Lewati aset statis dan berkas gambar: tidak perlu menyentuh sesi di sana.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
