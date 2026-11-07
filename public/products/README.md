# Product photos (optional)

One image per product, named after the SKU code, for example `SKU-BS-075.webp` (`.png` or `.jpg` also work).
Square images of about 600 x 600 px work best; keep each under about 80 KB.

Two ways to fill this folder:

1. Add your own photos (best: photograph the real packs, or use pack shots you are allowed to use).
2. Run `npm run ai:images` to generate generic, unbranded pictures with a Google image model.
   Check every picture before using it; they are illustrative, not real packaging.

Then set `NEXT_PUBLIC_PRODUCT_PHOTOS=true` in `.env` and restart. Any product without a picture keeps the drawn pack.
