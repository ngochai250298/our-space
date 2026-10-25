"use client";

import { useCallback, useEffect, useState } from "react";
import type { FriendLink } from "@/types";
import { fetchFriendLinks } from "@/lib/friends";

/** No realtime channel on D1 — re-read the pairings on a slow timer. */
const REFRESH_MS = 8000;

/**
 * The admin's friend pairings, kept up to date. `ready` flips once the first
 * read settles — components use it to avoid flashing "chưa nối dây" while
 * loading.
 */
export function useFriendLinks() {
  const [links, setLinks] = useState<FriendLink[]>([]);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    const rows = await fetchFriendLinks();
    if (rows) setLinks(rows);
    setReady(true);
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [refresh]);

  return { links, ready, refresh };
}
