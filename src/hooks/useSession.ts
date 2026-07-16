"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@/types";
import {
  ensureAccountsLoaded,
  getSession,
  isSessionRevoked,
  logout,
} from "@/lib/auth";

/** How often we re-check whether the admin cut this session off. */
const REVOKE_CHECK_MS = 60_000;

/**
 * Client-side auth guard: redirects to the login screen when not signed in, and
 * signs the person out if the admin revoked their session from /admin.
 *
 * The revoke check needs the cloud, so it only bites while the device is
 * online — a phone in airplane mode keeps its session until it reconnects.
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
      if (isSessionRevoked(current)) {
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
