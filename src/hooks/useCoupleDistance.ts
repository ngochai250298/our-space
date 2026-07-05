"use client";

import { useEffect, useMemo, useState } from "react";
import type { CoupleRole, LiveLocation, Role } from "@/types";
import { useSettings } from "@/hooks/useSettings";
import {
  loadStoredLocations,
  refreshLocationsFromCloud,
} from "@/lib/location";
import { distanceKm } from "@/lib/geo";

/**
 * The real distance between the two of you — the same numbers the map uses:
 * last known GPS fixes (local + Supabase), falling back to the home cities
 * from Settings only when no fix exists yet. Live-updates whenever a fresher
 * position is stored (own 10s pushes or cloud refresh).
 */
export function useCoupleDistance(): number {
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
    const point = (role: CoupleRole) => {
      const loc = locations[role];
      if (loc) return { lat: loc.lat, lng: loc.lng };
      const place = settings.places[role];
      return { lat: place.lat, lng: place.lng };
    };
    const a = point("anh");
    const b = point("em");
    return distanceKm(a.lat, a.lng, b.lat, b.lng);
  }, [locations, settings]);
}
