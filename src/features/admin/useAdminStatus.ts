"use client";

import { useCallback, useEffect, useState } from "react";
import type { AccountKind, Role } from "@/types";
import { getSupabase, liveTopic } from "@/lib/supabase";
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
    const sb = getSupabase();
    if (!sb) {
      setError("Chưa cấu hình Supabase.");
      setReady(true);
      return;
    }
    await ensureAccountsLoaded(true);
    const { data, error: err } = await sb.from("locations").select("*");
    if (err || !data) {
      setError("Chưa đọc được bảng locations.");
      setReady(true);
      return;
    }
    const byRole = new Map(
      (data as LocationRow[]).map((r) => [
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
    // Realtime: any location write pushes an update instantly.
    const sb = getSupabase();
    const channel = sb
      ? sb
          .channel(liveTopic("admin-locations-live"))
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "locations" },
            () => void refresh()
          )
          .subscribe()
      : null;
    // Slow tick so the online/offline badge still ages out when nobody moves.
    const id = window.setInterval(() => void refresh(), 30_000);
    return () => {
      window.clearInterval(id);
      if (sb && channel) void sb.removeChannel(channel);
    };
  }, [refresh]);

  return { rows, ready, error, refresh };
}
