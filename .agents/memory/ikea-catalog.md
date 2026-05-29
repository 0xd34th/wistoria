---
name: IKEA catalog classification quirks
description: How product role/group are assigned and where to fix miscategorizations in Wistoria
---

## Categorization is coarse and corrected at READ time, not ingest

The ingestion script (`scripts/src/ingestIkea.ts`) derives each product's
`role` and `group` from keyword maps over IKEA's `category`/typeName. These are
coarse: e.g. EVERY bench (including shoe-storage / storage / toy-storage
benches) was bucketed as `role: bench`, `group: Seating`, so storage benches
wrongly appeared as seating swap candidates.

**Where to fix miscategorizations:** `reclassifyProduct()` in
`artifacts/api-server/src/data/ikeaCatalog.ts`, applied in the DB getters
(`getProductsForStyle`, `getEligibleProductsForRoom`, `getProductsByIds`). It
runs at read time, so corrections land on existing DB rows WITHOUT re-running
ingestion. The human-readable `category` field carries the real type (e.g.
"Bench with shoe storage", "Storage bench") and is the signal to match on.

**Why read-time:** re-ingesting hits IKEA's network endpoint and can shift the
whole catalog; the catalog module is the swappable boundary, so normalizing
there is low-risk and immediate. Trade-off: classification is virtual (not
persisted), so SQL-side filters won't see the corrected role/group.

Existing groups to route into: Storage, Seating, Tables & Desks, Lighting,
Decor, Textiles, Rugs, Beds, Other.
