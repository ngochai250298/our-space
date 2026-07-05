"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@/types";
import { useCollection } from "@/hooks/useCollection";
import { loadItem, saveItem } from "@/lib/storage";
import { getSupabase } from "@/lib/supabase";

/**
 * Generic cloud-backed collection (same pattern as the diary):
 * - rows live in a Supabase table both people read/write (realtime),
 * - localStorage keeps working as a fallback until the table exists,
 * - anything saved on-device is migrated up automatically.
 */
export interface CloudSpec<T extends { id: string }> {
  table: string;
  localKey: string;
  errorHint: string;
  orderColumn: string;
  fromRow: (row: Record<string, unknown>) => T;
  toInsertRow: (item: Omit<T, "id">) => Record<string, unknown>;
  toPatchRow: (patch: Partial<T>) => Record<string, unknown>;
}

export interface CloudCollection<T extends { id: string }> {
  items: T[];
  ready: boolean;
  cloudError: string;
  add: (item: Omit<T, "id">) => Promise<void>;
  update: (id: string, patch: Partial<T>) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export function useCloudCollection<T extends { id: string }>(
  spec: CloudSpec<T>,
  session: Session | null
): CloudCollection<T> {
  const cloud = getSupabase() !== null;
  const local = useCollection<T>(spec.localKey);
  const [cloudItems, setCloudItems] = useState<T[]>([]);
  const [cloudReady, setCloudReady] = useState(false);
  const [cloudError, setCloudError] = useState("");
  const migratingRef = useRef(false);

  const refresh = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) return;
    try {
      const { data, error } = await sb
        .from(spec.table)
        .select("*")
        .order(spec.orderColumn, { ascending: false });
      if (error) throw new Error(error.message);
      setCloudItems((data as Record<string, unknown>[]).map(spec.fromRow));
      setCloudError("");
    } catch {
      setCloudError(spec.errorHint);
    } finally {
      setCloudReady(true);
    }
    // spec is a module-level constant per feature.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    void refresh();
    const channel = sb
      .channel(`${spec.table}-live`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: spec.table },
        () => void refresh()
      )
      .subscribe();
    return () => void sb.removeChannel(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloud, refresh]);

  // One-time migration of on-device items up to the cloud.
  useEffect(() => {
    if (!cloud || !session || migratingRef.current) return;
    const stored = loadItem<T[]>(spec.localKey, []);
    if (!stored.length) return;
    migratingRef.current = true;
    void (async () => {
      const sb = getSupabase();
      for (const item of stored) {
        try {
          const { id: _dropped, ...rest } = item;
          const { error } = await sb!
            .from(spec.table)
            .insert(spec.toInsertRow(rest as Omit<T, "id">));
          if (error) throw new Error(error.message);
          const remaining = loadItem<T[]>(spec.localKey, []).filter(
            (it) => it.id !== item.id
          );
          saveItem(spec.localKey, remaining);
        } catch {
          break; // table not ready yet — try again next visit
        }
      }
      await refresh();
      migratingRef.current = false;
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloud, session, refresh]);

  const add = useCallback(
    async (item: Omit<T, "id">) => {
      const sb = getSupabase();
      if (sb && !cloudError) {
        const { error } = await sb.from(spec.table).insert(spec.toInsertRow(item));
        if (error) throw new Error(error.message);
        await refresh();
      } else {
        local.add(item);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cloudError, local, refresh]
  );

  const update = useCallback(
    async (id: string, patch: Partial<T>) => {
      const sb = getSupabase();
      if (sb && cloudItems.some((it) => it.id === id)) {
        const { error } = await sb
          .from(spec.table)
          .update(spec.toPatchRow(patch))
          .eq("id", id);
        if (error) throw new Error(error.message);
        await refresh();
      } else {
        local.update(id, patch);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cloudItems, local, refresh]
  );

  const remove = useCallback(
    async (id: string) => {
      const sb = getSupabase();
      if (sb && cloudItems.some((it) => it.id === id)) {
        await sb.from(spec.table).delete().eq("id", id);
        await refresh();
      } else {
        local.remove(id);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cloudItems, local, refresh]
  );

  return {
    items: cloud ? [...local.items, ...cloudItems] : local.items,
    ready: cloud ? cloudReady && local.ready : local.ready,
    cloudError,
    add,
    update,
    remove,
  };
}
