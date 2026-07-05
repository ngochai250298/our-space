import type { Role } from "@/types";
import { genderOf } from "@/lib/auth";

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
  const gender = genderOf(role);
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-full bg-primary-soft ring-2 ${RING[gender]} ${SIZES[size]}`}
    >
      {EMOJI[gender]}
    </span>
  );
}
