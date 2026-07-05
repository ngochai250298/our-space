"use client";

import type { Role } from "@/types";
import { avatarOf, genderOf } from "@/lib/auth";
import { useAccountsVersion } from "@/hooks/useAccountsVersion";

const EMOJI = { male: "👨🏻", female: "👩🏻" } as const;
const RING = { male: "ring-sky-200", female: "ring-pink-200" } as const;

interface AvatarProps {
  role: Role;
  size?: "sm" | "md" | "lg";
}

const SIZES = {
  sm: "size-8 text-base",
  md: "size-10 text-lg",
  lg: "size-14 text-2xl",
};

export function Avatar({ role, size = "md" }: AvatarProps) {
  // Re-render when someone changes a name/avatar so this stays in sync.
  useAccountsVersion();
  const gender = genderOf(role);
  const url = avatarOf(role);

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        aria-hidden
        className={`shrink-0 rounded-full object-cover ring-2 ${RING[gender]} ${SIZES[size]}`}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-full bg-primary-soft ring-2 ${RING[gender]} ${SIZES[size]}`}
    >
      {EMOJI[gender]}
    </span>
  );
}
