import { applyBp } from "@/lib/money";

export type Scheme =
  | { type: "FREE_GOODS"; buyCases: number; freeCases: number }
  | { type: "SLAB_PERCENT"; minCases: number; percentBp: number };

export type PriceLineInput = {
  qtyCases: number; // cases the retailer pays for
  piecesPerCase: number;
  piecePricePaise: number; // per piece (assumption A1)
  scheme?: Scheme | null;
};

export type PriceLineResult = {
  paidCases: number;
  freeCases: number;
  deliveredCases: number; // paid + free; this is what leaves stock (A4)
  grossPaise: number;
  discountPaise: number;
  lineTotalPaise: number;
};

export class SchemeInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SchemeInputError";
  }
}

const isPosInt = (n: unknown): n is number =>
  typeof n === "number" && Number.isSafeInteger(n) && n > 0;
const isNonNegInt = (n: unknown): n is number =>
  typeof n === "number" && Number.isSafeInteger(n) && n >= 0;

function validate(input: PriceLineInput): void {
  if (!isPosInt(input.qtyCases)) {
    throw new SchemeInputError("qtyCases must be a positive whole number");
  }
  if (!isPosInt(input.piecesPerCase)) {
    throw new SchemeInputError("piecesPerCase must be a positive whole number");
  }
  if (!isNonNegInt(input.piecePricePaise)) {
    throw new SchemeInputError("piecePricePaise must be a non-negative whole number");
  }
  const s = input.scheme;
  if (!s) return;
  if (s.type === "FREE_GOODS") {
    if (!isPosInt(s.buyCases) || !isPosInt(s.freeCases)) {
      throw new SchemeInputError("FREE_GOODS needs positive whole buyCases and freeCases");
    }
  } else if (s.type === "SLAB_PERCENT") {
    if (!isPosInt(s.minCases) || !isNonNegInt(s.percentBp) || s.percentBp > 10000) {
      throw new SchemeInputError("SLAB_PERCENT needs positive minCases and percentBp 0..10000");
    }
  }
}

/**
 * Prices one order line. Pure function: no database, no AI.
 * - FREE_GOODS: every full `buyCases` paid earns `freeCases` free (A2).
 * - SLAB_PERCENT: once qty >= minCases, the percentage applies to the whole line (A3).
 */
export function priceLine(input: PriceLineInput): PriceLineResult {
  validate(input);
  const { qtyCases, piecesPerCase, piecePricePaise, scheme } = input;

  const casePricePaise = piecePricePaise * piecesPerCase;
  const grossPaise = casePricePaise * qtyCases;

  let freeCases = 0;
  let discountPaise = 0;

  if (scheme?.type === "FREE_GOODS") {
    freeCases = Math.floor(qtyCases / scheme.buyCases) * scheme.freeCases;
  } else if (scheme?.type === "SLAB_PERCENT" && qtyCases >= scheme.minCases) {
    discountPaise = applyBp(grossPaise, scheme.percentBp);
  }

  return {
    paidCases: qtyCases,
    freeCases,
    deliveredCases: qtyCases + freeCases,
    grossPaise,
    discountPaise,
    lineTotalPaise: grossPaise - discountPaise,
  };
}

export type PriceOrderResult = {
  lines: PriceLineResult[];
  subtotalPaise: number;
  discountPaise: number;
  totalPaise: number;
};

export function priceOrder(inputs: PriceLineInput[]): PriceOrderResult {
  const lines = inputs.map(priceLine);
  const subtotalPaise = lines.reduce((sum, l) => sum + l.grossPaise, 0);
  const discountPaise = lines.reduce((sum, l) => sum + l.discountPaise, 0);
  return { lines, subtotalPaise, discountPaise, totalPaise: subtotalPaise - discountPaise };
}
