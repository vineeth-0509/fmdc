import type { OrderStatus } from "@prisma/client";

const TZ = "Asia/Kolkata";

export function formatDateTime(d: Date | string): string {
  return new Date(d).toLocaleString("en-IN", {
    timeZone: TZ,
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDate(d: Date | string): string {
  return new Date(d).toLocaleDateString("en-IN", {
    timeZone: TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Order numbers are derived from the database sequence, e.g. ORD-1042. */
export function orderLabel(seq: number): string {
  return `ORD-${1000 + seq}`;
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PLACED: "Awaiting review",
  CREDIT_HOLD: "Credit hold",
  CONFIRMED: "Confirmed",
  REJECTED: "Rejected",
  EXPORTED: "Exported to Tally",
};
