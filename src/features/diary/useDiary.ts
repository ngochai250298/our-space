"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DiaryEntry, Session } from "@/types";
import { useCollection } from "@/hooks/useCollection";
import { canSee } from "@/lib/auth";
import { loadItem, saveItem } from "@/lib/storage";
import {
  addCloudDiary,
  deleteCloudDiary,
  listCloudDiary,
  updateCloudDiary,
} from "@/features/diary/diaryService";

/** D1 has no realtime channel, so the list is re-read on a short timer. */
const REFRESH_MS = 5000;

interface UseDiary {
  entries: DiaryEntry[];
  ready: boolean;
  /** Set when the server can't be reached and entries stay on the device. */
  cloudError: string;
  addEntry: (entry: {
    date: string;
    content: string;
    photos: string[];
  }) => Promise<void>;
  updateEntry: (
    id: string,
    patch: { date: string; content: string; photos: string[] }
  ) => Promise<void>;
  removeEntry: (id: string) => Promise<void>;
}

export function useDiary(session: Session | null): UseDiary {
  const local = useCollection<DiaryEntry>("diary");
  const [cloudEntries, setCloudEntries] = useState<DiaryEntry[]>([]);
  const [cloudReady, setCloudReady] = useState(false);
  const [cloudError, setCloudError] = useState("");
  const migratingRef = useRef(false);

  const refresh = useCallback(async () => {
    try {
      setCloudEntries(await listCloudDiary());
      setCloudError("");
    } catch {
      setCloudError(
        "Nhật ký đang lưu tạm trên thiết bị — không kết nối được server, thử tải lại trang."
      );
    } finally {
      setCloudReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [refresh]);

  // One-time move of on-device entries up to the cloud (keeps their dates).
  useEffect(() => {
    if (!session || migratingRef.current) return;
    const stored = loadItem<DiaryEntry[]>("diary", []);
    // Only text/local entries live in localStorage; cloud rows have UUID ids.
    if (!stored.length) return;
    migratingRef.current = true;
    void (async () => {
      for (const entry of stored) {
        try {
          await addCloudDiary({
            author: entry.author,
            date: entry.date,
            content: entry.content,
            // Data-URL photos are device-only; keep them out of the cloud row.
            photos: (entry.photos ?? []).filter((p) => !p.startsWith("data:")),
            createdAt: entry.createdAt,
          });
          const remaining = loadItem<DiaryEntry[]>("diary", []).filter(
            (e) => e.id !== entry.id
          );
          saveItem("diary", remaining);
        } catch {
          break; // Server not reachable yet — try again next visit.
        }
      }
      await refresh();
      migratingRef.current = false;
    })();
  }, [session, refresh]);

  const addEntry = useCallback(
    async (entry: { date: string; content: string; photos: string[] }) => {
      if (!session) return;
      if (cloudError) {
        local.add({
          author: session.role,
          ...entry,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      } else {
        await addCloudDiary({ author: session.role, ...entry });
        await refresh();
      }
    },
    [cloudError, local, refresh, session]
  );

  const updateEntry = useCallback(
    async (
      id: string,
      patch: { date: string; content: string; photos: string[] }
    ) => {
      if (cloudEntries.some((e) => e.id === id)) {
        await updateCloudDiary(id, patch);
        await refresh();
      } else {
        local.update(id, { ...patch, updatedAt: Date.now() });
      }
    },
    [cloudEntries, local, refresh]
  );

  const removeEntry = useCallback(
    async (id: string) => {
      if (cloudEntries.some((e) => e.id === id)) {
        await deleteCloudDiary(id);
        await refresh();
      } else {
        local.remove(id);
      }
    },
    [cloudEntries, local, refresh]
  );

  const all = [...local.items, ...cloudEntries];
  // An entry belongs to its author's circle: family and friends don't read each
  // other's, the couple reads everything. `session` is null on the admin screen,
  // which is meant to see every entry.
  const entries = session
    ? all.filter((e) => canSee(session.role, e.author))
    : all;

  return {
    entries,
    ready: cloudReady && local.ready,
    cloudError,
    addEntry,
    updateEntry,
    removeEntry,
  };
}
