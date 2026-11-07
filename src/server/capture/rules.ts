import type { CaptureLine, Confidence, SkuOption, Unit } from "@/lib/capture-types";

/**
 * Deterministic order-message matching. It is used on its own when no LLM is configured
 * (or the LLM fails), and it always cross-checks the LLM when one is used.
 * It never sets prices, discounts or stock: those come from the scheme engine and database.
 */

export type RuleSku = { id: string; code: string; name: string };
export type SkuFull = RuleSku & { nameHi: string | null; stockCases: number; piecesPerCase: number };
export type AliasRule = { phrase: string; skuId: string };

const CASE_WORDS = new Set(["peti", "petti", "case", "cases", "carton", "cartons", "box", "boxes"]);
const PIECE_WORDS = new Set(["piece", "pieces", "pcs", "pc", "packet", "packets", "pkt", "pkts", "pack", "packs", "nag"]);
const KG_WORDS = new Set(["kg", "kgs", "kilo", "kilos", "kilogram", "ltr", "litre", "liter", "l"]);
const G_WORDS = new Set(["g", "gm", "gms", "gram", "grams", "ml"]);
const SIZE_SUFFIX = new Set(["wala", "wali", "wale"]);
const SMALL_WORDS = new Set(["chhota", "chota", "choti", "chhoti", "small", "mini"]);
const LARGE_WORDS = new Set(["bada", "badi", "large", "big"]);
const FILLER = new Set([
  "bhaiya", "bhai", "bhaisahab", "sir", "ji", "dena", "de", "do", "dijiye", "chahiye", "chaiye",
  "please", "plz", "aur", "and", "ka", "ki", "ke", "wala", "wali", "wale", "the", "a", "of",
]);
const WORD_NUMBERS: Record<string, number> = {
  ek: 1, one: 1, do: 2, two: 2, teen: 3, three: 3, char: 4, chaar: 4, four: 4,
  paanch: 5, panch: 5, five: 5, chhe: 6, che: 6, six: 6, saat: 7, seven: 7,
  aath: 8, eight: 8, nau: 9, nine: 9, das: 10, ten: 10,
};

// Keywords per product category, keyed by the category part of the SKU code (SKU-<CAT>-<size>).
const CATEGORY_WORDS: Record<string, string[]> = {
  BS: ["biscuit", "biscuits", "biscut", "biskut", "bisket"],
  DT: ["detergent", "washing", "powder", "surf"],
  TE: ["tea", "chai", "patti", "leaf", "chaipatti"],
  DS: ["dish", "dishwash", "bartan"],
  FL: ["floor", "cleaner", "farsh", "pocha"],
  NS: ["namkeen", "bhujia", "salted", "snack", "mixture"],
  SP: ["soap", "sabun"],
};

const DEVANAGARI: [string, string][] = [
  ["पेटी", "peti"], ["बिस्किट", "biscuit"], ["बिस्कुट", "biscuit"], ["चाय", "chai"],
  ["पत्ती", "patti"], ["साबुन", "soap"], ["नमकीन", "namkeen"], ["सर्फ", "surf"],
  ["वाशिंग", "washing"], ["पाउडर", "powder"], ["डिटर्जेंट", "detergent"], ["डिटरजेंट", "detergent"],
  ["किलो", "kilo"], ["ग्राम", "gram"], ["केस", "case"],
];

export function normalize(input: string): string {
  let t = input.toLowerCase().normalize("NFKC");
  for (const [from, to] of DEVANAGARI) t = t.split(from).join(` ${to} `);
  t = t.replace(/(\d)(\p{L})/gu, "$1 $2").replace(/(\p{L})(\d)/gu, "$1 $2");
  t = t.replace(/[^\p{L}\p{M}\p{N}\s.]/gu, " ");
  t = t.replace(/(?<!\d)\.|\.(?!\d)/g, " ");
  return t.replace(/\s+/g, " ").trim();
}

export function tokenize(input: string): string[] {
  const n = normalize(input);
  return n ? n.split(" ") : [];
}

