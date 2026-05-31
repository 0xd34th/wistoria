---
name: IKEA seed integrity
description: ikeaSeed.json imageUrl requirements and the guard logic that protects production from empty-URL rows.
---

## Rule
`ikeaSeed.json` must have a real IKEA image URL on every product entry. An empty `imageUrl` causes two cascading failures at runtime:
1. `fetchProductReferenceImages` calls `fetch("")` → `TypeError: Invalid URL` → 0 reference images attached → degraded redesign quality.
2. `ProductThumb` shows the fallback Feather "image" icon instead of the product photo.

**Why:** Commit `dc51f37` replaced 1,644 working products with 10,212 scraped products that had `imageUrl: ""`. This was silently seeded into production on first deploy, corrupting the catalog.

**How to apply:**
- The canonical good seed is the 1,644-product version from commit `bb245d1` (all imageUrls valid).
- `seedIkeaProducts()` now guards against accidental overwrites:
  - SQL: `CASE WHEN excluded.image_url = '' THEN image_url ELSE excluded.image_url END` — never clobbers a non-empty URL.
  - Post-seed `DELETE WHERE image_url = ''` — purges any stale no-URL rows on startup, including in production.
- If expanding the catalog, run `fetchIkea.ts` and verify every product has a non-empty `imageUrl` before committing.
