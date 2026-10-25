"use client";

import { useEffect, useMemo, useState } from "react";
import type { LiveLocation, Role } from "@/types";
import { useSettings } from "@/hooks/useSettings";
import {
  loadStoredLocations,
  refreshLocationsFromCloud,
} from "@/lib/location";
import { distanceKm } from "@/lib/geo";

/**
 * The real distance between two people — the same numbers the map uses: last
 * known GPS fixes (local + server), falling back to the home cities from
 * Settings for the couple only, since they are the two the app knows a city
 * for. Live-updates whenever a fresher position is stored (own 10s pushes or
 * a cloud refresh).
 *
 * Returns null when either side has no position yet (or there is nobody to
 * measure to), so the screen can show "…" instead of a made-up number.
 */
export function useDistanceBetween(
  from: Role | null,
  to: Role | null
): number | null {
  const { settings } = useSettings();
  const [locations, setLocations] = useState<Partial<Record<Role, LiveLocation>>>({});

  useEffect(() => {
    const sync = () => setLocations(loadStoredLocations());
    sync();
    const onChange = (e: Event) => {
      if ((e as CustomEvent<string>).detail === "locations") sync();
    };
    window.addEventListener("ourspace:storage", onChange);
    void refreshLocationsFromCloud();
    return () => window.removeEventListener("ourspace:storage", onChange);
  }, []);

  return useMemo(() => {
    if (!from || !to) return null;
    const point = (role: Role) => {
      const loc = locations[role];
      if (loc) return { lat: loc.lat, lng: loc.lng };
      if (role === "anh" || role === "em") {
        const place = settings.places[role];
        return { lat: place.lat, lng: place.lng };
      }
      return null;
    };
    const a = point(from);
    const b = point(to);
    if (!a || !b) return null;
    return distanceKm(a.lat, a.lng, b.lat, b.lng);
  }, [from, to, locations, settings]);
}
