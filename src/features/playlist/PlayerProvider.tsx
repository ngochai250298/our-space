"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { DriveSong } from "@/features/playlist/driveMusic";
import { cachedSongs, fetchSongs } from "@/features/playlist/driveMusic";
import { usePlayer } from "@/features/playlist/usePlayer";

/**
 * App-wide music player. Mounted once in the signed-in layout, so a random
 * song starts right after login and keeps playing across every tab — the
 * only place that stops it is the pause button on the Playlist screen.
 */
type PlayerValue = ReturnType<typeof usePlayer> & { songs: DriveSong[] };

const PlayerContext = createContext<PlayerValue | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [songs, setSongs] = useState<DriveSong[]>([]);

  // Cached list plays instantly; Drive is re-read in the background so songs
  // newly uploaded to the folder appear on their own.
  useEffect(() => {
    setSongs(cachedSongs());
    void fetchSongs().then(setSongs);
  }, []);

  const player = usePlayer(songs);

  return (
    <PlayerContext.Provider value={{ ...player, songs }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function useGlobalPlayer(): PlayerValue {
  const value = useContext(PlayerContext);
  if (!value)
    throw new Error("useGlobalPlayer must be used inside PlayerProvider");
  return value;
}
