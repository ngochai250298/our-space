"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  backHref?: string;
  action?: ReactNode;
}

export function PageHeader({ title, backHref = "/home", action }: PageHeaderProps) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-30 -mx-4 mb-4 flex items-center justify-between bg-gradient-to-b from-background to-transparent px-4 py-3 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Quay lại"
        onClick={() => router.push(backHref)}
        className="grid size-9 place-items-center rounded-full text-ink transition-colors hover:bg-primary-soft"
      >
        <ChevronLeft size={22} />
      </button>
      <h1 className="text-base font-semibold">{title}</h1>
      <div className="grid size-9 place-items-center">{action}</div>
    </header>
  );
}
