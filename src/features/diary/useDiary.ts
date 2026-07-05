"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DiaryEntry, Session } from "@/types";
import { useCollection } from "@/hooks/useCollection";
import { loadItem, saveItem } from "@/lib/storage";
import {
  addCloudDiary,
  cloudDiaryEnabled,
  deleteCloudDiary,
  listCloudDiary,
  subscribeDiary,
  updateCloudDiary,
} from "@/features/diary/diaryService";

interface UseDiary {
  entries: DiaryEntry[];
  ready: boolean;
  /** Set when the cloud is configured but the diary table isn't ready yet. */
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
  const cloud = cloudDiaryEnabled();
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
        "Nhật ký đang lưu tạm trên thiết bị — chạy file supabase/migration2_gallery.sql trong Supabase để lưu vĩnh viễn trên server."
      );
    } finally {
      setCloudReady(true);
    }
  }, []);

  useEffect(() => {
    if (!cloud) return;
    void refresh();
    return subscribeDiary(() => void refresh());
  }, [cloud, refresh]);

  // One-time move of on-device entries up to the cloud (keeps their dates).
  useEffect(() => {
    if (!cloud || !session || migratingRef.current) return;
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
          break; // Cloud not ready yet — try again next visit.
        }
      }
      await refresh();
      migratingRef.current = false;
    })();
  }, [cloud, session, refresh]);

  const addEntry = useCallback(
    async (entry: { date: string; content: string; photos: string[] }) => {
      if (!session) return;
      if (cloud && !cloudError) {
        await addCloudDiary({ author: session.role, ...entry });
        await refresh();
      } else {
        local.add({
          author: session.role,
          ...entry,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
    },
    [cloud, cloudError, local, refresh, session]
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

  const entries = cloud ? [...local.items, ...cloudEntries] : local.items;
  const ready = cloud ? cloudReady && local.ready : local.ready;

  return { entries, ready, cloudError, addEntry, updateEntry, removeEntry };
}
