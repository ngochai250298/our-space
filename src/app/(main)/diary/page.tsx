"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import { PhotoLightbox } from "@/components/PhotoLightbox";
import { useSession } from "@/hooks/useSession";
import type { DiaryEntry, Photo, Role } from "@/types";
import { formatDateVi, formatTimeVi } from "@/lib/dates";
import { loadItem, saveItem, newId } from "@/lib/storage";
import { displayNameOf, isAdmin } from "@/lib/auth";
import { MonthCalendar } from "@/features/diary/MonthCalendar";
import { DiaryCompose } from "@/features/diary/DiaryCompose";
import { useDiary } from "@/features/diary/useDiary";
import { cloudGalleryEnabled, uploadCloudPhoto } from "@/features/gallery/photoService";

const DIARY_ALBUM = "Nhật ký";

/** Fallback khi chưa có cloud: ảnh nhật ký vẫn xuất hiện trong Gallery (trên máy). */
function addLocalGalleryPhotos(urls: string[], role: Role) {
  const items = loadItem<Photo[]>("gallery", []);
  const added: Photo[] = urls.map((url) => ({
    id: newId(),
    album: DIARY_ALBUM,
    url,
    uploadedBy: role,
    createdAt: Date.now(),
  }));
  saveItem("gallery", [...added, ...items]);
}

export default function DiaryPage() {
  const session = useSession();
  const diary = useDiary(session);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editing, setEditing] = useState<DiaryEntry | null>(null);
  const [composing, setComposing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [viewer, setViewer] = useState<{ src: string; entry: DiaryEntry } | null>(null);

  const sorted = useMemo(
    () =>
      [...diary.entries].sort(
        (a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt
      ),
    [diary.entries]
  );
  const visible = useMemo(
    () => (selectedDate ? sorted.filter((e) => e.date === selectedDate) : sorted),
    [sorted, selectedDate]
  );
  const markedDates = useMemo(
    () => new Set(diary.entries.map((e) => e.date)),
    [diary.entries]
  );

  if (!session) return null;

  const submit = async (values: {
    date: string;
    content: string;
    photos: string[];
  }) => {
    if (!values.content) return;
    setSaving(true);
    setSaveError("");
    try {
      let photos = values.photos;
      const newOnes = photos.filter((p) => p.startsWith("data:"));
      if (cloudGalleryEnabled() && !diary.cloudError && newOnes.length) {
        // Ảnh mới → đưa lên Supabase Storage, đồng thời tự vào Album kỷ niệm.
        const uploaded = new Map<string, string>();
        for (const dataUrl of newOnes) {
          const { url } = await uploadCloudPhoto(dataUrl, DIARY_ALBUM, session.role);
          uploaded.set(dataUrl, url);
        }
        photos = photos.map((p) => uploaded.get(p) ?? p);
      } else if (newOnes.length) {
        addLocalGalleryPhotos(newOnes, session.role);
      }

      if (editing) await diary.updateEntry(editing.id, { ...values, photos });
      else await diary.addEntry({ ...values, photos });
      setComposing(false);
    } catch {
      setSaveError("Chưa lưu được — kiểm tra mạng rồi thử lại nhé.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Nhật ký"
        action={
          <button
            type="button"
            aria-label="Viết nhật ký"
            onClick={() => {
              setEditing(null);
              setComposing(true);
            }}
            className="grid size-9 place-items-center rounded-full bg-primary text-white shadow-lg shadow-primary/25"
          >
            <Plus size={18} />
          </button>
        }
      />

      <MonthCalendar
        marked={markedDates}
        selected={selectedDate}
        onSelect={setSelectedDate}
      />

      {diary.cloudError && (
        <p className="card mt-4 px-4 py-3 text-center text-xs leading-relaxed text-muted">
          ⚠️ {diary.cloudError}
        </p>
      )}
      {saveError && (
        <p className="mt-3 text-center text-xs text-primary-strong">{saveError}</p>
      )}

      <div className="mt-4 space-y-3">
        {diary.ready && visible.length === 0 && (
          <EmptyState
            emoji="📔"
            title={
              selectedDate
                ? `Ngày ${formatDateVi(selectedDate)} chưa có nhật ký`
                : "Chưa có trang nhật ký nào"
            }
            hint="Bấm dấu + để ghi lại khoảnh khắc nhé"
          />
        )}
        {visible.map((entry) => (
          <motion.article
            key={entry.id}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-4"
          >
            <div className="flex items-center gap-2.5">
              <Avatar role={entry.author} size="sm" />
              <div className="flex-1">
                <p className="text-xs font-semibold">
                  {displayNameOf(entry.author)}
                </p>
                <p className="text-[11px] text-muted">
                  {formatDateVi(entry.date)} · {formatTimeVi(entry.createdAt)}
                </p>
              </div>
              {(entry.author === session.role || isAdmin(session.role)) && (
                <div className="flex gap-1">
                  {entry.author === session.role && (
                    <button
                      type="button"
                      aria-label="Sửa"
                      onClick={() => {
                        setEditing(entry);
                        setComposing(true);
                      }}
                      className="grid size-8 place-items-center rounded-full text-muted hover:bg-primary-soft hover:text-ink"
                    >
                      <Pencil size={14} />
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label="Xóa"
                    onClick={() => {
                      if (window.confirm("Xóa trang nhật ký này? (Ảnh vẫn còn trong Album)"))
                        void diary.removeEntry(entry.id);
                    }}
                    className="grid size-8 place-items-center rounded-full text-muted hover:bg-primary-soft hover:text-primary-strong"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>

            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">
              {entry.content}
            </p>

            {/* Chỉ nhật ký có ảnh mới hiện khung ảnh — bấm vào để xem to */}
            {entry.photos.length === 1 && (
              <button
                type="button"
                className="mt-3 w-full"
                onClick={() => setViewer({ src: entry.photos[0], entry })}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={entry.photos[0]}
                  alt="Ảnh nhật ký"
                  loading="lazy"
                  className="max-h-64 w-full rounded-2xl object-cover"
                />
              </button>
            )}
            {entry.photos.length > 1 && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {entry.photos.map((src, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setViewer({ src, entry })}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt={`Ảnh nhật ký ${i + 1}`}
                      loading="lazy"
                      className="aspect-square w-full rounded-xl object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </motion.article>
        ))}
      </div>

      <DiaryCompose
        open={composing}
        editing={editing}
        busy={saving}
        onClose={() => setComposing(false)}
        onSubmit={(values) => void submit(values)}
      />

      {/* Xem ảnh to + tải về, giống Gallery */}
      <PhotoLightbox
        src={viewer?.src ?? null}
        alt="Ảnh nhật ký"
        subtitle={
          viewer
            ? `${displayNameOf(viewer.entry.author)} · ${formatDateVi(viewer.entry.date)} · ${formatTimeVi(viewer.entry.createdAt)}`
            : undefined
        }
        onClose={() => setViewer(null)}
      />
    </div>
  );
}
