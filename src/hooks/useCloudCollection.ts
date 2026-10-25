"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@/types";
import { useCollection } from "@/hooks/useCollection";
import { loadItem, saveItem } from "@/lib/storage";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";

/**
 * Generic cloud-backed collection (same pattern as the diary):
 * - rows live in a D1 table behind one /api endpoint,
 * - localStorage keeps working as a fallback when the request fails,
 * - anything saved on-device is migrated up automatically.
 *
 * D1 has no realtime channel, so instead of a subscription the list is
 * re-read every few seconds and whenever the tab comes back to the front.
 */
const REFRESH_MS = 5000;

export interface CloudSpec<T extends { id: string }> {
  endpoint: string;
  localKey: string;
  errorHint: string;
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
  const local = useCollection<T>(spec.localKey);
  const [cloudItems, setCloudItems] = useState<T[]>([]);
  const [cloudReady, setCloudReady] = useState(false);
  const [cloudError, setCloudError] = useState("");
  const migratingRef = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const rows = await apiGet<Record<string, unknown>[]>(spec.endpoint);
      setCloudItems(rows.map(spec.fromRow));
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
    void refresh();
    const timer = window.setInterval(() => void refresh(), REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  // One-time migration of on-device items up to the cloud.
  useEffect(() => {
    if (!session || migratingRef.current) return;
    const stored = loadItem<T[]>(spec.localKey, []);
    if (!stored.length) return;
    migratingRef.current = true;
    void (async () => {
      for (const item of stored) {
        try {
          const { id: _dropped, ...rest } = item;
          await apiPost(spec.endpoint, spec.toInsertRow(rest as Omit<T, "id">));
          const remaining = loadItem<T[]>(spec.localKey, []).filter(
            (it) => it.id !== item.id
          );
          saveItem(spec.localKey, remaining);
        } catch {
          break; // cloud not reachable — try again next visit
        }
      }
      await refresh();
      migratingRef.current = false;
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, refresh]);

  const add = useCallback(
    async (item: Omit<T, "id">) => {
      if (cloudError) {
        local.add(item);
        return;
      }
      await apiPost(spec.endpoint, spec.toInsertRow(item));
      await refresh();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cloudError, local, refresh]
  );

  const update = useCallback(
    async (id: string, patch: Partial<T>) => {
      if (cloudItems.some((it) => it.id === id)) {
        await apiPatch(`${spec.endpoint}/${id}`, spec.toPatchRow(patch));
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
      if (cloudItems.some((it) => it.id === id)) {
        await apiDelete(`${spec.endpoint}/${id}`);
        await refresh();
      } else {
        local.remove(id);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cloudItems, local, refresh]
  );

  return {
    items: [...local.items, ...cloudItems],
    ready: cloudReady && local.ready,
    cloudError,
    add,
    update,
    remove,
  };
}
