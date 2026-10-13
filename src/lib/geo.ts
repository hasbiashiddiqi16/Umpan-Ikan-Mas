import { CITY_MATCH_RADIUS_KM, provinceReferencePoints, type ProvinceReferencePoint } from "@/data/province-geo";

const EARTH_RADIUS_KM = 6371;
const KM_PER_DEGREE_LATITUDE = 110.574;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Jarak lingkaran besar antara dua koordinat dalam kilometer. */
export function haversineKm(latitudeA: number, longitudeA: number, latitudeB: number, longitudeB: number): number {
  const deltaLatitude = toRadians(latitudeB - latitudeA);
  const deltaLongitude = toRadians(longitudeB - longitudeA);
  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(toRadians(latitudeA)) * Math.cos(toRadians(latitudeB)) * Math.sin(deltaLongitude / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function isValidCoordinate(latitude: number, longitude: number): boolean {
  return Number.isFinite(latitude) && Number.isFinite(longitude) &&
    latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}

export type ReferencePointMatch = {
  point: ProvinceReferencePoint;
  distanceKm: number;
};

/**
 * Titik referensi terdekat dihitung dengan rumus haversine sederhana; jumlah
 * titik referensi kecil sehingga pencarian linear sudah memadai.
 */
export function findNearestReferencePoint(latitude: number, longitude: number): ReferencePointMatch | null {
  if (!isValidCoordinate(latitude, longitude)) return null;
  let nearest: ReferencePointMatch | null = null;
  for (const point of provinceReferencePoints) {
    const distanceKm = haversineKm(latitude, longitude, point.latitude, point.longitude);
    if (!nearest || distanceKm < nearest.distanceKm) nearest = { point, distanceKm };
  }
  return nearest;
}

export type LocationMatch = {
  province: string;
  /** Nama kota bila lokasi cukup dekat dengan titik referensi kota. */
  city: string | null;
  referenceCity: string;
  distanceKm: number;
  cityRadiusKm: number;
};

export function matchProvinceAndCity(latitude: number, longitude: number): LocationMatch | null {
  const nearest = findNearestReferencePoint(latitude, longitude);
  if (!nearest) return null;
  return {
    province: nearest.point.province,
    city: nearest.distanceKm <= CITY_MATCH_RADIUS_KM ? nearest.point.city : null,
    referenceCity: nearest.point.city,
    distanceKm: Math.round(nearest.distanceKm * 10) / 10,
    cityRadiusKm: CITY_MATCH_RADIUS_KM,
  };
}

/** Perkiraan akurasi GPS dalam kilometer (radius 68% menurut spesifikasi Geolocation API). */
export function accuracyToKilometers(accuracyInMeters: number | null | undefined): number | null {
  if (typeof accuracyInMeters !== "number" || !Number.isFinite(accuracyInMeters) || accuracyInMeters < 0) return null;
  return Math.round((accuracyInMeters / 1000) * 10) / 10;
}

/** Jarak lintang satu derajat dipakai untuk pesan bantuan bila akurasi sangat kasar. */
export function degreesLatitudeFor(kilometers: number): number {
  return kilometers / KM_PER_DEGREE_LATITUDE;
}
