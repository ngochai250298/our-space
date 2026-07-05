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
  // Only the sender can take their own letter back.
  const canDelete = letter.from === viewer;

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) onRead();
  };

  return (
    <motion.article layout className="card overflow-hidden">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center gap-3 p-4 text-left"
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

              {canDelete && (
                <div className="mt-3 flex justify-end">
                  {confirming ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-muted">Xóa lá thư này?</span>
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
                        className="rounded-full px-3 py-1 text-[11px] font-semibold text-muted"
                      >
                        Hủy
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirming(true)}
                      className="flex items-center gap-1 text-[11px] font-medium text-muted transition-colors hover:text-primary-strong"
                    >
                      <Trash2 size={13} /> Xóa thư
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}
