"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Photo, Role, Session } from "@/types";
import { useCollection } from "@/hooks/useCollection";
import { canSee } from "@/lib/auth";
import { loadItem, saveItem } from "@/lib/storage";
import {
  cloudGalleryEnabled,
  deleteCloudPhoto,
  listCloudPhotos,
  subscribeGallery,
  uploadCloudPhoto,
} from "@/features/gallery/photoService";

/** Legacy on-device shape: photos saved as data URLs before cloud sync. */
interface StoredPhoto extends Omit<Photo, "url"> {
  url?: string;
  dataUrl?: string;
}

interface UsePhotos {
  photos: Photo[];
  ready: boolean;
  /** Set when the cloud is configured but not reachable/migrated yet. */
  cloudError: string;
  addPhoto: (dataUrl: string, album: string, uploadedBy: Role) => Promise<void>;
  removePhoto: (photo: Photo) => Promise<void>;
}

export function usePhotos(session: Session | null): UsePhotos {
  const cloud = cloudGalleryEnabled();
  const local = useCollection<Photo>("gallery");
  const [cloudPhotos, setCloudPhotos] = useState<Photo[]>([]);
  const [cloudReady, setCloudReady] = useState(false);
  const [cloudError, setCloudError] = useState("");
  const migratingRef = useRef(false);

  const refresh = useCallback(async () => {
    try {
      setCloudPhotos(await listCloudPhotos());
      setCloudError("");
    } catch {
      setCloudError(
        "Chưa kết nối được kho ảnh — hãy chạy file supabase/migration2_gallery.sql trong Supabase SQL Editor."
      );
    } finally {
      setCloudReady(true);
    }
  }, []);

  useEffect(() => {
    if (!cloud) return;
    void refresh();
    return subscribeGallery(() => void refresh());
  }, [cloud, refresh]);

  // One-time move of old on-device photos (data URLs) up to the cloud.
  useEffect(() => {
    if (!cloud || !session || migratingRef.current) return;
    const stored = loadItem<StoredPhoto[]>("gallery", []);
    const legacy = stored.filter((p) => (p.dataUrl ?? p.url ?? "").startsWith("data:"));
    if (!legacy.length) return;
    migratingRef.current = true;
    void (async () => {
      for (const photo of legacy) {
        const src = photo.dataUrl ?? photo.url ?? "";
        try {
          await uploadCloudPhoto(src, photo.album, photo.uploadedBy);
          const remaining = loadItem<StoredPhoto[]>("gallery", []).filter(
            (p) => p.id !== photo.id
          );
          saveItem("gallery", remaining);
        } catch {
          // Cloud not ready (migration not run yet) — keep the photo on-device.
          break;
        }
      }
      await refresh();
      migratingRef.current = false;
    })();
  }, [cloud, session, refresh]);

  const addPhoto = useCallback(
    async (dataUrl: string, album: string, uploadedBy: Role) => {
      if (cloud && !cloudError) {
        await uploadCloudPhoto(dataUrl, album, uploadedBy);
        await refresh();
      } else {
        local.add({ album, url: dataUrl, uploadedBy, createdAt: Date.now() });
      }
    },
    [cloud, cloudError, local, refresh]
  );

  const removePhoto = useCallback(
    async (photo: Photo) => {
      if (photo.storagePath) {
        await deleteCloudPhoto(photo);
        await refresh();
      } else {
        local.remove(photo.id);
      }
    },
    [local, refresh]
  );

  // Local photos (legacy data URLs) are shown alongside cloud ones until migrated.
  const localPhotos = local.items.map((p) => {
    const raw = p as StoredPhoto;
    return { ...p, url: raw.url ?? raw.dataUrl ?? "" };
  });
  const all = cloud ? [...localPhotos, ...cloudPhotos] : localPhotos;
  // A photo belongs to the uploader's circle: family and friends don't see each
  // other's, the couple sees everything. `session` is null on the admin screen,
  // which is meant to see the whole gallery.
  const photos = session
    ? all.filter((p) => canSee(session.role, p.uploadedBy))
    : all;
  const ready = cloud ? cloudReady && local.ready : local.ready;

  return { photos, ready, cloudError, addPhoto, removePhoto };
}
