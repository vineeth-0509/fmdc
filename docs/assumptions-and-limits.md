# Assumptions and limits

These are decisions the brief did not make for us. Each is also listed in the Technical Design Document.

## Assumptions

| # | Assumption |
|---|---|
| A1 | "Dealer Price" is per piece. A case price is price × pieces per case (₹8.10 × 96 for the biscuit case). |
| A2 | "Buy 10 get 1 free" means every full 10 cases paid earns 1 free case (10 → 11, 20 → 22, 25 → 27). |
| A3 | The slab discount (3% at 5+ cases) applies to the whole line once the threshold is reached. |
| A4 | Free cases come out of stock, so stock must cover paid plus free cases. |
| A5 | Prices are shown without GST and labelled so. GST is not calculated; invoicing stays in Tally. |
| A6 | Credit limits and outstanding balances are seeded. An order that would take outstanding above the limit goes to credit hold. Outstanding rises when the desk confirms an order. |
| A7 | The Tally CSV layout is our own (one row per order line); the brief gives none. |
| A8 | OTP delivery is mocked. In demo mode every code equals `OTP_DEMO_CODE`. |
| A9 | The AI step uses an LLM API configured by environment variables. Without it, keyword matching is used. |
| A10 | "peti" means case. "chhota" suggests the smaller pack; this is a hint, so it is shown as "Please check". |
| A11 | The order desk is used on a laptop or desktop; it still works on a phone. |
| A12 | The extra products, retailers, prices, credit limits and sample orders are invented. |

## What was left out (on purpose)

Salesman role and offline mode, voice and photo capture, van loading lists, the 14-day no-order dashboard,
real SMS and WhatsApp, payments, delivery tracking and GST e-invoicing (the last three are out of scope in the brief).

## Known limits

- Matching categories are derived from the SKU code format (`SKU-<CATEGORY>-<size>`), which suits this catalogue.
- Order numbers are shown as `ORD-` plus 1000 and the database sequence.
- Outstanding credit moves only when the desk confirms an order; two open orders can together pass the limit, and
  the desk sees this at confirmation (the order then moves to credit hold).
- The service worker caches only static files. Pages and prices are never cached because they are private per retailer.
- Performance has to be measured on your deployment (Lighthouse, slow 3G) before it is quoted in the TDD.
