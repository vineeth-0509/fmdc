"use client";

import { IconMinus, IconPlus } from "@/components/icons";

export function Stepper({
  value,
  onChange,
  min = 0,
  max = 9999,
  label,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  label: string;
}) {
  const clamp = (n: number) => Math.max(min, Math.min(max, n));
  const btn =
    "grid h-11 w-11 place-items-center rounded-xl border border-line-strong bg-white text-ink transition-colors hover:bg-pine-soft active:bg-pine-soft disabled:opacity-40";
  return (
    <div className="inline-flex items-center gap-1.5" role="group" aria-label={label}>
      <button type="button" className={btn} onClick={() => onChange(clamp(value - 1))} disabled={value <= min} aria-label={`Decrease ${label}`}>
        <IconMinus width={18} height={18} />
      </button>
      <input
        inputMode="numeric"
        pattern="[0-9]*"
        aria-label={label}
        className="h-11 w-14 rounded-xl border border-line-strong bg-white text-center text-base font-semibold focus:border-pine focus:outline-none focus:ring-2 focus:ring-pine/20"
        value={String(value)}
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => {
          const n = parseInt(e.target.value.replace(/\D/g, ""), 10);
          onChange(Number.isNaN(n) ? min : clamp(n));
        }}
      />
      <button type="button" className={btn} onClick={() => onChange(clamp(value + 1))} disabled={value >= max} aria-label={`Increase ${label}`}>
        <IconPlus width={18} height={18} />
      </button>
    </div>
  );
}
