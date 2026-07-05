"use client";

import type { LiveLocation, Role } from "@/types";
import { loadItem, saveItem } from "@/lib/storage";
import { getSupabase } from "@/lib/supabase";

const KEY = "locations";

/** A stored fix older than this is no longer treated as "real". */
export const FRESH_MS = 10 * 60 * 1000;

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
 * Reads the device's real GPS position, stores it locally and pushes it to
 * Supabase when sync is configured. With `prompt: false` it stays silent —
 * it only reads when permission was already granted (used for background
 * updates outside the map screen).
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

  const sb = getSupabase();
  if (sb)
    await sb.from("locations").upsert({
      role,
      lat: loc.lat,
      lng: loc.lng,
      accuracy: loc.accuracy,
      updated_at: new Date(loc.updatedAt).toISOString(),
    });

  return loc;
}

/**
 * Pulls the latest synced positions of both people from Supabase and stores
 * any fresher-than-local ones (which notifies every listening component).
 * No-op without a Supabase config.
 */
export async function refreshLocationsFromCloud(): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { data } = await sb.from("locations").select("*");
  if (!data) return;
  const stored = loadStoredLocations();
  for (const row of data as LocationRow[]) {
    const loc = rowToLocation(row);
    const existing = stored[loc.role];
    if (!existing || existing.updatedAt < loc.updatedAt || existing.approx)
      storeLocation(loc);
  }
}

/**
 * Streams everyone's real positions from Supabase (initial fetch +
 * realtime). No-op without a Supabase config. Returns an unsubscribe fn.
 */
export function subscribeLocations(
  onUpdate: (loc: LiveLocation) => void
): () => void {
  const sb = getSupabase();
  if (!sb) return () => {};

  void sb
    .from("locations")
    .select("*")
    .then(({ data }) => {
      (data as LocationRow[] | null)?.forEach((row) =>
        onUpdate(rowToLocation(row))
      );
    });

  const channel = sb
    .channel("locations-live")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "locations" },
      (payload) => {
        const row = payload.new as LocationRow;
        if (row?.role) onUpdate(rowToLocation(row));
      }
    )
    .subscribe();

  return () => void sb.removeChannel(channel);
}
