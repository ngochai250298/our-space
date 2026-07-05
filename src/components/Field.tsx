import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { forwardRef } from "react";

const baseClass =
  "w-full rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-ink placeholder:text-muted/70 outline-none transition-all duration-300 focus:border-primary focus:ring-2 focus:ring-primary-soft";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ label, error, ...props }, ref) {
    return (
      <label className="block space-y-1.5">
        {label && <span className="text-xs font-medium text-muted">{label}</span>}
        <input ref={ref} className={baseClass} {...props} />
        {error && <span className="text-xs text-primary-strong">{error}</span>}
      </label>
    );
  }
);

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ label, error, ...props }, ref) {
    return (
      <label className="block space-y-1.5">
        {label && <span className="text-xs font-medium text-muted">{label}</span>}
        <textarea ref={ref} rows={4} className={baseClass} {...props} />
        {error && <span className="text-xs text-primary-strong">{error}</span>}
      </label>
    );
  }
);

export function PrimaryButton({
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="w-full rounded-2xl bg-primary py-3 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all duration-300 hover:bg-primary-strong active:scale-[0.98] disabled:opacity-60"
    >
      {children}
    </button>
  );
}
