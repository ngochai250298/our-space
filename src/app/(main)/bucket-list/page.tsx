"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, Trash2, Check } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { useSession } from "@/hooks/useSession";
import { useBucketList } from "@/features/bucket/useBucketList";

export default function BucketListPage() {
  const session = useSession();
  const { items, ready, cloudError, add, update, remove } = useBucketList(session);
  const router = useRouter();
  const [title, setTitle] = useState("");

  // Couple-private section — family accounts are sent back home.
  useEffect(() => {
    if (session?.kind === "family") router.replace("/home");
  }, [session, router]);

  if (!session || session.kind === "family") return null;

  const done = items.filter((i) => i.done).length;

  const submit = () => {
    if (!title.trim()) return;
    void add({ title: title.trim(), done: false, createdAt: Date.now() });
    setTitle("");
  };

  return (
    <div>
      <PageHeader title="Bucket List 🧡" />

      {cloudError && (
        <p className="card mb-4 px-4 py-3 text-center text-xs leading-relaxed text-muted">
          ⚠️ {cloudError}
        </p>
      )}

      <section className="card mb-4 p-4">
        <p className="text-xs text-muted">Những điều mình muốn cùng làm</p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-primary-soft">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: items.length ? `${(done / items.length) * 100}%` : "0%" }}
          />
        </div>
        <p className="mt-1.5 text-[11px] text-muted">
          {done}/{items.length} điều đã thực hiện cùng nhau
        </p>
      </section>

      <form
        className="mb-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Thêm một điều ước..."
          className="flex-1 rounded-2xl border border-line bg-surface px-4 py-3 text-sm outline-none transition-all duration-300 placeholder:text-muted/70 focus:border-primary focus:ring-2 focus:ring-primary-soft"
        />
        <button
          type="submit"
          aria-label="Thêm"
          disabled={!title.trim()}
          className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/25 disabled:opacity-50"
        >
          <Plus size={18} />
        </button>
      </form>

      {ready && items.length === 0 ? (
        <EmptyState emoji="🌠" title="Danh sách còn trống" hint="Cùng viết những ước mơ chung nhé" />
      ) : (
        <ul className="space-y-2.5">
          {items.map((item) => (
            <motion.li
              key={item.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="card flex items-center gap-3 p-4"
            >
              <button
                type="button"
                aria-label={item.done ? "Bỏ đánh dấu" : "Đánh dấu đã làm"}
                onClick={() => void update(item.id, { done: !item.done })}
                className={`grid size-6 shrink-0 place-items-center rounded-full border-2 transition-all duration-300 ${
                  item.done
                    ? "border-primary bg-primary text-white"
                    : "border-line text-transparent"
                }`}
              >
                <Check size={13} strokeWidth={3} />
              </button>
              <span
                className={`flex-1 text-sm ${item.done ? "text-muted line-through" : ""}`}
              >
                {item.title}
              </span>
              <button
                type="button"
                aria-label="Xóa"
                onClick={() => void remove(item.id)}
                className="grid size-8 place-items-center rounded-full text-muted hover:bg-primary-soft hover:text-primary-strong"
              >
                <Trash2 size={14} />
              </button>
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  );
}
