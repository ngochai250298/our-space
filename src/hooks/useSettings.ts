"use client";

import { useCallback, useEffect, useState } from "react";
import type { AppSettings } from "@/types";
import { DEFAULT_SETTINGS } from "@/lib/constants";
import { loadItem, saveItem } from "@/lib/storage";
import { apiGet, apiPut } from "@/lib/api";

const KEY = "settings";
// When the couple's dates were last edited on THIS device (ms). Lets us ignore
// a stale cloud read that would otherwise clobber a value we just saved.
const EDITED_KEY = "settings.datesEditedAt";
const ENDPOINT = "/api/settings";
/** No realtime channel on D1 — poll the shared dates instead. */
const REFRESH_MS = 8000;

/**
 * Fields the whole house shares — the couple's dates. Only Hải or Bình edit
 * them, and they live on the server so every account (family included) sees
 * the same countdown. Theme and places stay per-device in localStorage.
 */
type SharedDates = Pick<
  AppSettings,
  "anniversary" | "nextMeeting" | "nextMeetingLabel"
>;

function readSettings(): AppSettings {
  const stored = loadItem<Partial<AppSettings>>(KEY, {});
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    places: { ...DEFAULT_SETTINGS.places, ...(stored.places ?? {}) },
  };
}

function sharedFromRow(row: Record<string, unknown>): SharedDates {
  return {
    anniversary: String(row.anniversary),
    nextMeeting: String(row.next_meeting),
    nextMeetingLabel: String(
      row.next_meeting_label ?? DEFAULT_SETTINGS.nextMeetingLabel
    ),
  };
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setSettings(readSettings());
    sync();
    setReady(true);
    const onChange = (e: Event) => {
      if ((e as CustomEvent<string>).detail === KEY) sync();
    };
    window.addEventListener("ourspace:storage", onChange);

    // Pull the couple's shared dates from the server and cache them locally,
    // so the value survives offline / the next load.
    let cancelled = false;
    const pullCloud = async () => {
      const row = await apiGet<Record<string, unknown> | null>(ENDPOINT).catch(
        () => null
      );
      if (cancelled || !row) return;
      // Don't let a stale cloud value overwrite an edit we just made locally.
      // Apply the row only if it's at least as new as our last local edit.
      const cloudMs = Date.parse(String(row.updated_at ?? "")) || 0;
      const localEditedMs = loadItem<number>(EDITED_KEY, 0);
      if (localEditedMs && cloudMs < localEditedMs) return;
      const shared = sharedFromRow(row);
      // Merge over whatever else is stored on this device (theme, places…).
      saveItem(KEY, { ...readSettings(), ...shared });
    };

    void pullCloud();
    const timer = window.setInterval(() => void pullCloud(), REFRESH_MS);

    return () => {
      cancelled = true;
      window.removeEventListener("ourspace:storage", onChange);
      window.clearInterval(timer);
    };
  }, []);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    const next = { ...readSettings(), ...patch };
    saveItem(KEY, next);
    document.documentElement.classList.toggle("dark", next.theme === "dark");

    // The couple's dates are shared: push them up so every account updates.
    const touchesDates =
      "anniversary" in patch ||
      "nextMeeting" in patch ||
      "nextMeetingLabel" in patch;
    if (touchesDates) {
      // Stamp this edit so a slower cloud read can't roll it back (see pullCloud).
      const editedAt = Date.now();
      saveItem(EDITED_KEY, editedAt);
      void apiPut(ENDPOINT, {
        anniversary: next.anniversary,
        next_meeting: next.nextMeeting,
        next_meeting_label: next.nextMeetingLabel,
      }).catch((err) => {
        console.warn("[useSettings] Không lưu được ngày lên server", err);
      });
    }
  }, []);

  return { settings, ready, updateSettings };
}
