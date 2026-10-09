export type IngredientRole = "Dasar" | "Pengikat" | "Protein" | "Aroma" | "Pelembap";

export type IngredientKnowledge = {
  id: string;
  name: string;
  emoji: string;
  role: IngredientRole;
  weight: number;
  keywords: string[];
  note: string;
  use: string;
};

/** Curated, inspectable ingredient knowledge. Ratios are starting-point weights, not guarantees. */
export const ingredientKnowledge: IngredientKnowledge[] = [
  { id: "pelet-ikan", name: "Pelet ikan", emoji: "🟤", role: "Dasar", weight: 48, keywords: ["pelet", "781", "jitu", "sakura"], note: "Fondasi adonan dan pembawa aroma.", use: "Mulai dari bahan dasar, lalu atur kelembapan perlahan." },
  { id: "roti-tawar", name: "Roti tawar", emoji: "🍞", role: "Dasar", weight: 38, keywords: ["roti tawar", "sari roti", "roti"], note: "Basis ringan yang mudah dipulung.", use: "Remas hingga halus sebelum bahan cair ditambahkan." },
  { id: "tepung-tapioka", name: "Tepung tapioka", emoji: "🥣", role: "Pengikat", weight: 16, keywords: ["tapioka", "kanji"], note: "Membantu adonan lebih menyatu.", use: "Masukkan sedikit demi sedikit agar adonan tidak terlalu keras." },
  { id: "tepung-terigu", name: "Tepung terigu", emoji: "🌾", role: "Pengikat", weight: 14, keywords: ["terigu", "tepung roti", "tepung ketan"], note: "Memberi struktur dan membantu adonan bertahan di kail.", use: "Campur rata dengan bahan kering terlebih dahulu." },
  { id: "telur", name: "Telur", emoji: "🥚", role: "Pengikat", weight: 12, keywords: ["telur", "kuning telur"], note: "Mengikat campuran dan menambah kelembapan.", use: "Tambahkan bertahap sambil cek tekstur." },
  { id: "kroto", name: "Kroto", emoji: "🔴", role: "Protein", weight: 12, keywords: ["kroto", "semut rangrang"], note: "Pelengkap berprotein yang umum digunakan pemancing.", use: "Aduk perlahan di tahap akhir agar tetap utuh." },
  { id: "jagung", name: "Jagung manis", emoji: "🌽", role: "Aroma", weight: 15, keywords: ["jagung", "corn"], note: "Memberi karakter manis dan warna alami.", use: "Haluskan secukupnya sebelum dicampur ke basis." },
  { id: "susu-bubuk", name: "Susu bubuk", emoji: "🥛", role: "Aroma", weight: 12, keywords: ["susu bubuk", "dancow", "full cream"], note: "Memberi aroma gurih lembut pada racikan.", use: "Gunakan sebagai campuran kering; hindari berlebihan." },
  { id: "keju", name: "Keju", emoji: "🧀", role: "Aroma", weight: 10, keywords: ["keju", "cheddar", "kraft"], note: "Pilihan aroma gurih untuk variasi racikan.", use: "Parut halus dan campurkan merata." },
  { id: "pandan", name: "Pandan", emoji: "🌿", role: "Aroma", weight: 8, keywords: ["pandan", "vanila", "essen"], note: "Aroma ringan; bentuknya bisa daun, air, atau essen.", use: "Essen tidak termasuk hitungan gram; gunakan beberapa tetes saja." },
  { id: "santan", name: "Santan", emoji: "🥥", role: "Pelembap", weight: 12, keywords: ["santan", "kara", "susu kedelai"], note: "Membantu kelembapan dan karakter gurih.", use: "Tuangkan sedikit demi sedikit sampai adonan mudah dibentuk." },
  { id: "kelapa", name: "Kelapa", emoji: "🥥", role: "Aroma", weight: 11, keywords: ["kelapa", "kacang tanah", "sangrai"], note: "Bahan aroma lokal dengan tekstur tambahan.", use: "Sangrai atau haluskan sesuai resep yang dipilih." },
];
