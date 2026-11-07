/** Period choices for the order report. Dates are Indian Standard Time (IST). */
export const IST_OFFSET_MS = 330 * 60 * 1000;
const DAY_MS = 86_400_000;

export const PERIODS = [
  { key: "1d", label: "1 day", days: 1, months: 0 },
  { key: "2d", label: "2 days", days: 2, months: 0 },
  { key: "7d", label: "7 days", days: 7, months: 0 },
  { key: "1m", label: "1 month", days: 0, months: 1 },
  { key: "3m", label: "3 months", days: 0, months: 3 },
  { key: "6m", label: "6 months", days: 0, months: 6 },
] as const;

export type PeriodKey = (typeof PERIODS)[number]["key"] | "custom";
export const PERIOD_KEYS = [...PERIODS.map((p) => p.key), "custom"] as [PeriodKey, ...PeriodKey[]];

export const MAX_CUSTOM_DAYS = 400;

/** Goes back n calendar months, keeping the day when it exists (31 Mar minus 1 month is 28 or 29 Feb). */
export function subMonths(date: Date, n: number): Date {
  const d = new Date(date.getTime());
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() - n);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d;
}

function parseDay(value: string): { y: number; m: number; d: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new RangeError("Dates must look like 2026-11-04.");
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const check = new Date(Date.UTC(y, m - 1, d));
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) {
    throw new RangeError("That date does not exist.");
  }
  return { y, m, d };
}

/** Midnight at the start of the given IST calendar day, as a UTC instant. */
function istDayStart(value: string): Date {
  const { y, m, d } = parseDay(value);
  return new Date(Date.UTC(y, m - 1, d) - IST_OFFSET_MS);
}

export function formatIstDate(d: Date): string {
  const ist = new Date(d.getTime() + IST_OFFSET_MS);
  const dd = String(ist.getUTCDate()).padStart(2, "0");
  const mm = String(ist.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${ist.getUTCFullYear()}`;
}

export type PeriodRange = { from: Date; to: Date; label: string; slug: string };

export function periodRange(
  key: PeriodKey,
  now: Date,
  custom?: { from?: string; to?: string },
): PeriodRange {
  if (key === "custom") {
    if (!custom?.from || !custom?.to) throw new RangeError("Choose a start and an end date.");
    const from = istDayStart(custom.from);
    const to = new Date(istDayStart(custom.to).getTime() + DAY_MS - 1);
    if (from.getTime() > to.getTime()) throw new RangeError("The start date must be before the end date.");
    if ((to.getTime() - from.getTime()) / DAY_MS > MAX_CUSTOM_DAYS) {
      throw new RangeError(`Please keep the range under ${MAX_CUSTOM_DAYS} days.`);
    }
    return {
      from,
      to,
      label: `${formatIstDate(from)} to ${formatIstDate(to)}`,
      slug: `${custom.from}_to_${custom.to}`,
    };
  }

  const p = PERIODS.find((x) => x.key === key);
  if (!p) throw new RangeError("Unknown period.");
  const from = p.months > 0 ? subMonths(now, p.months) : new Date(now.getTime() - p.days * DAY_MS);
  return { from, to: now, label: `Last ${p.label}`, slug: `last-${p.label.replace(/\s+/g, "-")}` };
}
