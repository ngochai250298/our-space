"use client";

import { useCallback, useEffect, useState } from "react";
import type { AccountKind, Role } from "@/types";
import { apiGet } from "@/lib/api";
import { allAccounts, ensureAccountsLoaded, saveAccount } from "@/lib/auth";

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
    let accounts: AccountRow[];
    try {
      accounts = await apiGet<AccountRow[]>("/api/accounts");
    } catch {
      setError("Không kết nối được server.");
      setReady(true);
      return;
    }
    // Refresh the shared account cache first: allAccounts() reads from it, and
    // accounts created from here exist only on the server, not in the code list.
    await ensureAccountsLoaded(true);
    const byRole = new Map(accounts.map((r) => [r.role, r]));
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
