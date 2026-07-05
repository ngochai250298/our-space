"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Camera } from "lucide-react";
import type { Role } from "@/types";
import { Avatar } from "@/components/Avatar";
import { fileToSquareDataUrl, uploadAvatar } from "@/lib/avatar";

interface Props {
  role: Role;
  size?: "sm" | "md" | "lg";
}

/** Tappable avatar that lets you pick an image and upload it as the new avatar. */
export function AvatarUploader({ role, size = "lg" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const dataUrl = await fileToSquareDataUrl(file);
      const url = await uploadAvatar(dataUrl, role);
      if (!url) setError("Không lưu được ảnh — đã chạy migration8 chưa?");
    } catch {
      setError("Không xử lý được ảnh này.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="relative rounded-full disabled:opacity-60"
        aria-label="Đổi ảnh đại diện"
      >
        <Avatar role={role} size={size} />
        <span className="absolute -bottom-0.5 -right-0.5 grid size-6 place-items-center rounded-full bg-primary text-white shadow ring-2 ring-surface">
          <Camera size={12} />
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFile}
      />
      {busy && <span className="text-[11px] text-muted">Đang tải ảnh…</span>}
      {error && <span className="text-[11px] text-primary-strong">{error}</span>}
    </div>
  );
}
