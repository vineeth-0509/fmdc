# Company A order app

A mobile-first, installable web app for a Jabalpur FMCG distributor. Retailers see their own prices, stock and
schemes, order in a minute, or paste a WhatsApp-style message that the app turns into order lines. The order desk
reviews orders, handles credit holds, corrects AI matches and exports confirmed orders to a Tally-compatible CSV.

This is the **Core Build** slice of the brief: retailer catalogue with prices and schemes, cart and order, AI order
capture from a text message, and the order desk with Tally export. Roles: retailer and order desk.

- **Stack:** Next.js (App Router) + React + TypeScript, Tailwind CSS, Prisma, PostgreSQL, Zod, Vitest.
- **Setup, environment variables, demo logins and deployment:** see [deployment.md](deployment.md).
- **Assumptions and limits:** see [docs/assumptions-and-limits.md](docs/assumptions-and-limits.md).

## How it is organised

```
src/
  app/                 Routes: /login, /retailer/*, /desk/*, /api/*
  components/          UI (catalogue, cart, capture, desk) and shared primitives
  lib/                 Money helpers, auth (token, session, OTP), validation, i18n
  server/
    schemes/engine.ts  Pure scheme engine: free goods and slab discounts. No database, no AI.
    pricing.ts         Prices a cart from server-side data; stock and credit rules
    orders.ts          Place, confirm, reject and correct orders (transactions, stock locks)
    capture/           Message matching: keyword rules, optional LLM step, validation
    export/tally.ts    Tally CSV builder
    export/xlsx.ts     Small Excel (.xlsx) writer with no extra packages
    reports/           Period maths, report rows, summary and workbook for the Reports screen
prisma/                Schema and seed data
tests/                 Unit tests for the logic that matters most
```

## Rules the code enforces

- **Money is never a float.** Everything is integer paise; percentages are basis points.
- **The browser never sets a price.** It sends product ids and quantities. Prices, schemes, stock and totals are
  recalculated on the server for every preview and every order.
- **AI only suggests.** It cannot invent a SKU, a price, stock or a discount, and nothing is ordered until the
  retailer confirms and places the order.
- **Retailers only see their own data.** Every retailer query is scoped by the retailer id in the signed session.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build and server |
| `npm test` | Run the unit tests |
| `npm run typecheck` | TypeScript check |
| `npm run db:migrate` | Create and apply migrations (development) |
| `npm run db:deploy` | Apply migrations (production) |
| `npm run db:seed` | Load the sample data (safe to re-run) |
