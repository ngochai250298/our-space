"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import type { Session } from "@/types";

const DURATION_MS = 1500;

// Subtitles per person; the title always greets by display name.
const SUBTITLES: Partial<Record<Session["role"], string>> = {
  anh: "Đang mở cánh cửa...",
  em: "Anh đang đợi em ở đây.",
};

interface WelcomeTransitionProps {
  session: Session;
  onDone: () => void;
}

export function WelcomeTransition({ session, onDone }: WelcomeTransitionProps) {
  const title = `Welcome home, ${session.displayName}.`;
  const subtitle = SUBTITLES[session.role] ?? "Chào mừng về nhà.";

  useEffect(() => {
    const id = window.setTimeout(onDone, DURATION_MS);
    return () => window.clearTimeout(id);
  }, [onDone]);

  return (
    <motion.main
      className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-between px-6 py-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: "easeInOut" }}
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <span className="text-4xl" aria-hidden>
          ❤️
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted">{subtitle}</p>

        {/* Heart-beat */}
        <div className="relative mt-10 grid place-items-center">
          <span className="animate-glow-pulse absolute size-40 rounded-full bg-primary/25 blur-2xl" />
          <span className="animate-heart-beat relative text-7xl drop-shadow-lg" aria-hidden>
            ❤️
          </span>
          {/* ECG line */}
          <svg
            className="pointer-events-none absolute w-64 text-primary/60"
            viewBox="0 0 240 40"
            fill="none"
            aria-hidden
          >
            <path
              d="M0 20h70l8-12 10 24 8-18 6 6h136"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      <div className="w-full max-w-56">
        <div className="h-1 overflow-hidden rounded-full bg-primary-soft">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: DURATION_MS / 1000, ease: "linear" }}
          />
        </div>
        <p className="mt-2 text-center text-[11px] text-muted">1.5s</p>
      </div>
    </motion.main>
  );
}
