"use client";

import { useCallback, useEffect, useState } from "react";
import type { FriendLink } from "@/types";
import { fetchFriendLinks } from "@/lib/friends";
import { getSupabase, liveTopic } from "@/lib/supabase";

/**
 * The admin's friend pairings, kept live. `ready` flips once the first read
 * settles — components use it to avoid flashing "chưa nối dây" while loading.
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
    const sb = getSupabase();
    const channel = sb
      ? sb
          .channel(liveTopic("friend-links-live"))
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "friend_links" },
            () => void refresh()
          )
          .subscribe()
      : null;
    return () => {
      if (sb && channel) void sb.removeChannel(channel);
    };
  }, [refresh]);

  return { links, ready, refresh };
}
