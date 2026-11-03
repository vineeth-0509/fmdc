import { PrismaClient, Role, SchemeType, type OrderSource, type OrderStatus } from "@prisma/client";
import { priceLine, type Scheme } from "../src/server/schemes/engine";

const prisma = new PrismaClient();

// All amounts are integer paise (₹8.10 = 810). Prices are per piece (assumption A1).
// The first three SKUs and their stock and schemes come from the brief. The rest are invented sample data (A12).
type SeedSku = {
  code: string;
  name: string;
  nameHi: string;
  piecesPerCase: number;
  stockCases: number;
  basePricePaise: number;
  scheme: Scheme | null;
};

const SKUS: SeedSku[] = [
  { code: "SKU-BS-075", name: "Glucose biscuit 75 g, case of 96", nameHi: "ग्लूकोज़ बिस्किट 75 ग्रा, 96 का केस", piecesPerCase: 96, stockCases: 340, basePricePaise: 810, scheme: { type: "FREE_GOODS", buyCases: 10, freeCases: 1 } },
  { code: "SKU-DT-1KG", name: "Detergent powder 1 kg, case of 20", nameHi: "डिटर्जेंट पाउडर 1 किग्रा, 20 का केस", piecesPerCase: 20, stockCases: 85, basePricePaise: 10150, scheme: { type: "SLAB_PERCENT", minCases: 5, percentBp: 300 } },
  { code: "SKU-TE-250", name: "Tea leaf 250 g, case of 40", nameHi: "चाय पत्ती 250 ग्रा, 40 का केस", piecesPerCase: 40, stockCases: 0, basePricePaise: 11800, scheme: null },
  { code: "SKU-BS-150", name: "Cream biscuit 150 g, case of 48", nameHi: "क्रीम बिस्किट 150 ग्रा, 48 का केस", piecesPerCase: 48, stockCases: 210, basePricePaise: 2000, scheme: null },
  { code: "SKU-DT-500", name: "Detergent powder 500 g, case of 40", nameHi: "डिटर्जेंट पाउडर 500 ग्रा, 40 का केस", piecesPerCase: 40, stockCases: 120, basePricePaise: 5400, scheme: { type: "SLAB_PERCENT", minCases: 5, percentBp: 300 } },
  { code: "SKU-TE-100", name: "Tea leaf 100 g, case of 80", nameHi: "चाय पत्ती 100 ग्रा, 80 का केस", piecesPerCase: 80, stockCases: 60, basePricePaise: 4800, scheme: null },
  { code: "SKU-DS-250", name: "Dish wash bar 250 g, case of 48", nameHi: "बर्तन धोने की टिकिया 250 ग्रा, 48 का केस", piecesPerCase: 48, stockCases: 150, basePricePaise: 1800, scheme: { type: "FREE_GOODS", buyCases: 5, freeCases: 1 } },
  { code: "SKU-FL-500", name: "Floor cleaner 500 ml, case of 24", nameHi: "फ़र्श क्लीनर 500 मिली, 24 का केस", piecesPerCase: 24, stockCases: 40, basePricePaise: 9500, scheme: null },
  { code: "SKU-NS-200", name: "Salted namkeen 200 g, case of 36", nameHi: "नमकीन 200 ग्रा, 36 का केस", piecesPerCase: 36, stockCases: 95, basePricePaise: 3500, scheme: null },
  { code: "SKU-SP-100", name: "Soap bar 100 g, case of 72", nameHi: "साबुन 100 ग्रा, 72 का केस", piecesPerCase: 72, stockCases: 300, basePricePaise: 2400, scheme: null },
];

