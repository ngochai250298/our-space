"use client";

import { useCallback, useEffect, useState } from "react";
import type { Role } from "@/types";
import { getSupabase, liveTopic } from "@/lib/supabase";

export interface PresenceRow {
  role: Role;
  lat: number;
  lng: number;
  accuracy: number;
  updatedAt: number;
}

interface LocationRow {
  role: Role;
  lat: number;
  lng: number;
  accuracy: number;
  updated_at: string;
}

/** Last known position + last-seen time for everyone, refreshed on demand. */
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
    const { data, error: err } = await sb.from("locations").select("*");
    if (err || !data) {
      setError("Chưa đọc được bảng locations.");
      setReady(true);
      return;
    }
    setRows(
      (data as LocationRow[]).map((r) => ({
        role: r.role,
        lat: r.lat,
        lng: r.lng,
        accuracy: r.accuracy,
        updatedAt: new Date(r.updated_at).getTime(),
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
