"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Role } from "@/types";
import type { DriveSong } from "@/features/playlist/driveMusic";
import { streamUrl } from "@/features/playlist/driveMusic";
import { loadItem, saveItem } from "@/lib/storage";

/** Per-account listening state — each person's music is their own. */
interface SavedPlayerState {
  songId: string;
  time: number;
  shuffle: boolean;
  repeatOne: boolean;
}

const SAVE_EVERY_MS = 5_000;

/** One shared <audio> element driving the whole player UI. */
export function usePlayer(songs: DriveSong[], role: Role | null) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const indexRef = useRef<number | null>(null);
  const shuffleRef = useRef(true);
  const repeatOneRef = useRef(false);
  const songsRef = useRef(songs);
  const nextRef = useRef<() => void>(() => {});
  // Autoplay was blocked by the browser → start on the first tap anywhere.
  const pendingAutoplayRef = useRef(false);
  // Resume position (after a reload) applied once metadata is loaded.
  const pendingSeekRef = useRef<number | null>(null);
  const stateKeyRef = useRef<string | null>(null);
  const lastSaveRef = useRef(0);

  const [index, setIndex] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [shuffle, setShuffle] = useState(true);
  const [repeatOne, setRepeatOne] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(false);

  songsRef.current = songs;
  stateKeyRef.current = role ? `player.${role}` : null;

  const saveState = useCallback(() => {
    const key = stateKeyRef.current;
    const list = songsRef.current;
    const i = indexRef.current;
    if (!key || i === null || !list[i]) return;
    const state: SavedPlayerState = {
      songId: list[i].id,
      time: audioRef.current?.currentTime ?? 0,
      shuffle: shuffleRef.current,
      repeatOne: repeatOneRef.current,
    };
    saveItem(key, state);
    lastSaveRef.current = Date.now();
  }, []);

  const playIndex = useCallback(
    (i: number, opts?: { auto?: boolean }) => {
      const audio = audioRef.current;
      const list = songsRef.current;
      if (!audio || !list[i]) return;
      indexRef.current = i;
      setIndex(i);
      setTime(0);
      setDuration(0);
      setLoading(true);
      if (!opts?.auto) pendingSeekRef.current = null;
      audio.src = streamUrl(list[i].id);
      if ("mediaSession" in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: list[i].title,
          artist: "Our Space ❤️",
        });
      }
      saveState();
      void audio.play().catch(() => {
        setPlaying(false);
        // The browser wants a user gesture first — remember to start then.
        if (opts?.auto) pendingAutoplayRef.current = true;
      });
    },
    [saveState]
  );

  const next = useCallback(() => {
    const list = songsRef.current;
    const current = indexRef.current ?? 0;
    if (!list.length) return;
    let target = (current + 1) % list.length;
    if (shuffleRef.current && list.length > 1) {
      do {
        target = Math.floor(Math.random() * list.length);
      } while (target === current);
    }
    playIndex(target);
  }, [playIndex]);
  nextRef.current = next;

  const prev = useCallback(() => {
    const audio = audioRef.current;
    const list = songsRef.current;
    if (!list.length) return;
    // Standard player behaviour: early in the song → previous, else restart.
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    playIndex(((indexRef.current ?? 0) - 1 + list.length) % list.length);
  }, [playIndex]);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    pendingAutoplayRef.current = false; // explicit control from here on
    if (indexRef.current === null) {
      nextRef.current();
      return;
    }
    if (audio.paused) void audio.play().catch(() => setPlaying(false));
    else audio.pause();
  }, []);

  const seek = useCallback(
    (t: number) => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.currentTime = t;
      setTime(t);
      saveState();
    },
    [saveState]
  );

  const toggleShuffle = useCallback(() => {
    shuffleRef.current = !shuffleRef.current;
    setShuffle(shuffleRef.current);
    saveState();
  }, [saveState]);

  const toggleRepeatOne = useCallback(() => {
    repeatOneRef.current = !repeatOneRef.current;
    setRepeatOne(repeatOneRef.current);
    saveState();
  }, [saveState]);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    audioRef.current = audio;
    const onTime = () => {
      setTime(audio.currentTime);
      // Keep the per-account resume point fresh while playing.
      if (Date.now() - lastSaveRef.current > SAVE_EVERY_MS) saveState();
    };
    const onMeta = () => {
      setDuration(audio.duration || 0);
      if (pendingSeekRef.current !== null) {
        audio.currentTime = pendingSeekRef.current;
        setTime(pendingSeekRef.current);
        pendingSeekRef.current = null;
      }
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => {
      setPlaying(false);
      saveState();
    };
    const onCanPlay = () => setLoading(false);
    const onEnded = () => {
      if (repeatOneRef.current) {
        audio.currentTime = 0;
        void audio.play().catch(() => setPlaying(false));
      } else {
        nextRef.current();
      }
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("canplay", onCanPlay);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.pause();
      audio.removeAttribute("src");
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("ended", onEnded);
      audioRef.current = null;
    };
  }, [saveState]);

  // Music greets you on every visit: resume this account's last song at the
  // saved position, or pick a random one on a fresh start. If the browser
  // blocks autoplay, the very first tap anywhere starts the sound.
  useEffect(() => {
    if (indexRef.current !== null || !songs.length) return;
    const saved = stateKeyRef.current
      ? loadItem<SavedPlayerState | null>(stateKeyRef.current, null)
      : null;
    if (saved) {
      shuffleRef.current = saved.shuffle;
      setShuffle(saved.shuffle);
      repeatOneRef.current = saved.repeatOne;
      setRepeatOne(saved.repeatOne);
    }
    const savedIndex = saved
      ? songs.findIndex((s) => s.id === saved.songId)
      : -1;
    if (savedIndex >= 0) {
      pendingSeekRef.current = saved && saved.time > 3 ? saved.time : null;
      playIndex(savedIndex, { auto: true });
    } else {
      playIndex(Math.floor(Math.random() * songs.length), { auto: true });
    }
  }, [songs, playIndex, role]);

  useEffect(() => {
    const resume = () => {
      const audio = audioRef.current;
      if (!pendingAutoplayRef.current || !audio || indexRef.current === null)
        return;
      pendingAutoplayRef.current = false;
      if (audio.paused) void audio.play().catch(() => setPlaying(false));
    };
    document.addEventListener("pointerdown", resume);
    return () => document.removeEventListener("pointerdown", resume);
  }, []);

  // Lock-screen / notification controls on the phone.
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.setActionHandler("play", () => toggle());
    navigator.mediaSession.setActionHandler("pause", () => toggle());
    navigator.mediaSession.setActionHandler("nexttrack", () => nextRef.current());
    navigator.mediaSession.setActionHandler("previoustrack", () => prev());
    return () => {
      navigator.mediaSession.setActionHandler("play", null);
      navigator.mediaSession.setActionHandler("pause", null);
      navigator.mediaSession.setActionHandler("nexttrack", null);
      navigator.mediaSession.setActionHandler("previoustrack", null);
    };
  }, [toggle, prev]);

  return {
    index,
    playing,
    loading,
    shuffle,
    repeatOne,
    time,
    duration,
    playIndex,
    toggle,
    next,
    prev,
    seek,
    toggleShuffle,
    toggleRepeatOne,
  };
}
