import type { DictKey } from "@/lib/i18n";

/** Category comes from the SKU code format SKU-<CATEGORY>-<size>. */
export type CategoryCode = "BS" | "DT" | "TE" | "DS" | "FL" | "NS" | "SP" | "OTHER";

const KNOWN = new Set(["BS", "DT", "TE", "DS", "FL", "NS", "SP"]);

export function categoryOf(code: string): CategoryCode {
  const c = (code.split("-")[1] ?? "").toUpperCase();
  return KNOWN.has(c) ? (c as CategoryCode) : "OTHER";
}

export const CATEGORY_KEY: Record<CategoryCode, DictKey> = {
  BS: "catBS",
  DT: "catDT",
  TE: "catTE",
  DS: "catDS",
  FL: "catFL",
  NS: "catNS",
  SP: "catSP",
  OTHER: "catOther",
};

export const CATEGORY_EN: Record<CategoryCode, string> = {
  BS: "Biscuits",
  DT: "Detergent",
  TE: "Tea",
  DS: "Dish wash",
  FL: "Floor care",
  NS: "Snacks",
  SP: "Soap",
  OTHER: "Other",
};

/** "Glucose biscuit 75 g, case of 96" -> { title: "Glucose biscuit", weight: "75 g" } */
export function packInfo(name: string | undefined): { title: string; weight: string } {
  if (!name) return { title: "", weight: "" };
  const m = /^(.*?)(\d+(?:\.\d+)?\s*(?:kg|g|ml|l))\b/i.exec(name);
  if (!m) return { title: name.split(",")[0].trim(), weight: "" };
  return { title: m[1].replace(/[,\s]+$/, ""), weight: m[2].replace(/\s+/g, " ").trim() };
}
