"use client";

import { motion } from "framer-motion";
import {
  Music,
  Pause,
  Play,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { useSession } from "@/hooks/useSession";
import { useGlobalPlayer } from "@/features/playlist/PlayerProvider";

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function PlaylistPage() {
  const session = useSession();
  // The player itself lives in the layout (PlayerProvider) — music keeps
  // playing across every tab; this screen is just the control panel.
  const player = useGlobalPlayer();
  const songs = player.songs;

  if (!session) return null;

  const current = player.index !== null ? songs[player.index] : undefined;

  return (
    <div>
      <PageHeader title="Playlist của chúng ta 🎵" />

      {/* Player */}
      <section className="card p-5">
        <div className="flex flex-col items-center">
          <div
            className={`grid size-24 place-items-center rounded-full bg-gradient-to-br from-primary-soft to-primary/30 text-4xl shadow-inner ${
              player.playing ? "animate-[spin_9s_linear_infinite]" : ""
            }`}
            aria-hidden
          >
            💿
          </div>
          <p className="mt-4 w-full truncate text-center text-sm font-semibold">
            {current ? current.title : "Đang tải playlist..."}
          </p>
          <p className="mt-0.5 text-[11px] text-muted">
            {player.loading && current ? "Đang tải nhạc…" : "Từ kho nhạc của hai đứa 💗"}
          </p>
        </div>

        {/* Seek bar */}
        <div className="mt-4">
          <input
            type="range"
            aria-label="Tua bài hát"
            min={0}
            max={player.duration || 0}
            step={0.1}
            value={Math.min(player.time, player.duration || 0)}
            onChange={(e) => player.seek(Number(e.target.value))}
            className="w-full accent-primary"
            disabled={!current}
          />
          <div className="flex justify-between text-[11px] tabular-nums text-muted">
            <span>{formatTime(player.time)}</span>
            <span>{formatTime(player.duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="mt-2 flex items-center justify-between px-2">
          <button
            type="button"
            aria-label="Phát ngẫu nhiên"
            aria-pressed={player.shuffle}
            onClick={player.toggleShuffle}
            className={`grid size-10 place-items-center rounded-full transition-colors ${
              player.shuffle ? "text-primary-strong" : "text-muted"
            }`}
          >
            <Shuffle size={19} />
          </button>
          <button
            type="button"
            aria-label="Bài trước"
            onClick={player.prev}
            className="grid size-11 place-items-center rounded-full text-ink active:scale-95"
          >
            <SkipBack size={24} fill="currentColor" />
          </button>
          <button
            type="button"
            aria-label={player.playing ? "Tạm dừng" : "Phát"}
            onClick={player.toggle}
            className="grid size-14 place-items-center rounded-full bg-ink text-surface shadow-lg transition-transform active:scale-95"
          >
            {player.playing ? (
              <Pause size={24} fill="currentColor" />
            ) : (
              <Play size={24} fill="currentColor" className="ml-0.5" />
            )}
          </button>
          <button
            type="button"
            aria-label="Bài tiếp"
            onClick={player.next}
            className="grid size-11 place-items-center rounded-full text-ink active:scale-95"
          >
            <SkipForward size={24} fill="currentColor" />
          </button>
          <button
            type="button"
            aria-label="Lặp lại một bài"
            aria-pressed={player.repeatOne}
            onClick={player.toggleRepeatOne}
            className={`grid size-10 place-items-center rounded-full transition-colors ${
              player.repeatOne ? "text-primary-strong" : "text-muted"
            }`}
          >
            <Repeat1 size={19} />
          </button>
        </div>
      </section>

      {/* Song list */}
      <div className="mt-4 space-y-2.5">
        {songs.length === 0 && (
          <EmptyState
            emoji="🎧"
            title="Đang tải danh sách nhạc..."
            hint="Nhạc lấy từ folder Google Drive của hai đứa"
          />
        )}
        {songs.map((song, i) => {
          const active = i === player.index;
          return (
            <motion.button
              key={song.id}
              type="button"
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => player.playIndex(i)}
              className={`card flex w-full items-center gap-3 p-4 text-left transition-all duration-300 ${
                active ? "ring-2 ring-primary/40" : ""
              }`}
            >
              <span
                className={`grid size-10 shrink-0 place-items-center rounded-xl ${
                  active
                    ? "bg-primary text-white"
                    : "bg-primary-soft text-primary-strong"
                }`}
              >
                {active && player.playing ? (
                  <span className="text-sm" aria-hidden>
                    🎶
                  </span>
                ) : (
                  <Music size={18} />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={`block truncate text-sm ${
                    active ? "font-bold text-primary-strong" : "font-semibold"
                  }`}
                >
                  {song.title}
                </span>
                <span className="block text-xs text-muted">
                  {active
                    ? player.playing
                      ? "Đang phát"
                      : "Đang tạm dừng"
                    : "Nhấn để phát"}
                </span>
              </span>
            </motion.button>
          );
        })}
      </div>

      <p className="mt-4 text-center text-[11px] leading-relaxed text-muted">
        Up bài mới vào folder Google Drive chung là tự có ở đây 🎵
      </p>
    </div>
  );
}
