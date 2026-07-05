"use client";

import { useCallback, useEffect, useState } from "react";
import { loadItem, saveItem, newId } from "@/lib/storage";

/**
 * A small reactive repository over one localStorage key holding an array.
 * Multiple components using the same key stay in sync via the
 * "ourspace:storage" event.
 */
export function useCollection<T extends { id: string }>(key: string) {
  const [items, setItems] = useState<T[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setItems(loadItem<T[]>(key, []));
    sync();
    setReady(true);
    const onChange = (e: Event) => {
      if ((e as CustomEvent<string>).detail === key) sync();
    };
    window.addEventListener("ourspace:storage", onChange);
    return () => window.removeEventListener("ourspace:storage", onChange);
  }, [key]);

  const add = useCallback(
    (item: Omit<T, "id">): T => {
      const created = { ...item, id: newId() } as T;
      const next = [created, ...loadItem<T[]>(key, [])];
      saveItem(key, next);
      return created;
    },
    [key]
  );

  const update = useCallback(
    (id: string, patch: Partial<T>) => {
      const next = loadItem<T[]>(key, []).map((it) =>
        it.id === id ? { ...it, ...patch } : it
      );
      saveItem(key, next);
    },
    [key]
  );

  const remove = useCallback(
    (id: string) => {
      saveItem(key, loadItem<T[]>(key, []).filter((it) => it.id !== id));
    },
    [key]
  );

  return { items, ready, add, update, remove };
}
