"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@/types";
import {
  ensureAccountsLoaded,
  getSession,
  isAccountGone,
  isSessionRevoked,
  logout,
} from "@/lib/auth";

/** How often we re-check whether the admin cut this session off. */
const REVOKE_CHECK_MS = 60_000;

/**
 * Client-side auth guard: redirects to the login screen when not signed in, and
 * signs the person out if the admin revoked their session or deleted their
 * account from /admin.
 *
 * Both checks need the cloud, so they only bite while the device is online — a
 * phone in airplane mode keeps its session until it reconnects.
 */
export function useSession(): Session | null {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let disposed = false;

    const check = async (force: boolean) => {
      const current = getSession();
      if (!current) {
        router.replace("/");
        return;
      }
      await ensureAccountsLoaded(force);
      if (disposed) return;
      // Cut off from /admin, or the account was deleted outright.
      if (isSessionRevoked(current) || isAccountGone(current)) {
        logout();
        router.replace("/");
        return;
      }
      setSession(getSession());
    };

    void check(false);
    const id = window.setInterval(() => void check(true), REVOKE_CHECK_MS);
    // An account edit elsewhere (name, avatar, revoke) refreshes the cache.
    const onAccounts = () => void check(false);
    window.addEventListener("ourspace:accounts", onAccounts);

    return () => {
      disposed = true;
      window.clearInterval(id);
      window.removeEventListener("ourspace:accounts", onAccounts);
    };
  }, [router]);

  return session;
}
