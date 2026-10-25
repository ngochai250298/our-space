"use client";

import { useCallback, useEffect, useState } from "react";
import type { AccountKind, Role } from "@/types";
import { apiGet } from "@/lib/api";
import { allAccounts, ensureAccountsLoaded } from "@/lib/auth";

export interface PresenceRow {
  role: Role;
  kind: AccountKind;
  /** Null until this person has shared a position at least once. */
  position: { lat: number; lng: number; accuracy: number; updatedAt: number } | null;
}

interface LocationRow {
  role: Role;
  lat: number;
  lng: number;
  accuracy: number;
  updated_at: string;
}

/** Slow tick so the online/offline badge ages out even when nobody moves. */
const REFRESH_MS = 30_000;

/**
 * Everyone in the house with their last known position, refreshed on demand.
 *
 * Driven by the account list rather than the locations table: someone who has
 * never shared a position still needs a row here, or the admin couldn't revoke
 * their session.
 */
export function useAdminStatus() {
  const [rows, setRows] = useState<PresenceRow[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    await ensureAccountsLoaded(true);
    let locations: LocationRow[];
    try {
      locations = await apiGet<LocationRow[]>("/api/locations");
    } catch {
      setError("Chưa đọc được vị trí.");
      setReady(true);
      return;
    }
    const byRole = new Map(
      locations.map((r) => [
        r.role,
        {
          lat: r.lat,
          lng: r.lng,
          accuracy: r.accuracy,
          updatedAt: new Date(r.updated_at).getTime(),
        },
      ])
    );
    setRows(
      allAccounts().map((a) => ({
        role: a.role,
        kind: a.kind,
        position: byRole.get(a.role) ?? null,
      }))
    );
    setError("");
    setReady(true);
  }, []);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), REFRESH_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  return { rows, ready, error, refresh };
}
