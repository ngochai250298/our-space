"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, Trash2, X } from "lucide-react";

interface PhotoLightboxProps {
  /** Image URL to show; null/undefined = closed */
  src: string | null;
  alt?: string;
  /** e.g. "Nhinhi · 05/07/2026 18:01:32" */
  subtitle?: string;
  onClose: () => void;
  /** Present only when the viewer is allowed to delete this photo */
  onDelete?: () => void;
}

/** Fullscreen photo viewer — everyone can download; deleting is permission-based. */
export function PhotoLightbox({
  src,
  alt = "Kỷ niệm",
  subtitle,
  onClose,
  onDelete,
}: PhotoLightboxProps) {
  const [downloading, setDownloading] = useState(false);

  const download = async () => {
    if (!src || downloading) return;
    setDownloading(true);
    try {
      // Fetch as blob so the download works for remote (Supabase) URLs too.
      const blob = await (await fetch(src)).blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `our-space-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(link.href);
    } catch {
      window.open(src, "_blank");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <AnimatePresence>
      {src && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.img
            src={src}
            alt={alt}
            className="max-h-[70dvh] w-auto max-w-full rounded-2xl object-contain"
            initial={{ scale: 0.92 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.92 }}
            onClick={(e) => e.stopPropagation()}
          />
          {subtitle && (
            <p className="mt-3 text-center text-xs text-white/80">{subtitle}</p>
          )}
          <div className="mt-4 flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              aria-label="Đóng"
              onClick={onClose}
              className="grid size-10 place-items-center rounded-full bg-white/15 text-white"
            >
              <X size={18} />
            </button>
            <button
              type="button"
              aria-label="Tải ảnh về"
              onClick={() => void download()}
              disabled={downloading}
              className="grid size-10 place-items-center rounded-full bg-white/15 text-white disabled:opacity-50"
            >
              <Download size={18} />
            </button>
            {onDelete && (
              <button
                type="button"
                aria-label="Xóa ảnh"
                onClick={onDelete}
                className="grid size-10 place-items-center rounded-full bg-white/15 text-white"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