function levenshtein(a: string, b: string): number {
  const dp: number[] = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

/** Exact match, or a small typo allowance for longer words ("biscuet" matches "biscuit"). */
export function closeEnough(token: string, word: string): boolean {
  if (token === word) return true;
  if (token.length < 5) return false;
  const limit = token.length >= 8 ? 2 : 1;
  return levenshtein(token, word) <= limit;
}

function numberToken(tok: string): number | null {
  if (/^\d+(\.\d+)?$/.test(tok)) return Number(tok);
  return tok in WORD_NUMBERS ? WORD_NUMBERS[tok] : null;
}

export function splitMessage(text: string): string[] {
  return text
    .split(/[\n,;]+|\s+\+\s+|\s+(?:aur|and)\s+/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .slice(0, 20);
}

export type ParsedSegment = {
  original: string;
  quantity: number | null;
  unit: Unit;
  tokens: string[]; // product words, without quantity, unit, size and filler
  productKey: string; // used for aliases, includes the size when one was given
  sizeValue: number | null; // grams or ml
  wantsSmall: boolean;
  wantsLarge: boolean;
};

export function parseSegment(original: string): ParsedSegment {
  const tokens = tokenize(original);
  const used = new Set<number>();
  let unit: Unit = "UNKNOWN";
  let quantity: number | null = null;

  const ui = tokens.findIndex((t) => CASE_WORDS.has(t) || PIECE_WORDS.has(t));
  if (ui >= 0) {
    unit = CASE_WORDS.has(tokens[ui]) ? "CASE" : "PIECE";
    used.add(ui);
    const prev = ui > 0 ? numberToken(tokens[ui - 1]) : null;
    const next = ui + 1 < tokens.length ? numberToken(tokens[ui + 1]) : null;
    if (prev !== null && Number.isInteger(prev)) {
      quantity = prev;
      used.add(ui - 1);
    } else if (next !== null && Number.isInteger(next)) {
      quantity = next;
      used.add(ui + 1);
    }
  }

  const remaining = tokens.filter((_, i) => !used.has(i));

  // Pull size expressions ("1 kilo", "250 wala", "500 g") out of the product words.
  let sizeValue: number | null = null;
  const rest: string[] = [];
  for (let i = 0; i < remaining.length; i++) {
    const n = numberToken(remaining[i]);
    const nx = remaining[i + 1];
    if (n !== null && nx !== undefined) {
      if (KG_WORDS.has(nx)) {
        sizeValue = n * 1000;
        i++;
        continue;
      }
      if (G_WORDS.has(nx) || SIZE_SUFFIX.has(nx)) {
        sizeValue = n;
        i++;
        continue;
      }
    }
    rest.push(remaining[i]);
  }

  // With no unit word, a single stand-alone number is taken as the quantity, but the unit stays unknown.
  if (quantity === null && unit === "UNKNOWN") {
    const idx = rest.map((t, i) => (/^\d+$/.test(t) ? i : -1)).filter((i) => i >= 0);
    if (idx.length === 1) {
      quantity = Number(rest[idx[0]]);
      rest.splice(idx[0], 1);
    }
  }
  if (quantity !== null && (!Number.isInteger(quantity) || quantity < 1)) quantity = null;

  const wantsSmall = rest.some((t) => SMALL_WORDS.has(t));
  const wantsLarge = rest.some((t) => LARGE_WORDS.has(t));
  const productTokens = rest.filter((t) => !FILLER.has(t) && !/^\d+(\.\d+)?$/.test(t));
  const productKey = [...productTokens, ...(sizeValue !== null ? [String(sizeValue)] : [])].join(" ");

  return { original: original.trim(), quantity, unit, tokens: productTokens, productKey, sizeValue, wantsSmall, wantsLarge };
}

export type SkuMeta = RuleSku & { category: string; size: number | null; nameTokens: string[] };

export function skuMeta(s: RuleSku): SkuMeta {
  const category = (s.code.split("-")[1] ?? "").toUpperCase();
  const m = /(\d+(?:\.\d+)?)\s*(kg|g|ml|l)\b/i.exec(s.name);
  let size: number | null = null;
  if (m) {
    const n = Number(m[1]);
    const u = m[2].toLowerCase();
    size = u === "kg" || u === "l" ? n * 1000 : n;
  }
  return { ...s, category, size, nameTokens: tokenize(s.name) };
}

export type Ranked = { sku: SkuMeta; score: number; viaAlias: boolean; heuristic: boolean };

const ALL_CATEGORY_WORDS = new Set(Object.values(CATEGORY_WORDS).flat());

export function rankSkus(
  seg: ParsedSegment,
  skus: RuleSku[],
  aliases: AliasRule[],
  pastSkuIds: Set<string>,
): Ranked[] {
  const metas = skus.map(skuMeta);
  const ranked: Ranked[] = [];

  for (const meta of metas) {
    const aliasHit = aliases.find(
      (a) => a.skuId === meta.id && a.phrase.length >= 3 && ` ${seg.productKey} `.includes(` ${a.phrase} `),
    );
    if (aliasHit) {
      ranked.push({ sku: meta, score: 1, viaAlias: true, heuristic: false });
      continue;
    }

    const words = CATEGORY_WORDS[meta.category] ?? [];
    let hits = 0;
    for (const tok of seg.tokens) if (words.some((w) => closeEnough(tok, w))) hits++;
    const nameHits = seg.tokens.filter(
      (t) => t.length >= 4 && !ALL_CATEGORY_WORDS.has(t) && meta.nameTokens.includes(t),
    ).length;

    if (hits === 0 && nameHits === 0) continue;

    let score = hits > 0 ? 0.6 + Math.min(0.1, (hits - 1) * 0.05) : 0.5;
    if (hits > 0 && nameHits > 0) score += 0.1;

    if (seg.sizeValue !== null && meta.size !== null) {
      score += seg.sizeValue === meta.size ? 0.35 : -0.35;
    }

    let heuristic = false;
    const peers = metas.filter((m) => m.category === meta.category && m.size !== null);
    if (meta.size !== null && peers.length > 1 && seg.sizeValue === null) {
      const sizes = peers.map((p) => p.size as number);
      if (seg.wantsSmall && meta.size === Math.min(...sizes)) {
        score += 0.2;
        heuristic = true;
      }
      if (seg.wantsLarge && meta.size === Math.max(...sizes)) {
        score += 0.2;
        heuristic = true;
      }
    }

    if (pastSkuIds.has(meta.id)) score += 0.05;
    score = Math.max(0, Math.min(1, score));
    if (score > 0) ranked.push({ sku: meta, score, viaAlias: false, heuristic });
  }

  return ranked.sort((a, b) => b.score - a.score || a.sku.code.localeCompare(b.sku.code));
}

export function confidenceFor(ranked: Ranked[]): Confidence {
  const top = ranked[0];
  if (!top || top.score < 0.3) return "NONE";
  if (top.viaAlias) return "HIGH";
  const margin = top.score - (ranked[1]?.score ?? 0);
  if (top.score >= 0.85 && margin >= 0.2 && !top.heuristic) return "HIGH";
  if (top.score >= 0.55) return "MEDIUM";
  return "LOW";
}

export type SegmentInput = {
  original: string;
  hint?: { skuCode: string | null; quantity: number | null } | null;
};

const toOption = (s: SkuFull): SkuOption => ({
  id: s.id,
  code: s.code,
  name: s.name,
  nameHi: s.nameHi,
  stockCases: s.stockCases,
  piecesPerCase: s.piecesPerCase,
});

/**
 * Turns message segments into reviewable order lines.
 * Rules: an alias always wins; an LLM suggestion that disagrees with the keyword matcher is
 * capped at MEDIUM; a missing or non-case unit is never guessed, it is flagged for the person to confirm.
 */
export function buildCaptureLines(
  segments: SegmentInput[],
  skus: SkuFull[],
  aliases: AliasRule[],
  pastSkuIds: Set<string>,
): CaptureLine[] {
  const byId = new Map(skus.map((s) => [s.id, s]));
  const byCode = new Map(skus.map((s) => [s.code, s]));
  const lines: CaptureLine[] = [];

  segments.forEach((segment, index) => {
    const parsed = parseSegment(segment.original);
    const hintSku = segment.hint?.skuCode ? byCode.get(segment.hint.skuCode) : undefined;
    if (parsed.tokens.length === 0 && parsed.quantity === null && !hintSku) return;

    const quantity = parsed.quantity ?? segment.hint?.quantity ?? null;
    const ranked = rankSkus(parsed, skus, aliases, pastSkuIds);
    const top = ranked[0];

    let chosen: SkuFull | undefined;
    let confidence: Confidence = "NONE";
    if (top?.viaAlias) {
      chosen = byId.get(top.sku.id);
      confidence = "HIGH";
    } else if (hintSku) {
      chosen = hintSku;
      confidence = top && top.sku.id === hintSku.id ? confidenceFor(ranked) : "MEDIUM";
    } else if (top && top.score >= 0.3) {
      chosen = byId.get(top.sku.id);
      confidence = confidenceFor(ranked);
    }

    const alternatives = ranked
      .filter((r) => r.sku.id !== chosen?.id)
      .slice(0, chosen ? 2 : 3)
      .map((r) => byId.get(r.sku.id))
      .filter((s): s is SkuFull => Boolean(s))
      .map(toOption);

    let note: string | null = null;
    if (chosen && top?.heuristic && top.sku.id === chosen.id) {
      note = "Matched from the size word in your message. Please check the pack size.";
    } else if (quantity === null) {
      note = "No quantity found. Set it before adding.";
    }

    const needsUnitConfirm = parsed.unit !== "CASE" || quantity === null;
    const suggestedCases =
      parsed.unit === "PIECE" && chosen && quantity !== null && quantity % chosen.piecesPerCase === 0
        ? quantity / chosen.piecesPerCase
        : null;

    lines.push({
      id: `l${index}`,
      original: parsed.original,
      quantity,
      unit: parsed.unit,
      needsUnitConfirm,
      suggestedCases,
      chosen: chosen ? toOption(chosen) : null,
      confidence,
      alternatives,
      outOfStock: chosen ? chosen.stockCases <= 0 : false,
      note,
    });
  });

  return lines;
}
