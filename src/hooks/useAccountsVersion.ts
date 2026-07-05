"use client";

import { useEffect, useState } from "react";

/**
 * Bumps a counter whenever the shared account data (names/avatars) changes,
 * so components reading displayNameOf/avatarOf re-render live after an edit.
 */
export function useAccountsVersion(): number {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const bump = () => setVersion((v) => v + 1);
    window.addEventListener("ourspace:accounts", bump);
    return () => window.removeEventListener("ourspace:accounts", bump);
  }, []);
  return version;
}
