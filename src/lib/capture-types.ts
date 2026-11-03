export type Confidence = "HIGH" | "MEDIUM" | "LOW" | "NONE";
export type Unit = "CASE" | "PIECE" | "UNKNOWN";

export type SkuOption = {
  id: string;
  code: string;
  name: string;
  nameHi: string | null;
  stockCases: number;
  piecesPerCase: number;
};

export type CaptureLine = {
  id: string;
  original: string;
  quantity: number | null;
  unit: Unit;
  needsUnitConfirm: boolean;
  suggestedCases: number | null;
  chosen: SkuOption | null;
  confidence: Confidence;
  alternatives: SkuOption[];
  outOfStock: boolean;
  note: string | null;
};

export type CaptureResult = {
  captureId: string;
  mode: "ai" | "rules";
  notice: string | null;
  lines: CaptureLine[];
};
