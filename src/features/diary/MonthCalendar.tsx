"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { todayIso } from "@/lib/dates";

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

interface MonthCalendarProps {
  /** Set of yyyy-mm-dd dates that have diary entries */
  marked: Set<string>;
  /** Currently selected day (filters the timeline), or null for all */
  selected: string | null;
  /** Tap a day to select it; tapping again unselects */
  onSelect: (dateIso: string | null) => void;
}

export function MonthCalendar({ marked, selected, onSelect }: MonthCalendarProps) {
  const today = todayIso();
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const first = new Date(cursor.year, cursor.month, 1);
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  // Monday-first offset
  const offset = (first.getDay() + 6) % 7;

  const iso = (day: number) =>
    [
      cursor.year,
      String(cursor.month + 1).padStart(2, "0"),
      String(day).padStart(2, "0"),
    ].join("-");

  const shift = (delta: number) => {
    setCursor(({ year, month }) => {
      const d = new Date(year, month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  return (
    <section className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold">
          Tháng {cursor.month + 1}, {cursor.year}
        </p>
        <div className="flex gap-1">
          <button
            type="button"
            aria-label="Tháng trước"
            onClick={() => shift(-1)}
            className="grid size-7 place-items-center rounded-full text-muted hover:bg-primary-soft"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            type="button"
            aria-label="Tháng sau"
            onClick={() => shift(1)}
            className="grid size-7 place-items-center rounded-full text-muted hover:bg-primary-soft"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-y-1.5 text-center text-[11px]">
        {WEEKDAYS.map((d) => (
          <span key={d} className="font-medium text-muted">
            {d}
          </span>
        ))}
        {Array.from({ length: offset }).map((_, i) => (
          <span key={`pad-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateIso = iso(day);
          const isToday = dateIso === today;
          const isSelected = dateIso === selected;
          const hasEntry = marked.has(dateIso);
          // Days with entries glow brighter so they're easy to spot;
          // the selected day gets a ring; today stays solid primary.
          const tone = isSelected
            ? "bg-primary font-bold text-white ring-2 ring-primary/40 ring-offset-1"
            : isToday
              ? "bg-primary font-semibold text-white"
              : hasEntry
                ? "bg-primary/25 font-bold text-primary-strong shadow-sm shadow-primary/20"
                : "text-ink hover:bg-primary-soft";
          return (
            <button
              key={day}
              type="button"
              aria-label={`Ngày ${day}`}
              aria-pressed={isSelected}
              onClick={() => onSelect(isSelected ? null : dateIso)}
              className="relative mx-auto grid size-8 place-items-center"
            >
              <span
                className={`grid size-7 place-items-center rounded-full text-xs transition-all duration-300 ${tone}`}
              >
                {day}
              </span>
              {hasEntry && !isSelected && (
                <span className="absolute bottom-0 size-1 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>

      {selected && (
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="mt-3 w-full rounded-full bg-primary-soft py-1.5 text-[11px] font-semibold text-primary-strong"
        >
          Đang xem ngày {selected.split("-").reverse().join("/")} — bấm để xem tất cả
        </button>
      )}
    </section>
  );
}
