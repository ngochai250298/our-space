"use client";

import type { LiveLocation, Role } from "@/types";
import { loadItem, saveItem } from "@/lib/storage";
import { apiGet, apiPut } from "@/lib/api";

const KEY = "locations";

/** A stored fix older than this is no longer treated as "real". */
export const FRESH_MS = 10 * 60 * 1000;

/** No realtime channel on D1 — the map polls instead. */
const POLL_MS = 5000;

interface LocationRow {
  role: Role;
  lat: number;
  lng: number;
  accuracy: number;
  updated_at: string;
}

export function loadStoredLocations(): Partial<Record<Role, LiveLocation>> {
  return loadItem<Partial<Record<Role, LiveLocation>>>(KEY, {});
}

export function storeLocation(loc: LiveLocation): void {
  saveItem(KEY, { ...loadStoredLocations(), [loc.role]: loc });
}

export function rowToLocation(row: LocationRow): LiveLocation {
  return {
    role: row.role,
    lat: row.lat,
    lng: row.lng,
    accuracy: row.accuracy,
    updatedAt: new Date(row.updated_at).getTime(),
    approx: false,
  };
}

/**
 * Reads the device's real GPS position, stores it locally and pushes it to the
 * server. With `prompt: false` it stays silent — it only reads when permission
 * was already granted (used for background updates outside the map screen).
 */
export async function pushOwnLocation(
  role: Role,
  opts: { prompt: boolean }
): Promise<LiveLocation | null> {
  if (typeof navigator === "undefined" || !("geolocation" in navigator))
    return null;

  if (!opts.prompt && "permissions" in navigator) {
    try {
      const status = await navigator.permissions.query({ name: "geolocation" });
      if (status.state !== "granted") return null;
    } catch {
      // Permissions API unavailable — fall through and try anyway.
    }
  }

  const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 10000,
    })
  );

  const loc: LiveLocation = {
    role,
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
    accuracy: pos.coords.accuracy,
    updatedAt: Date.now(),
    approx: false,
  };
  storeLocation(loc);

  // A failed push just means this fix stays on the device for now.
  await apiPut(`/api/locations/${role}`, {
    lat: loc.lat,
    lng: loc.lng,
    accuracy: loc.accuracy,
  }).catch(() => {});

  return loc;
}

/**
 * Pulls the latest synced positions of everyone and stores any
 * fresher-than-local ones (which notifies every listening component).
 */
export async function refreshLocationsFromCloud(): Promise<void> {
  const rows = await apiGet<LocationRow[]>("/api/locations").catch(() => null);
  if (!rows) return;
  const stored = loadStoredLocations();
  for (const row of rows) {
    const loc = rowToLocation(row);
    const existing = stored[loc.role];
    if (!existing || existing.updatedAt < loc.updatedAt || existing.approx)
      storeLocation(loc);
  }
}

/**
 * Streams everyone's real positions (one read now, then every few seconds).
 * Returns an unsubscribe fn.
 */
export function subscribeLocations(
  onUpdate: (loc: LiveLocation) => void
): () => void {
  let cancelled = false;
  const pull = () => {
    apiGet<LocationRow[]>("/api/locations")
      .then((rows) => {
        if (!cancelled) rows.forEach((row) => onUpdate(rowToLocation(row)));
      })
      .catch(() => {});
  };
  pull();
  const timer = window.setInterval(pull, POLL_MS);
  return () => {
    cancelled = true;
    window.clearInterval(timer);
  };
}
