# Deployment guide

## 1. Prerequisites

- Node.js 20 or newer, and npm
- A PostgreSQL 14+ database (local, or a hosted one such as Neon or Supabase)

## 2. Run it locally

```bash
git clone <repository-url>
cd fmcg-order-app
npm install                      # also runs "prisma generate"
cp .env.example .env             # then edit .env (see section 3)
npm run db:migrate               # creates the tables
npm run db:seed                  # loads sample data
npm run dev                      # http://localhost:3000 (the first visit to each page is slow in dev mode)
# To feel real speed: npm run build && npm start
```

If you want a quick local database: `docker run --name fmcg-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=fmcg -p 5432:5432 -d postgres:16`,
then set `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fmcg`.

Run the tests with `npm test` and the type check with `npm run typecheck`.

## 3. Environment variables (names only)

| Name | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Signs the session cookie. Use a random string of 32+ characters |
| `OTP_DEMO_MODE` | `true` makes every login code equal `OTP_DEMO_CODE` and shows it on screen (assumption A8) |
| `OTP_DEMO_CODE` | The fixed code used in demo mode |
| `NEXT_PUBLIC_DEMO_HINTS` | `true` shows the demo phone numbers on the login screen |
| `NEXT_PUBLIC_BRAND_NAME` | Name shown in the app header (optional; default "Retailer Orders") |
| `IMAGE_MODEL` | Optional Google image model, only used by `npm run ai:images` to generate product pictures |
| `NEXT_PUBLIC_PRODUCT_PHOTOS` | `true` shows real photos from `public/products/<SKU code>.webp` (for example `SKU-BS-075.webp`); products without a photo keep the drawn pack |
| `LLM_API_KEY` | Google AI (Gemini) API key for the AI message reader. Optional: blank means keyword matching only |
| `LLM_MODEL` | Gemini model name, for example `gemini-2.5-flash` (optional) |

No secret is stored in the repository. `.env` is git-ignored; `.env.example` has names and placeholders only.

## 4. How it is deployed

The app is one Next.js project with a PostgreSQL database.

1. Create a PostgreSQL database and copy its connection string.
2. Import the repository into Vercel (or any Node host). Framework: Next.js. Build command: `npm run build`.
3. Add the environment variables above in the host's settings. Choose a database region close to India.
4. Apply the schema once against the production database from your machine:
   `DATABASE_URL="<production url>" npm run db:deploy`
5. Load the sample data once: `DATABASE_URL="<production url>" npm run db:seed`
6. Open the deployed URL and sign in with a demo account.

Live URL: *(add after deploying)*

`OTP_DEMO_MODE=true` is for the reviewer demo only. With real customers it must be `false` and SMS delivery
must be connected (it is mocked in this build: the code is written to the server log).

**Free database note:** a free hosted database sleeps when idle. If the first sign-in says the database is waking up,
wait a few seconds and try again. Add `&connect_timeout=30` to `DATABASE_URL` (and `&pgbouncer=true` for a pooled Neon URL).

## 5. Demo logins for the reviewer

Sign-in is by mobile number and a 6-digit code. In demo mode the code is shown on screen and is `000000`.

| Role | Mobile number | Notes |
|---|---|---|
| Retailer | `9000000001` | Sharma General Store |
| Retailer | `9000000005` | Yadav Traders: close to its credit limit, to see a credit hold |
| Retailer | `9000000002` to `9000000004` | Gupta, Patel and Jain: other retailers with their own prices |
| Order desk | `9000000099` | Sees all retailers |

## 6. Reviewer walkthrough (about five minutes)

1. Sign in as retailer `9000000001`. The catalogue shows this retailer's prices, stock chips and schemes.
   The tea pack is out of stock and cannot be added. Tap a product to open its page: details, a worked scheme
   table, and recommended products at the bottom (other sizes, products you often order, products on a scheme).
2. Add 10 cases of Glucose biscuit. Open the cart: 1 free case is added by the scheme engine. Add 5 cases of
   Detergent 1 kg: a 3% discount appears. Place the order.
3. Open **Order by message**. Choose **Use sample message** and **Read my message**. Check the three lines: the biscuit
   line asks for a size check, the detergent line is sure, the tea line is flagged out of stock. Remove the tea line,
   add the rest to the cart, and place the order.
   Then try **Take photo** (opens the camera on a phone) or **Upload photo** with a picture of a handwritten or printed
   order list. Photo reading needs the AI key; without it those two buttons are disabled and say why.
4. Sign out. Sign in as the order desk `9000000099`.
5. In the order list, use **Approve** for a quick approval or **Review** to open the order. Open the order that came from a message. Change the biscuit product to the 150 g pack and save: the retailer's
   own words are saved as an alias. Confirm the order.
6. Open the Yadav Traders order on **credit hold** and use **Release and confirm**.
7. Open **Tally export** and export the confirmed orders to CSV.
7b. Open **Reports**: choose two or three shops, a period (for example 1 month), keep Confirmed and Exported ticked.
   The preview shows orders, lines, cases and the total by shop. Download the **Excel** file (Summary, All orders and a tab
   per shop) or the **CSV**. Reports are read-only: downloading never changes an order.
8. On a phone-sized window, check the bottom navigation, the large buttons and the language toggle (English / Hindi).
