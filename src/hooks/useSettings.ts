"use client";

import { useCallback, useEffect, useState } from "react";
import type { AppSettings } from "@/types";
import { DEFAULT_SETTINGS } from "@/lib/constants";
import { loadItem, saveItem } from "@/lib/storage";
import { getSupabase, liveTopic } from "@/lib/supabase";

const KEY = "settings";
// When the couple's dates were last edited on THIS device (ms). Lets us ignore
// a stale cloud read that would otherwise clobber a value we just saved.
const EDITED_KEY = "settings.datesEditedAt";
const TABLE = "couple_settings";
const ROW_ID = 1;

/**
 * Fields the whole house shares — the couple's dates. Only Hải or Bình edit
 * them, and they live in Supabase so every account (family included) sees the
 * same countdown. Theme and places stay per-device in localStorage.
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

    // Pull the couple's shared dates from the cloud, cache them locally (so the
    // value survives offline / next load), and keep listening for live edits.
    const sb = getSupabase();
    const pullCloud = async () => {
      if (!sb) return;
      const { data, error } = await sb
        .from(TABLE)
        .select("*")
        .eq("id", ROW_ID)
        .maybeSingle();
      if (error || !data) return;
      const row = data as Record<string, unknown>;
      // Don't let a stale cloud value overwrite an edit we just made locally.
      // Apply the cloud row only if it's at least as new as our last local edit.
      const cloudMs = Date.parse(String(row.updated_at ?? "")) || 0;
      const localEditedMs = loadItem<number>(EDITED_KEY, 0);
      if (localEditedMs && cloudMs < localEditedMs) return;
      const shared = sharedFromRow(row);
      // Merge over whatever else is stored on this device (theme, places…).
      saveItem(KEY, { ...readSettings(), ...shared });
    };

    const channel = sb
      ? sb
          .channel(liveTopic(`${TABLE}-live`))
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: TABLE },
            () => void pullCloud()
          )
          .subscribe()
      : null;
    void pullCloud();

    return () => {
      window.removeEventListener("ourspace:storage", onChange);
      if (sb && channel) void sb.removeChannel(channel);
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
    const sb = getSupabase();
    if (sb && touchesDates) {
      // Stamp this edit so a slower cloud read can't roll it back (see pullCloud).
      const editedAt = Date.now();
      saveItem(EDITED_KEY, editedAt);
      void sb
        .from(TABLE)
        .upsert({
          id: ROW_ID,
          anniversary: next.anniversary,
          next_meeting: next.nextMeeting,
          next_meeting_label: next.nextMeetingLabel,
          updated_at: new Date(editedAt).toISOString(),
        })
        .then(({ error }) => {
          if (error)
            console.warn(
              "[useSettings] Không lưu được ngày lên Supabase — đã chạy migration5_settings.sql chưa?",
              error.message
            );
        });
    }
  }, []);

  return { settings, ready, updateSettings };
}
