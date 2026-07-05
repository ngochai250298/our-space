"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { Modal } from "@/components/Modal";
import { Input, Textarea, PrimaryButton } from "@/components/Field";
import type { DiaryEntry } from "@/types";
import { todayIso } from "@/lib/dates";
import { fileToDataUrl } from "@/features/gallery/imageUtils";

interface DiaryComposeProps {
  open: boolean;
  editing: DiaryEntry | null;
  busy: boolean;
  onClose: () => void;
  onSubmit: (values: { date: string; content: string; photos: string[] }) => void;
}

export function DiaryCompose({
  open,
  editing,
  busy,
  onClose,
  onSubmit,
}: DiaryComposeProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [date, setDate] = useState(todayIso());
  const [content, setContent] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoError, setPhotoError] = useState("");

  // Reset the form each time the modal opens.
  useEffect(() => {
    if (!open) return;
    setDate(editing?.date ?? todayIso());
    setContent(editing?.content ?? "");
    setPhotos(editing?.photos ?? []);
    setPhotoError("");
  }, [open, editing]);

  const pickPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    setPhotoError("");
    try {
      const picked: string[] = [];
      for (const file of Array.from(files)) picked.push(await fileToDataUrl(file));
      setPhotos((prev) => [...prev, ...picked]);
    } catch {
      setPhotoError("Không đọc được ảnh, thử ảnh khác nhé.");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <Modal
      open={open}
      title={editing ? "Sửa nhật ký" : "Viết nhật ký"}
      onClose={onClose}
    >
      <div className="space-y-4">
        <Input
          label="Ngày"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <Textarea
          label="Hôm nay thế nào?"
          placeholder="Ghi lại khoảnh khắc của hai đứa..."
          rows={5}
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />

        {/* Photos */}
        <div>
          <span className="text-xs font-medium text-muted">Ảnh kèm theo</span>
          <div className="mt-1.5 grid grid-cols-4 gap-2">
            {photos.map((src, i) => (
              <div key={i} className="relative aspect-square overflow-hidden rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  aria-label="Bỏ ảnh này"
                  onClick={() => setPhotos((prev) => prev.filter((_, j) => j !== i))}
                  className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-black/60 text-white"
                >
                  <X size={11} />
                </button>
              </div>
            ))}
            <button
              type="button"
              aria-label="Thêm ảnh"
              onClick={() => inputRef.current?.click()}
              className="grid aspect-square place-items-center rounded-xl border-2 border-dashed border-line text-muted transition-colors hover:border-primary hover:text-primary-strong"
            >
              <ImagePlus size={20} />
            </button>
          </div>
          {photoError && (
            <p className="mt-1 text-xs text-primary-strong">{photoError}</p>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => void pickPhotos(e.target.files)}
          />
        </div>

        <PrimaryButton
          type="button"
          onClick={() => onSubmit({ date, content: content.trim(), photos })}
          disabled={busy || !content.trim()}
        >
          {busy
            ? "Đang lưu…"
            : editing
              ? "Lưu thay đổi"
              : "Lưu nhật ký 💗"}
        </PrimaryButton>
      </div>
    </Modal>
  );
}
