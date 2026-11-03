import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { OrderStatus } from "@prisma/client";

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

export type Variant = "primary" | "secondary" | "ghost" | "danger";

export function btnClass(variant: Variant = "primary", small = false, extra?: string): string {
  return cx("btn", `btn-${variant}`, small && "btn-sm", extra);
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cx("h-4 w-4 animate-spin", className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Button({
  variant = "primary",
  small,
  loading,
  className,
  children,
  disabled,
  type,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; small?: boolean; loading?: boolean }) {
  return (
    <button
      type={type ?? "button"}
      className={btnClass(variant, small, className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("skeleton", className)} aria-hidden />;
}

type Tone = "neutral" | "pine" | "turmeric" | "chilli";
const TONES: Record<Tone, string> = {
  neutral: "bg-black/5 text-ink-2",
  pine: "bg-pine-soft text-pine",
  turmeric: "bg-turmeric-soft text-turmeric",
  chilli: "bg-chilli-soft text-chilli",
};

export function Chip({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={cx("chip", TONES[tone])}>{children}</span>;
}

const STATUS_TONE: Record<OrderStatus, Tone> = {
  PLACED: "turmeric",
  CREDIT_HOLD: "chilli",
  CONFIRMED: "pine",
  REJECTED: "neutral",
  EXPORTED: "neutral",
};

export function StatusChip({ status, label }: { status: OrderStatus; label: string }) {
  return <Chip tone={STATUS_TONE[status]}>{label}</Chip>;
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      {icon && <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-pine-soft text-pine">{icon}</div>}
      <h2 className="text-lg font-semibold">{title}</h2>
      {body && <p className="mt-1 max-w-xs text-sm text-ink-2">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorNote({ message, onRetry, retryLabel }: { message: string; onRetry?: () => void; retryLabel?: string }) {
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-chilli/25 bg-chilli-soft px-4 py-3 text-sm text-chilli">
      <span>{message}</span>
      {onRetry && (
        <button type="button" onClick={onRetry} className="min-h-[36px] rounded-lg px-3 font-semibold underline underline-offset-2">
          {retryLabel ?? "Try again"}
        </button>
      )}
    </div>
  );
}

export function Notice({ tone = "turmeric", children }: { tone?: "turmeric" | "pine"; children: ReactNode }) {
  return (
    <div className={cx("rounded-xl px-4 py-3 text-sm", tone === "turmeric" ? "bg-turmeric-soft text-amber" : "bg-pine-soft text-pine")}>
      {children}
    </div>
  );
}
