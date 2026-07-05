"use client";

/**
 * Ngày / Tháng / Năm picker — three dropdowns in dd/mm/yyyy order so the date
 * always reads the Vietnamese way (not the browser-locale mm/dd of a native
 * <input type="date">) and always produces a valid ISO value on change.
 */
interface DateFieldProps {
  label?: string;
  /** ISO yyyy-mm-dd */
  value: string;
  onChange: (iso: string) => void;
  fromYear?: number;
  toYear?: number;
}

const selectClass =
  "flex-1 rounded-2xl border border-line bg-surface px-3 py-3 text-sm text-ink outline-none transition-all duration-300 focus:border-primary focus:ring-2 focus:ring-primary-soft";

function daysInMonth(year: number, month: number): number {
  // month is 1-based; day 0 of next month = last day of this month.
  return new Date(year, month, 0).getDate();
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function DateField({
  label,
  value,
  onChange,
  fromYear = 1990,
  toYear,
}: DateFieldProps) {
  const maxYear = toYear ?? new Date().getFullYear() + 12;

  const valid = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const [vy, vm, vd] = valid ? value.split("-").map(Number) : [NaN, NaN, NaN];
  const year = Number.isNaN(vy) ? maxYear : vy;
  const month = Number.isNaN(vm) ? 1 : vm;
  const day = Number.isNaN(vd) ? 1 : vd;

  const emit = (yy: number, mm: number, dd: number) => {
    const clampedDay = Math.min(dd, daysInMonth(yy, mm));
    onChange(`${yy}-${pad(mm)}-${pad(clampedDay)}`);
  };

  const years: number[] = [];
  for (let yr = maxYear; yr >= fromYear; yr -= 1) years.push(yr);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const days = Array.from({ length: daysInMonth(year, month) }, (_, i) => i + 1);

  return (
    <label className="block space-y-1.5">
      {label && <span className="text-xs font-medium text-muted">{label}</span>}
      <div className="flex gap-2">
        <select
          aria-label="Ngày"
          className={selectClass}
          value={day}
          onChange={(e) => emit(year, month, Number(e.target.value))}
        >
          {days.map((d) => (
            <option key={d} value={d}>
              {pad(d)}
            </option>
          ))}
        </select>
        <select
          aria-label="Tháng"
          className={selectClass}
          value={month}
          onChange={(e) => emit(year, Number(e.target.value), day)}
        >
          {months.map((m) => (
            <option key={m} value={m}>
              Th {m}
            </option>
          ))}
        </select>
        <select
          aria-label="Năm"
          className={selectClass}
          value={year}
          onChange={(e) => emit(Number(e.target.value), month, day)}
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
    </label>
  );
}
