"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Trash2 } from "lucide-react";
import type { Letter, Role } from "@/types";
import { Avatar } from "@/components/Avatar";
import { displayNameOf } from "@/lib/auth";
import { formatDateTimeVi } from "@/lib/dates";

interface LetterCardProps {
  letter: Letter;
  viewer: Role;
  onRead: () => void;
  onDelete: () => void;
}

export function LetterCard({ letter, viewer, onRead, onDelete }: LetterCardProps) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  // In the sent tab, show who the letter went to instead of the sender.
  const headerName =
    letter.from === viewer
      ? `Gửi đến ${displayNameOf(letter.to)}`
      : displayNameOf(letter.from);
  const unreadForMe = letter.to === viewer && !letter.readAt;
  // Both sides can delete their own copy — sender (Đã gửi) or recipient (Hộp thư đến).
  const canDelete = letter.from === viewer || letter.to === viewer;

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) onRead();
  };

  return (
    <motion.article layout className="card overflow-hidden">
      <div className="flex items-center">
        <button
          type="button"
          onClick={toggle}
          className="flex min-w-0 flex-1 items-center gap-3 p-4 text-left"
          aria-expanded={open}
        >
          <Avatar role={letter.from === viewer ? letter.to : letter.from} size="sm" />
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-semibold">{headerName}</span>
            <span className="block truncate text-xs text-muted">{letter.title}</span>
            <span className="block text-[10px] tabular-nums text-muted/80">
              {formatDateTimeVi(letter.createdAt)}
            </span>
          </span>
          {unreadForMe ? (
            <span className="grid size-5 place-items-center rounded-full bg-primary text-[10px] font-bold text-white">
              1
            </span>
          ) : (
            <motion.span
              aria-hidden
              animate={{ scale: open ? 1.1 : 1 }}
              className="text-lg"
            >
              {open ? "💌" : "✉️"}
            </motion.span>
          )}
        </button>

        {/* Sender can take their own letter back — visible right on the card. */}
        {canDelete && (
          <div className="flex items-center pr-3">
            {confirming ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setConfirming(false);
                    onDelete();
                  }}
                  className="rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-white"
                >
                  Xóa
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="rounded-full px-2 py-1 text-[11px] font-semibold text-muted"
                >
                  Hủy
                </button>
              </div>
            ) : (
              <button
                type="button"
                aria-label="Xóa thư"
                onClick={() => setConfirming(true)}
                className="grid size-8 place-items-center rounded-full text-muted transition-colors hover:text-primary-strong"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        )}
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
          >
            <div className="border-t border-line px-4 pb-4 pt-3">
              <p className="text-sm font-semibold">{letter.title}</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                {letter.body}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}