// Invented retailers (A12). priceFactorBp 10000 = base price. Yadav Traders is close to its
// credit limit on purpose, so the credit-hold flow can be demonstrated.
const RETAILERS = [
  { name: "Sharma General Store", phone: "9000000001", creditLimitPaise: 7_500_000, outstandingPaise: 1_200_000, priceFactorBp: 10000 },
  { name: "Gupta Kirana Store", phone: "9000000002", creditLimitPaise: 5_000_000, outstandingPaise: 0, priceFactorBp: 10100 },
  { name: "Patel Provision Mart", phone: "9000000003", creditLimitPaise: 4_000_000, outstandingPaise: 500_000, priceFactorBp: 9900 },
  { name: "Jain Super Shop", phone: "9000000004", creditLimitPaise: 6_000_000, outstandingPaise: 2_500_000, priceFactorBp: 10000 },
  { name: "Yadav Traders", phone: "9000000005", creditLimitPaise: 2_000_000, outstandingPaise: 1_800_000, priceFactorBp: 10200 },
];

const DESK_PHONE = "9000000099";

type SeedOrder = {
  retailer: string;
  status: OrderStatus;
  source: OrderSource;
  hoursAgo: number;
  lines: { code: string; qty: number; original?: string }[];
  rawText?: string;
  note?: string;
  rejectReason?: string;
};

const ORDERS: SeedOrder[] = [
  { retailer: "Sharma General Store", status: "EXPORTED", source: "APP", hoursAgo: 24 * 9, lines: [{ code: "SKU-SP-100", qty: 4 }, { code: "SKU-NS-200", qty: 2 }] },
  { retailer: "Sharma General Store", status: "CONFIRMED", source: "APP", hoursAgo: 24 * 3, lines: [{ code: "SKU-BS-075", qty: 10 }, { code: "SKU-DT-1KG", qty: 5 }] },
  {
    retailer: "Gupta Kirana Store",
    status: "PLACED",
    source: "AI",
    hoursAgo: 2,
    rawText: "bhaiya 5 peti biscuit chhota, 2 peti washing powder 1 kilo, chai patti 250 wala 1 peti",
    note: "Tea 250 g is out of stock, so it was left out.",
    lines: [
      { code: "SKU-BS-075", qty: 5, original: "bhaiya 5 peti biscuit chhota" },
      { code: "SKU-DT-1KG", qty: 2, original: "2 peti washing powder 1 kilo" },
    ],
  },
  { retailer: "Jain Super Shop", status: "PLACED", source: "APP", hoursAgo: 5, lines: [{ code: "SKU-DS-250", qty: 10 }, { code: "SKU-FL-500", qty: 3 }] },
  { retailer: "Yadav Traders", status: "CREDIT_HOLD", source: "APP", hoursAgo: 1, lines: [{ code: "SKU-DT-1KG", qty: 5 }] },
  { retailer: "Patel Provision Mart", status: "REJECTED", source: "APP", hoursAgo: 24 * 2, lines: [{ code: "SKU-TE-100", qty: 3 }], rejectReason: "This pack size is being discontinued. Please order the 250 g pack." },
];

