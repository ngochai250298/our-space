"use client";

import { useEffect } from "react";
import type { Session } from "@/types";
import { pushOwnLocation } from "@/lib/location";

const INTERVAL_MS = 10_000;

/**
 * While the site is open (any page), silently push the device's position
 * every 10 seconds — but only if location permission was already granted,
 * so the permission prompt itself only ever appears on the map screen.
 */
export function useLocationSync(session: Session | null): void {
  useEffect(() => {
    if (!session) return;
    let stopped = false;
    const tick = () => {
      if (!stopped) void pushOwnLocation(session.role, { prompt: false }).catch(() => {});
    };
    tick();
    const id = window.setInterval(tick, INTERVAL_MS);
    return () => {
      stopped = true;
      window.clearInterval(id);
    };
  }, [session]);
}
