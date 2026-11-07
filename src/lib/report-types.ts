export type ReportPreview = {
  orders: number;
  lines: number;
  cases: number;
  freeCases: number;
  totalPaise: number;
  rangeLabel: string;
  shops: { id: string; name: string; orders: number; lines: number; totalPaise: number }[];
};
