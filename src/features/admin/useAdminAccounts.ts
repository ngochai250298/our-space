"use client";

import { useCallback, useEffect, useState } from "react";
import type { AccountKind, Role } from "@/types";
import { getSupabase } from "@/lib/supabase";
import { allAccounts, saveAccount } from "@/lib/auth";

export interface AdminAccount {
  role: Role;
  displayName: string;
  password: string;
  kind: AccountKind;
}

interface AccountRow {
  role: Role;
  display_name: string;
  password: string;
}

/** Live list of accounts for the admin screen, with a save helper. */
export function useAdminAccounts() {
  const [rows, setRows] = useState<AdminAccount[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) {
      setError("Chưa cấu hình Supabase.");
      setReady(true);
      return;
    }
    const { data, error: err } = await sb.from("accounts").select("*");
    if (err || !data) {
      setError(
        "Chưa có bảng accounts — hãy chạy supabase/migration7_accounts.sql trong Supabase."
      );
      setReady(true);
      return;
    }
    const byRole = new Map(
      (data as AccountRow[]).map((r) => [r.role, r])
    );
    // Keep the code list's order + kind; overlay cloud values on top.
    setRows(
      allAccounts().map((a) => {
        const r = byRole.get(a.role);
        return {
          role: a.role,
          displayName: r?.display_name ?? a.displayName,
          password: r?.password ?? "",
          kind: a.kind,
        };
      })
    );
    setError("");
    setReady(true);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const save = useCallback(
    async (role: Role, patch: { displayName?: string; password?: string }) => {
      const ok = await saveAccount(role, patch);
      await refresh();
      return ok;
    },
    [refresh]
  );

  return { rows, ready, error, refresh, save };
}