async function main() {
  // Clear in dependency order so the seed can be re-run.
  await prisma.orderEvent.deleteMany();
  await prisma.orderLine.deleteMany();
  await prisma.order.deleteMany();
  await prisma.capture.deleteMany();
  await prisma.alias.deleteMany();
  await prisma.scheme.deleteMany();
  await prisma.retailerPrice.deleteMany();
  await prisma.otpCode.deleteMany();
  await prisma.user.deleteMany();
  await prisma.sku.deleteMany();
  await prisma.retailer.deleteMany();

  const skuIds = new Map<string, string>();
  for (const s of SKUS) {
    const sku = await prisma.sku.create({
      data: { code: s.code, name: s.name, nameHi: s.nameHi, piecesPerCase: s.piecesPerCase, stockCases: s.stockCases },
    });
    skuIds.set(s.code, sku.id);
    if (s.scheme) {
      await prisma.scheme.create({
        data:
          s.scheme.type === "FREE_GOODS"
            ? { skuId: sku.id, type: SchemeType.FREE_GOODS, buyCases: s.scheme.buyCases, freeCases: s.scheme.freeCases }
            : { skuId: sku.id, type: SchemeType.SLAB_PERCENT, minCases: s.scheme.minCases, percentBp: s.scheme.percentBp },
      });
    }
  }

  const retailers = new Map<string, { id: string; userId: string; factor: number }>();
  for (const r of RETAILERS) {
    const retailer = await prisma.retailer.create({
      data: { name: r.name, creditLimitPaise: r.creditLimitPaise, outstandingPaise: r.outstandingPaise },
    });
    const user = await prisma.user.create({ data: { phone: r.phone, role: Role.RETAILER, retailerId: retailer.id } });
    await prisma.retailerPrice.createMany({
      data: SKUS.map((s) => ({
        retailerId: retailer.id,
        skuId: skuIds.get(s.code)!,
        piecePricePaise: Math.round((s.basePricePaise * r.priceFactorBp) / 10000),
      })),
    });
    retailers.set(r.name, { id: retailer.id, userId: user.id, factor: r.priceFactorBp });
  }

  const desk = await prisma.user.create({ data: { phone: DESK_PHONE, role: Role.DESK } });

  for (const o of ORDERS) {
    const r = retailers.get(o.retailer)!;
    const createdAt = new Date(Date.now() - o.hoursAgo * 3600_000);

    const priced = o.lines.map((l) => {
      const s = SKUS.find((x) => x.code === l.code)!;
      const piecePricePaise = Math.round((s.basePricePaise * r.factor) / 10000);
      const res = priceLine({ qtyCases: l.qty, piecesPerCase: s.piecesPerCase, piecePricePaise, scheme: s.scheme });
      return { l, piecePricePaise, res };
    });
    const subtotal = priced.reduce((t, p) => t + p.res.grossPaise, 0);
    const discount = priced.reduce((t, p) => t + p.res.discountPaise, 0);

    const capture = o.rawText
      ? await prisma.capture.create({
          data: { retailerId: r.id, rawText: o.rawText, resultJson: { mode: "rules", notice: null, lines: [] }, createdAt },
        })
      : null;

    const events: { actorId: string; action: string; note?: string; at: Date }[] = [
      {
        actorId: r.userId,
        action: o.status === "CREDIT_HOLD" ? "CREDIT_HOLD" : "PLACED",
        note: o.status === "CREDIT_HOLD" ? "Order is above the credit limit and needs desk approval." : undefined,
        at: createdAt,
      },
    ];
    const later = (mins: number) => new Date(createdAt.getTime() + mins * 60_000);
    if (o.status === "CONFIRMED" || o.status === "EXPORTED") events.push({ actorId: desk.id, action: "CONFIRMED", at: later(40) });
    if (o.status === "EXPORTED") events.push({ actorId: desk.id, action: "EXPORTED", note: "Included in a Tally CSV.", at: later(24 * 60) });
    if (o.status === "REJECTED") events.push({ actorId: desk.id, action: "REJECTED", note: o.rejectReason, at: later(30) });

    await prisma.order.create({
      data: {
        retailerId: r.id,
        source: o.source,
        status: o.status,
        subtotalPaise: subtotal,
        discountPaise: discount,
        totalPaise: subtotal - discount,
        note: o.note ?? null,
        captureId: capture?.id ?? null,
        createdAt,
        lines: {
          create: priced.map((p) => ({
            skuId: skuIds.get(p.l.code)!,
            qtyCases: p.l.qty,
            freeCases: p.res.freeCases,
            piecePricePaise: p.piecePricePaise,
            discountPaise: p.res.discountPaise,
            lineTotalPaise: p.res.lineTotalPaise,
            originalText: p.l.original ?? null,
          })),
        },
        events: { create: events.map((e) => ({ actorId: e.actorId, action: e.action, note: e.note ?? null, createdAt: e.at })) },
      },
    });

    // Open and confirmed orders hold stock. Rejected orders do not.
    if (o.status !== "REJECTED") {
      for (const p of priced) {
        await prisma.sku.update({
          where: { id: skuIds.get(p.l.code)! },
          data: { stockCases: { decrement: p.res.deliveredCases } },
        });
      }
    }
  }

  console.log("Seed complete.");
  console.log("Retailer demo login: 9000000001 (Sharma General Store)");
  console.log(`Order desk demo login: ${DESK_PHONE}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
