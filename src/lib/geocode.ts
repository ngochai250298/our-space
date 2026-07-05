"use client";

import { loadItem, saveItem } from "@/lib/storage";

/**
 * Reverse geocoding via OpenStreetMap Nominatim (free, no key).
 * Turns a GPS fix into a Vietnamese place label like
 * "Thành phố Hồ Chí Minh, Phường Thạnh Mỹ Tây, Việt Nam".
 *
 * Results are cached by ~100m grid cell (3 decimals) in localStorage, so a
 * person standing still never triggers repeat requests — well within
 * Nominatim's 1 req/s usage policy.
 */
const CACHE_KEY = "geocache.v2";
const MAX_CACHE_ENTRIES = 300;

interface NominatimAddress {
  suburb?: string;
  quarter?: string;
  neighbourhood?: string;
  village?: string;
  town?: string;
  city_district?: string;
  district?: string;
  county?: string;
  city?: string;
  province?: string;
  state?: string;
  country?: string;
}

function cellOf(lat: number, lng: number): string {
  return `${lat.toFixed(3)},${lng.toFixed(3)}`;
}

function buildLabel(a: NominatimAddress): string {
  // City first, then the most specific ward/district available, then country
  // — matching the "TP.HCM, Phường Thạnh Mỹ Tây, Việt Nam" format.
  const city = a.city ?? a.province ?? a.state ?? a.county;
  const ward =
    a.suburb ??
    a.quarter ??
    a.neighbourhood ??
    a.village ??
    a.town ??
    a.city_district ??
    a.district;
  const parts = [city, ward, a.country].filter(
    (p, i, arr): p is string => Boolean(p) && arr.indexOf(p) === i
  );
  return parts.join(", ");
}

const inFlight = new Map<string, Promise<string | null>>();

export function placeLabel(lat: number, lng: number): Promise<string | null> {
  const cell = cellOf(lat, lng);
  const cache = loadItem<Record<string, string>>(CACHE_KEY, {});
  if (cache[cell]) return Promise.resolve(cache[cell]);

  const pending = inFlight.get(cell);
  if (pending) return pending;

  const request = (async () => {
    try {
      const res = await fetch(
        // vi first, then en so places without a Vietnamese name (e.g. 渋谷区)
        // fall back to Latin script ("Shibuya") instead of local script.
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=16&accept-language=vi,en`,
        { headers: { Accept: "application/json" } }
      );
      if (!res.ok) return null;
      const data = (await res.json()) as { address?: NominatimAddress };
      const label = data.address ? buildLabel(data.address) : "";
      if (!label) return null;

      const fresh = loadItem<Record<string, string>>(CACHE_KEY, {});
      const keys = Object.keys(fresh);
      if (keys.length >= MAX_CACHE_ENTRIES) delete fresh[keys[0]];
      fresh[cell] = label;
      saveItem(CACHE_KEY, fresh);
      return label;
    } catch {
      return null;
    } finally {
      inFlight.delete(cell);
    }
  })();

  inFlight.set(cell, request);
  return request;
}
