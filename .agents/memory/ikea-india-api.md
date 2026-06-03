---
name: IKEA India API parsing
description: The IKEA India search API (sik.search.blue.cdtapps.com/in/en) uses different product field names from the US catalog scraper.
---

## Rule
When parsing IKEA India API responses, use these field names (NOT the US equivalents):

| Field | India API | US API (wrong for IN) |
|---|---|---|
| Price | `salesPrice.numeral` | `price.numeral` |
| Image | `mainImageUrl` (full `https://` URL) | `images[].url` (path fragment) |
| Buy URL | `pipUrl` (real PDP link) | constructed manually |
| Product ID | `p.id` or `p.itemNo` | `p.id` |

**Why:** The India API endpoint (`/in/en/search-result-page`) returns a richer product object with `salesPrice` (includes `currencyCode: "INR"`), `mainImageUrl` as a complete absolute URL, and `pipUrl` pointing to the actual product detail page. The US catalog was built from a different scraper that returned partial image paths.

**How to apply:** In `scripts/src/fetchIkeaIndia.ts`, always read `p.salesPrice?.numeral` for price, use `p.mainImageUrl` directly as `imageUrl` (no `https://www.ikea.com` prefix needed), and set `buyUrl = p.pipUrl`.

Image filter `/_pe[0-9]+_s5/` still works — India URLs also include this pattern (e.g. `__1234948_pe917261_s5.jpg`).
