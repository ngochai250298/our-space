"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Bell,
  ChevronRight,
  NotebookPen,
  Mail,
  Images,
  MapPin,
  ClipboardList,
  Music,
  MailOpen,
} from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { useSettings } from "@/hooks/useSettings";
import { useNow } from "@/hooks/useNow";
import { useLetters } from "@/features/letters/useLetters";
import {
  daysTogether,
  daysUntil,
  formatDateVi,
  formatTimeIn,
  greetingForHour,
} from "@/lib/dates";
import { TIMEZONES } from "@/lib/constants";
import { formatKm } from "@/lib/geo";
import { useCoupleDistance } from "@/hooks/useCoupleDistance";

const MENU = [
  {
    href: "/diary",
    icon: NotebookPen,
    tint: "bg-rose-100 text-rose-500 dark:bg-rose-950 dark:text-rose-300",
    title: "Nhật ký của chúng ta",
    subtitle: "Ghi lại những khoảnh khắc",
  },
  {
    href: "/letters",
    icon: Mail,
    tint: "bg-pink-100 text-pink-500 dark:bg-pink-950 dark:text-pink-300",
    title: "Thư gửi nhau",
    subtitle: "Những lá thư yêu thương",
  },
  {
    href: "/gallery",
    icon: Images,
    tint: "bg-emerald-100 text-emerald-500 dark:bg-emerald-950 dark:text-emerald-300",
    title: "Album kỷ niệm",
    subtitle: "Những bức ảnh đáng nhớ",
  },
  {
    href: "/map",
    icon: MapPin,
    tint: "bg-sky-100 text-sky-500 dark:bg-sky-950 dark:text-sky-300",
    title: "Live Location",
    subtitle: "Xem vị trí của nhau",
    live: true,
  },
  {
    href: "/open-when",
    icon: MailOpen,
    tint: "bg-violet-100 text-violet-500 dark:bg-violet-950 dark:text-violet-300",
    title: "Open When",
    subtitle: "Mở khi em cần anh nhất",
  },
  {
    href: "/bucket-list",
    icon: ClipboardList,
    tint: "bg-amber-100 text-amber-500 dark:bg-amber-950 dark:text-amber-300",
    title: "Bucket List",
    subtitle: "Những điều muốn cùng làm",
  },
  {
    href: "/playlist",
    icon: Music,
    tint: "bg-fuchsia-100 text-fuchsia-500 dark:bg-fuchsia-950 dark:text-fuchsia-300",
    title: "Playlist của chúng ta",
    subtitle: "Những bài hát của chúng ta",
  },
];

export default function HomePage() {
  const session = useSession();
  const { settings } = useSettings();
  const now = useNow();
  const { items: letters } = useLetters(session);
  const km = useCoupleDistance();

  if (!session) return null;

  // Family accounts don't see the couple-private sections.
  const isFamily = session.kind === "family";
  const menu = isFamily
    ? MENU.filter((m) => !["/open-when", "/bucket-list"].includes(m.href))
    : MENU;

  const unread = letters.filter(
    (l) => l.to === session.role && !l.readAt
  ).length;
  const together = daysTogether(settings.anniversary);
  const untilMeeting = daysUntil(settings.nextMeeting);
  // Countdown reached zero → it's reunion day (or later).
  const reunionArrived = untilMeeting <= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeInOut" }}
      className="space-y-4"
    >
      {/* Greeting */}
      <header className="flex items-start justify-between pt-2">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            {greetingForHour(now.getHours(), session.displayName)} 💗
          </h1>
          <p className="mt-1 text-xs text-muted">
            Hôm nay là một ngày tuyệt vời để nhớ về nhau 💕
          </p>
        </div>
        <span className="card grid size-10 place-items-center text-muted">
          <Bell size={18} />
        </span>
      </header>

      {/* Love counter — couple only */}
      {!isFamily && (
      <section className="card relative overflow-hidden bg-gradient-to-br from-primary-soft/70 to-surface p-5">
        <p className="flex items-center gap-1.5 text-xs text-primary-strong">
          💗 Chúng ta đã ở bên nhau
        </p>
        <p className="mt-1 text-3xl font-bold tracking-tight">
          {together}{" "}
          <span className="text-lg font-semibold text-muted">ngày</span>
        </p>
        <p className="mt-1 inline-block rounded-full bg-primary-soft px-2.5 py-0.5 text-[11px] text-primary-strong">
          Từ {formatDateVi(settings.anniversary)} ❤️
        </p>
        <span
          className="absolute right-1 bottom-2 flex items-end opacity-95 text-4xl"
          aria-hidden
        >
          👨🏻
          <span className="-mx-1 -translate-y-5 text-2xl">❤️</span>
          👩🏻
        </span>
      </section>
      )}

      {/* Countdown — everyone looks forward to the reunion */}
      <section className="card p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] text-muted">Sắp tới</p>
            <p className="mt-0.5 text-sm font-semibold">
              {settings.nextMeetingLabel}
            </p>
            <p className="mt-0.5 text-xs text-muted">
              {reunionArrived
                ? "Ngày gặp nhau đã tới! 🎉"
                : `còn ${untilMeeting} ngày nữa`}
            </p>
          </div>
          <div className="relative">
            <div className="card grid size-14 place-items-center border border-line font-bold text-primary-strong">
              {reunionArrived ? (
                <span className="text-2xl" aria-hidden>
                  🎉
                </span>
              ) : (
                <span className="text-lg tabular-nums">{untilMeeting}</span>
              )}
            </div>
            <span className="absolute -right-2 -top-2 text-sm" aria-hidden>💗</span>
            <span className="absolute -bottom-2 -right-1 text-xs" aria-hidden>💗</span>
          </div>
        </div>

        {reunionArrived && (
          <p className="mt-3 rounded-xl bg-primary-soft px-3 py-2 text-center text-xs font-semibold text-primary-strong">
            🎊 Bình đang trên đường về đó nha
          </p>
        )}
      </section>

      {/* Distance & clocks */}
      <section className="card grid grid-cols-3 divide-x divide-line p-4 text-center">
        <div>
          <p className="text-[11px] text-muted">🇻🇳 Việt Nam</p>
          <p className="mt-1 text-sm font-semibold tabular-nums">
            {formatTimeIn(TIMEZONES.vietnam, now)}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-muted">Khoảng cách</p>
          <p className="mt-1 text-sm font-semibold text-primary-strong tabular-nums">
            {formatKm(km)} km
          </p>
        </div>
        <div>
          <p className="text-[11px] text-muted">🇯🇵 Nhật Bản</p>
          <p className="mt-1 text-sm font-semibold tabular-nums">
            {formatTimeIn(TIMEZONES.japan, now)}
          </p>
        </div>
      </section>

      {/* Menu */}
      <section className="space-y-2.5">
        {menu.map(({ href, icon: Icon, tint, title, subtitle, live }) => (
          <Link
            key={href}
            href={href}
            className="card flex items-center gap-3.5 p-4 transition-transform duration-300 active:scale-[0.98]"
          >
            <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${tint}`}>
              <Icon size={19} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">{title}</span>
              <span className="block truncate text-xs text-muted">{subtitle}</span>
            </span>
            {href === "/letters" && unread > 0 && (
              <span className="grid size-6 place-items-center rounded-full bg-primary text-[11px] font-semibold text-white">
                {unread}
              </span>
            )}
            {live ? (
              <span className="rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-semibold text-primary-strong">
                Live
              </span>
            ) : (
              <ChevronRight size={17} className="text-muted" />
            )}
          </Link>
        ))}
      </section>
    </motion.div>
  );
}
