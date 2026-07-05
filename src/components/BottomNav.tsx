"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Images, Heart, NotebookPen, Settings } from "lucide-react";

const TABS = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/gallery", label: "Gallery", icon: Images },
  { href: "/map", label: "Map", icon: Heart },
  { href: "/diary", label: "Diary", icon: NotebookPen },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md px-3 pb-[max(env(safe-area-inset-bottom),0.5rem)]">
      <div className="card flex items-center justify-around px-2 py-2">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex min-w-14 flex-col items-center gap-0.5 rounded-2xl px-2 py-1.5 text-[11px] transition-colors duration-300 ${
                active ? "text-primary-strong" : "text-muted hover:text-ink"
              }`}
            >
              <Icon
                size={21}
                strokeWidth={active ? 2.4 : 1.8}
                fill={active && href === "/map" ? "currentColor" : "none"}
              />
              <span className={active ? "font-semibold" : ""}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
