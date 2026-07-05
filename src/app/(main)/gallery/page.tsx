"use client";

import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Plus, CloudUpload } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { PhotoLightbox } from "@/components/PhotoLightbox";
import { useSession } from "@/hooks/useSession";
import type { Photo } from "@/types";
import { displayNameOf, isAdmin } from "@/lib/auth";
import { formatDateTimeVi } from "@/lib/dates";
import { fileToDataUrl } from "@/features/gallery/imageUtils";
import { usePhotos } from "@/features/gallery/usePhotos";

const DEFAULT_ALBUM = "Kỷ niệm";

export default function GalleryPage() {
  const session = useSession();
  const { photos, ready, cloudError, addPhoto, removePhoto } = usePhotos(session);
  const inputRef = useRef<HTMLInputElement>(null);
  const [album, setAlbum] = useState<string>("Tất cả");
  const [viewer, setViewer] = useState<Photo | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const albums = useMemo(
    () => ["Tất cả", ...Array.from(new Set(photos.map((p) => p.album)))],
    [photos]
  );
  const visible = useMemo(
    () => (album === "Tất cả" ? photos : photos.filter((p) => p.album === album)),
    [photos, album]
  );

  if (!session) return null;

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setUploadError("");
    try {
      for (const file of Array.from(files)) {
        const dataUrl = await fileToDataUrl(file);
        await addPhoto(
          dataUrl,
          album === "Tất cả" ? DEFAULT_ALBUM : album,
          session.role
        );
      }
    } catch {
      setUploadError("Không up được ảnh — kiểm tra mạng rồi thử lại nhé.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div>
      <PageHeader
        title="Album kỷ niệm"
        action={
          <button
            type="button"
            aria-label="Thêm ảnh"
            onClick={() => inputRef.current?.click()}
            className="grid size-9 place-items-center rounded-full bg-primary text-white shadow-lg shadow-primary/25"
          >
            <Plus size={18} />
          </button>
        }
      />
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => void onFiles(e.target.files)}
      />

      {/* Album chips */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {albums.map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => setAlbum(a)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-300 ${
              album === a ? "bg-primary text-white shadow" : "card text-muted"
            }`}
          >
            {a}
          </button>
        ))}
      </div>

      {uploading && (
        <p className="mb-3 flex items-center justify-center gap-1.5 text-center text-xs text-muted">
          <CloudUpload size={14} /> Đang đưa ảnh lên server…
        </p>
      )}
      {uploadError && (
        <p className="mb-3 text-center text-xs text-primary-strong">{uploadError}</p>
      )}
      {cloudError && (
        <p className="card mb-3 px-4 py-3 text-center text-xs leading-relaxed text-muted">
          ⚠️ {cloudError}
          <br />
          Trong lúc chờ, ảnh sẽ tạm lưu trên thiết bị này.
        </p>
      )}

      {ready && visible.length === 0 ? (
        <EmptyState
          emoji="📷"
          title="Chưa có bức ảnh nào"
          hint="Bấm dấu + để lưu giữ kỷ niệm đầu tiên"
        />
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {visible.map((photo) => (
            <motion.button
              key={photo.id}
              type="button"
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => setViewer(photo)}
              className="aspect-square overflow-hidden rounded-2xl bg-primary-soft"
            >
              {/* User photos come from Storage/data URLs; next/image is skipped intentionally. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt={photo.caption ?? "Kỷ niệm"}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </motion.button>
          ))}
        </div>
      )}

      {/* Lightbox — everyone can download; delete = owner or admin (Hải) */}
      <PhotoLightbox
        src={viewer?.url ?? null}
        alt={viewer?.caption ?? "Kỷ niệm"}
        subtitle={
          viewer
            ? `${displayNameOf(viewer.uploadedBy)} · ${formatDateTimeVi(viewer.createdAt)}`
            : undefined
        }
        onClose={() => setViewer(null)}
        onDelete={
          viewer &&
          (viewer.uploadedBy === session.role || isAdmin(session.role))
            ? () => {
                if (window.confirm("Xóa bức ảnh này?")) {
                  void removePhoto(viewer);
                  setViewer(null);
                }
              }
            : undefined
        }
      />
    </div>
  );
}
