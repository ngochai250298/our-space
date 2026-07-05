"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DriveSong } from "@/features/playlist/driveMusic";
import { streamUrl } from "@/features/playlist/driveMusic";

/** One shared <audio> element driving the whole player UI. */
export function usePlayer(songs: DriveSong[]) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const indexRef = useRef<number | null>(null);
  const shuffleRef = useRef(true);
  const repeatOneRef = useRef(false);
  const songsRef = useRef(songs);
  const nextRef = useRef<() => void>(() => {});
  // Autoplay was blocked by the browser → start on the first tap anywhere.
  const pendingAutoplayRef = useRef(false);

  const [index, setIndex] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [shuffle, setShuffle] = useState(true);
  const [repeatOne, setRepeatOne] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(false);

  songsRef.current = songs;

  const playIndex = useCallback((i: number, opts?: { auto?: boolean }) => {
    const audio = audioRef.current;
    const list = songsRef.current;
    if (!audio || !list[i]) return;
    indexRef.current = i;
    setIndex(i);
    setTime(0);
    setDuration(0);
    setLoading(true);
    audio.src = streamUrl(list[i].id);
    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: list[i].title,
        artist: "Our Space ❤️",
      });
    }
    void audio.play().catch(() => {
      setPlaying(false);
      // The browser wants a user gesture first — remember to start then.
      if (opts?.auto) pendingAutoplayRef.current = true;
    });
  }, []);

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

  const seek = useCallback((t: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = t;
    setTime(t);
  }, []);

  const toggleShuffle = useCallback(() => {
    shuffleRef.current = !shuffleRef.current;
    setShuffle(shuffleRef.current);
  }, []);

  const toggleRepeatOne = useCallback(() => {
    repeatOneRef.current = !repeatOneRef.current;
    setRepeatOne(repeatOneRef.current);
  }, []);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    audioRef.current = audio;
    const onTime = () => setTime(audio.currentTime);
    const onMeta = () => setDuration(audio.duration || 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
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
  }, []);

  // A random song greets you right after login. If the browser blocks
  // autoplay, the very first tap anywhere in the app starts the music.
  useEffect(() => {
    if (indexRef.current === null && songs.length)
      playIndex(Math.floor(Math.random() * songs.length), { auto: true });
  }, [songs, playIndex]);

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
