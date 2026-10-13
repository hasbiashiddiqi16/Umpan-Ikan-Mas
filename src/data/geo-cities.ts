export type CatalogCity = {
  name: string;
  province: string;
};

/**
 * Kota yang tersedia pada filter katalog. Lokasi pengguna hanya dipakai untuk
 * mengisi filter kota bila kota hasil deteksi ada di daftar ini, agar filter
 * tidak pernah berakhir pada pilihan yang tidak tersedia (0 hasil).
 */
export const catalogCities: CatalogCity[] = [
  { name: "Jakarta", province: "DKI Jakarta" },
  { name: "Bogor", province: "Jawa Barat" },
  { name: "Depok", province: "Jawa Barat" },
  { name: "Bekasi", province: "Jawa Barat" },
  { name: "Bandung", province: "Jawa Barat" },
  { name: "Semarang", province: "Jawa Tengah" },
  { name: "Yogyakarta", province: "DI Yogyakarta" },
  { name: "Surabaya", province: "Jawa Timur" },
  { name: "Palembang", province: "Sumatera Selatan" },
  { name: "Denpasar", province: "Bali" },
];

export const catalogCityNames: string[] = catalogCities.map((city) => city.name);

const catalogCityLookup: Record<string, string> = catalogCities.reduce<Record<string, string>>((lookup, city) => {
  lookup[city.name] = city.province;
  return lookup;
}, {});

export function isCatalogCity(value: string | null | undefined): boolean {
  return typeof value === "string" && value in catalogCityLookup;
}

export function provinceForCatalogCity(value: string | null | undefined): string | undefined {
  return typeof value === "string" ? catalogCityLookup[value] : undefined;
}
