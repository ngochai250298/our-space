"use client";

import { useCallback, useEffect, useState } from "react";
import type { AppSettings } from "@/types";
import { DEFAULT_SETTINGS } from "@/lib/constants";
import { loadItem, saveItem } from "@/lib/storage";

const KEY = "settings";

function readSettings(): AppSettings {
  const stored = loadItem<Partial<AppSettings>>(KEY, {});
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    places: { ...DEFAULT_SETTINGS.places, ...(stored.places ?? {}) },
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
    return () => window.removeEventListener("ourspace:storage", onChange);
  }, []);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    const next = { ...readSettings(), ...patch };
    saveItem(KEY, next);
    document.documentElement.classList.toggle("dark", next.theme === "dark");
  }, []);

  return { settings, ready, updateSettings };
}
