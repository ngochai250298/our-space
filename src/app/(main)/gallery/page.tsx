"use client";

import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Trash2, X, CloudUpload } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { useSession } from "@/hooks/useSession";
import type { Photo } from "@/types";
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

      {/* Lightbox */}
      <AnimatePresence>
        {viewer && (
          <motion.div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setViewer(null)}
          >
            <motion.img
              src={viewer.url}
              alt={viewer.caption ?? "Kỷ niệm"}
              className="max-h-[75dvh] w-auto max-w-full rounded-2xl object-contain"
              initial={{ scale: 0.92 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.92 }}
              onClick={(e) => e.stopPropagation()}
            />
            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                aria-label="Đóng"
                onClick={() => setViewer(null)}
                className="grid size-10 place-items-center rounded-full bg-white/15 text-white"
              >
                <X size={18} />
              </button>
              {viewer.uploadedBy === session.role && (
                <button
                  type="button"
                  aria-label="Xóa ảnh"
                  onClick={() => {
                    if (window.confirm("Xóa bức ảnh này?")) {
                      void removePhoto(viewer);
                      setViewer(null);
                    }
                  }}
                  className="grid size-10 place-items-center rounded-full bg-white/15 text-white"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
