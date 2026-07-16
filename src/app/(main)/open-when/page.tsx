"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Modal } from "@/components/Modal";
import { EmptyState } from "@/components/EmptyState";
import { Input, Textarea, PrimaryButton } from "@/components/Field";
import { useSession } from "@/hooks/useSession";
import { useOpenWhen } from "@/features/openwhen/useOpenWhen";
import { displayNameOf } from "@/lib/auth";
import type { OpenWhenEnvelope } from "@/types";

const SUGGESTIONS = [
  "Khi buồn 🌧️",
  "Khi nhớ anh 💭",
  "Khi nhớ em 💭",
  "Sinh nhật 🎂",
  "Giáng sinh 🎄",
  "Hoa anh đào 🌸",
];

export default function OpenWhenPage() {
  const session = useSession();
  const { items, ready, cloudError, add, update, remove } = useOpenWhen(session);
  const router = useRouter();
  const [reading, setReading] = useState<OpenWhenEnvelope | null>(null);
  const [composing, setComposing] = useState(false);
  const [label, setLabel] = useState("");
  const [body, setBody] = useState("");

  // Couple-private section — everyone else is sent back home. Checked against
  // "couple" rather than a list of other groups, so a new group can't slip in.
  useEffect(() => {
    if (session && session.kind !== "couple") router.replace("/home");
  }, [session, router]);

  if (!session || session.kind !== "couple") return null;

  const create = () => {
    if (!label.trim() || !body.trim()) return;
    void add({
      label: label.trim(),
      emoji: "💌",
      body: body.trim(),
      from: session.role,
    });
    setLabel("");
    setBody("");
    setComposing(false);
  };

  const openEnvelope = (env: OpenWhenEnvelope) => {
    setReading(env);
    if (!env.openedAt && env.from !== session.role)
      void update(env.id, { openedAt: Date.now() });
  };

  return (
    <div>
      <PageHeader
        title="Open When 💌"
        action={
          <button
            type="button"
            aria-label="Tạo phong bì"
            onClick={() => setComposing(true)}
            className="grid size-9 place-items-center rounded-full bg-primary text-white shadow-lg shadow-primary/25"
          >
            <Plus size={18} />
          </button>
        }
      />

      <p className="mb-4 text-center text-xs text-muted">
        Những phong bì để mở vào đúng khoảnh khắc cần nhau nhất.
      </p>

      {cloudError && (
        <p className="card mb-4 px-4 py-3 text-center text-xs leading-relaxed text-muted">
          ⚠️ {cloudError}
        </p>
      )}

      {ready && items.length === 0 ? (
        <EmptyState
          emoji="💌"
          title="Chưa có phong bì nào"
          hint={`Gợi ý: ${SUGGESTIONS.slice(0, 3).join(" · ")}`}
        />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {items.map((env) => (
            <motion.button
              key={env.id}
              type="button"
              layout
              whileTap={{ scale: 0.96 }}
              onClick={() => openEnvelope(env)}
              className="card flex flex-col items-center gap-2 p-5 text-center"
            >
              <span className="text-3xl" aria-hidden>
                {env.openedAt ? "💌" : "✉️"}
              </span>
              <span className="text-xs font-semibold leading-snug">{env.label}</span>
              <span className="text-[10px] text-muted">
                từ {displayNameOf(env.from)}
                {env.openedAt ? " · đã mở" : ""}
              </span>
            </motion.button>
          ))}
        </div>
      )}

      {/* Envelope-opening effect */}
      <AnimatePresence>
        {reading && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setReading(null)}
          >
            <motion.div
              className="card w-full max-w-sm p-6 text-center"
              initial={{ rotateX: 75, y: 40, opacity: 0 }}
              animate={{ rotateX: 0, y: 0, opacity: 1 }}
              exit={{ rotateX: 40, y: 30, opacity: 0 }}
              transition={{ duration: 0.45, ease: "easeInOut" }}
              onClick={(e) => e.stopPropagation()}
            >
              <span className="text-4xl" aria-hidden>💌</span>
              <h2 className="mt-2 text-base font-semibold">{reading.label}</h2>
              <p className="mt-3 whitespace-pre-wrap text-left text-sm leading-relaxed">
                {reading.body}
              </p>
              <div className="mt-5 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setReading(null)}
                  className="rounded-full bg-primary-soft px-5 py-2 text-xs font-semibold text-primary-strong"
                >
                  Đóng lại 💗
                </button>
                {reading.from === session.role && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm("Xóa phong bì này?")) {
                        void remove(reading.id);
                        setReading(null);
                      }
                    }}
                    className="flex items-center gap-1.5 rounded-full border border-line px-5 py-2 text-xs font-semibold text-muted transition-colors hover:text-primary-strong"
                  >
                    <Trash2 size={13} /> Xóa
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Modal open={composing} title="Tạo phong bì mới" onClose={() => setComposing(false)}>
        <div className="space-y-4">
          <Input
            label="Mở khi nào?"
            placeholder="Ví dụ: Khi buồn"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            list="openwhen-suggestions"
          />
          <datalist id="openwhen-suggestions">
            {SUGGESTIONS.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          <Textarea
            label="Lời nhắn bên trong"
            placeholder="Viết điều muốn nói vào khoảnh khắc đó..."
            rows={5}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <PrimaryButton type="button" onClick={create} disabled={!label.trim() || !body.trim()}>
            Niêm phong 💌
          </PrimaryButton>
        </div>
      </Modal>
    </div>
  );
}
