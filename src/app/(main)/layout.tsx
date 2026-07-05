"use client";

import { useEffect, type ReactNode } from "react";
import { useSession } from "@/hooks/useSession";
import { useLocationSync } from "@/hooks/useLocationSync";
import { ensureAccountsLoaded } from "@/lib/auth";
import { BottomNav } from "@/components/BottomNav";
import { PlayerProvider } from "@/features/playlist/PlayerProvider";

export default function MainLayout({ children }: { children: ReactNode }) {
  const session = useSession();
  // Keep pushing our real position (every 10s) while the site is open,
  // so the partner's map stays truthful even when we're not on the map page.
  useLocationSync(session);

  // Warm the shared account names/passwords so admin edits show up here too.
  useEffect(() => {
    void ensureAccountsLoaded();
  }, []);

  // While the session is being read (or redirecting to login) render a calm blank.
  if (!session) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <span className="animate-heart-beat text-3xl" aria-hidden>
          ❤️
        </span>
      </div>
    );
  }

  return (
    // The music player lives at layout level: a random song starts right
    // after login and keeps playing across tabs until paused on Playlist.
    <PlayerProvider>
      <div className="mx-auto min-h-dvh w-full max-w-md px-4 pb-28 pt-4">
        {children}
        <BottomNav />
      </div>
    </PlayerProvider>
  );
}
