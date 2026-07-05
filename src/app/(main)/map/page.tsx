"use client";

import { useState } from "react";
import { RotateCw } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { LiveMap } from "@/features/map/LiveMap";
import { useSession } from "@/hooks/useSession";

export default function MapPage() {
  const session = useSession();
  // Bumping the key remounts the map, re-reading both positions.
  const [refreshKey, setRefreshKey] = useState(0);

  if (!session) return null;

  return (
    <div>
      <PageHeader
        title="Live Location"
        action={
          <button
            type="button"
            aria-label="Làm mới"
            onClick={() => setRefreshKey((k) => k + 1)}
            className="grid size-9 place-items-center rounded-full text-ink transition-colors hover:bg-primary-soft"
          >
            <RotateCw size={18} />
          </button>
        }
      />
      <LiveMap key={refreshKey} session={session} />
    </div>
  );
}
