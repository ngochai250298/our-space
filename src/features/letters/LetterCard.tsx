"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Lock } from "lucide-react";
import type { Letter, Role } from "@/types";
import { Avatar } from "@/components/Avatar";
import { displayNameOf } from "@/lib/auth";
import { formatDateVi, todayIso } from "@/lib/dates";

interface LetterCardProps {
  letter: Letter;
  viewer: Role;
  onRead: () => void;
}

export function LetterCard({ letter, viewer, onRead }: LetterCardProps) {
  const [open, setOpen] = useState(false);
  const locked = letter.unlockDate > todayIso() && letter.to === viewer;
  // In the sent tab, show who the letter went to instead of the sender.
  const headerName =
    letter.from === viewer
      ? `Gửi đến ${displayNameOf(letter.to)}`
      : displayNameOf(letter.from);
  const unreadForMe = letter.to === viewer && !letter.readAt;

  const toggle = () => {
    if (locked) return;
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
          <span className="block truncate text-xs text-muted">
            {locked ? "Lá thư đang được khóa 💗" : letter.title}
          </span>
          <span className="block text-[10px] text-muted/80">
            {formatDateVi(letter.createdAt ? new Date(letter.createdAt).toISOString().slice(0, 10) : letter.unlockDate)}
          </span>
        </span>
        {locked ? (
          <span className="flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 text-[10px] font-medium text-primary-strong">
            <Lock size={11} /> Mở vào {formatDateVi(letter.unlockDate)}
          </span>
        ) : unreadForMe ? (
          <span className="grid size-5 place-items-center rounded-full bg-primary text-[10px] font-bold text-white">
            1
          </span>
        ) : (
          <motion.span
            aria-hidden
            animate={{ rotate: open ? 0 : 0, scale: open ? 1.1 : 1 }}
            className="text-lg"
          >
            {open ? "💌" : "✉️"}
          </motion.span>
        )}
      </button>

      <AnimatePresence initial={false}>
        {open && !locked && (
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
