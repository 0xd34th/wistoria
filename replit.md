# Wistoria

Wistoria is an Expo mobile app where a user photographs their room, picks a style (cozy / dark / white / modern), and gets an AI-generated redesign grounded in real, shoppable IKEA furniture with tap-to-buy links.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm --filter @workspace/mobile run dev` — run the Expo app (via workflow only)
- `pnpm --filter @workspace/mobile run typecheck` — typecheck the mobile app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/scripts run ingest:ikea` — re-ingest the IKEA catalog from IKEA's public search endpoint into `artifacts/api-server/src/data/ikeaSeed.json`
- `pnpm --filter @workspace/scripts run seed:revenuecat` — (re)create the RevenueCat products, entitlement, and offering. Idempotent-ish: re-running creates fresh resources; only run when intentionally provisioning. Prints the public API keys + IDs at the end.
- Required secret: `OPENAI_API_KEY` (user-provided; used directly, not the Replit AI Integrations proxy)
- RevenueCat env vars (already set, public client keys — not secrets): `EXPO_PUBLIC_REVENUECAT_TEST_API_KEY`, `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`, `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`, plus `REVENUECAT_PROJECT_ID` / `REVENUECAT_TEST_STORE_APP_ID` / `REVENUECAT_APPLE_APP_STORE_APP_ID` / `REVENUECAT_GOOGLE_PLAY_STORE_APP_ID`.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Mobile: Expo (expo-router, expo-image-picker, expo-image, expo-web-browser), React Query
- API: Express 5
- AI: OpenAI `gpt-image-2` image edit (latest model), called via a direct `openai` client in `artifacts/api-server/src/lib/openai.ts` using `OPENAI_API_KEY`. Image `quality` is `"low"` on both initial generation and regeneration (faster/cheaper).
- Validation: Zod (`zod/v4`)
- API codegen: Orval (from OpenAPI spec)
- Storage: device-local AsyncStorage for saved redesigns; Postgres (Drizzle) for the IKEA product catalog

## Where things live

- API contract: `lib/api-spec/openapi.yaml` (do not change `info.title` — it controls generated filenames)
- Generated hooks/types: `lib/api-client-react/src/generated/` (consumed via `@workspace/api-client-react`)
- IKEA catalog (swappable layer): `artifacts/api-server/src/data/ikeaCatalog.ts` — imports `ikeaSeed.json` (hundreds of real IKEA US products) as `SEED_PRODUCTS`, seeds them into Postgres on boot (`seedIkeaProducts()`, chunked upserts), and exposes async DB getters plus the pure `selectDecluttered()` selector. Each product carries a controlled `role` (narrow category, e.g. "coffee-table") and `group` (broad bucket, e.g. "Tables & Desks") plus `roomTypes`.
- IKEA ingestion script: `scripts/src/ingestIkea.ts` (`ingest:ikea`) — queries IKEA's public search endpoint (`sik.search.blue.cdtapps.com`) across ~58 terms, normalizes each hit to the `Product` shape, derives `role`/`group`/`roomTypes` from keyword maps, dedupes, caps per role, and writes `artifacts/api-server/src/data/ikeaSeed.json`.
- Redesign route: `artifacts/api-server/src/routes/redesign.ts`
- OpenAI client: `artifacts/api-server/src/lib/openai.ts` (direct `OPENAI_API_KEY` client)
- Static product/style images: `artifacts/api-server/assets/` served at `/api/assets/...`
- Mobile screens: `artifacts/mobile/app/` (`index.tsx` home, `create.tsx`, `redesign/[id].tsx`)
- AsyncStorage context: `artifacts/mobile/hooks/useSavedRedesigns.tsx`
- Theme tokens: `artifacts/mobile/constants/colors.ts` (terracotta + sage palette)
- Subscriptions (RevenueCat): `artifacts/mobile/lib/revenuecat.tsx` (`SubscriptionProvider`/`useSubscription`, `initializeRevenueCat`, entitlement `"pro"`, `isRevenueCatTestMode`), `artifacts/mobile/hooks/useFreeUsage.tsx` (free-quota counter), `artifacts/mobile/components/Paywall.tsx` (paywall modal).
- RevenueCat provisioning: `scripts/src/revenueCatClient.ts` (`getUncachableRevenueCatClient` via the Replit connector proxy) + `scripts/src/seedRevenueCat.ts` (`seed:revenuecat`).

## Architecture decisions

- IKEA furniture data is isolated in `ikeaCatalog.ts` as a clean, swappable module — real IKEA APIs will replace it later without touching routes or the client. The catalog now lives in Postgres (seeded from `ikeaSeed.json`); swapping the source means re-pointing the getters, not editing routes/clients.
- The swap modal filters alternatives by `group` (broad bucket chips) with an optional `role` sub-filter (narrow category chips), so a large catalog stays navigable. The alternatives list is a virtualized `FlatList` to stay performant across hundreds of items. The same modal is reused in "add" mode (`isAdding`) to append a piece instead of replacing one.
- The default (first) generation is randomized: `selectDecluttered(..., randomize)` shuffles the eligible pool (Fisher-Yates) so each role's representative piece varies run-to-run. `getProductsForRoom` only randomizes when there are no `selectedProductIds`; curation/regeneration stays deterministic. The pure `selectDecluttered` defaults `randomize=false` so the unit test stays deterministic. Per-room cap is `MAX_PRODUCTS_PER_ROOM` (6); "wall-art" is in the room priority lists so a painting is included by default.
- `/redesign` accepts base64 image + styleId, prompts the image model with the catalog products, and returns the redesigned image (base64) plus the grounding products. Body limit raised to 25mb for image payloads. The prompt is written to keep the room's layout/architecture/perspective IDENTICAL and only renovate with the catalog's IKEA pieces.
- Mobile navigates with `useRouter().push()` rather than `<Link asChild>` — on web, `Link asChild` + `Pressable` with array styles crashes react-native-web (array style reaches a raw `<a>`).
- The app reaches the API via `setBaseUrl(https://${EXPO_PUBLIC_DOMAIN})`; relative asset paths from the API are made absolute with `lib/utils.ts#getAssetUrl`.
- Monetization is RevenueCat cross-store (Apple + Google), entitlement `"pro"`. Pricing: Free = 1 redesign per device (lifetime); Wistoria Pro = up to `PRO_DAILY_LIMIT` (5) redesigns per local calendar day — NOT unlimited, because every generation calls gpt-image-2 (~$0.04-0.05 each, reference images billed at high fidelity regardless of output quality) so an uncapped plan could cost more than the subscription. 5/day (~150/mo) is roughly break-even worst case and highly profitable in normal use. Monthly $9.99 / Annual $59.99 under offering `default` (`$rc_monthly` + `$rc_annual`). Prices in the paywall are ALWAYS derived from `package.product.priceString`/`.price` — never hardcoded. BOTH initial create AND regenerate are paid generations and are gated/counted identically (free=1 lifetime across both; Pro=daily cap across both). The free counter (`useFreeUsage`, key `@wistoria_free_redesigns_used`) is monotonic and never decremented, so deleting saved redesigns cannot farm more free generations. The Pro daily counter (`useDailyUsage`, key `@wistoria_pro_daily_used`, stores `{date,count}`, resets on local date change) caps subscribers; quota is persisted BEFORE state updates and only after a successful generation. Caps are CLIENT-SIDE by design (mirrors the existing client-trust, anonymous/`deviceId` model — a server check keyed by client-supplied `deviceId` would be equally bypassable; true anti-abuse needs backend entitlement verification, out of scope). Exhausted free users see the paywall; Pro users at their daily cap see an inline notice (not the paywall). `initializeRevenueCat()` runs at module scope in `_layout.tsx` inside try/catch; the tree is wrapped with `SubscriptionProvider` + `FreeUsageProvider` + `DailyUsageProvider` (inside `QueryClientProvider`, since all use react-query/AsyncStorage). In Test Store mode (`isRevenueCatTestMode()`: dev, web, or Expo Go) the paywall shows a custom in-component confirm overlay instead of `Alert.alert`.

## Product

- Home: gallery of saved redesigns (AsyncStorage) or an empty state, plus a "Go Pro"/"Pro" pill in the header that opens the paywall (also the Restore Purchases entry point).
- Create: capture/upload a room photo, choose a style, generate (20-70s). Generation is gated: non-subscribers who have used their free redesign see the paywall; subscribers who have hit their daily cap see an inline "limit resets tomorrow" notice. The same gating applies to regenerate on the result screen (it is another paid generation).
- Result: before/after toggle (Canvas/Curated) of the room, plus a shoppable IKEA product list (each opens the real IKEA product page in the browser). There are no on-image overlay tags — they couldn't be anchored to the actual furniture positions, so the product list below the image is the single source of truth. The shown image can be opened fullscreen with pinch/pan/double-tap zoom (`components/ZoomableImageModal.tsx`) and downloaded/saved (web anchor download; native `expo-file-system/legacy` write + `expo-media-library` save). The Collection supports Swap (replace a piece), Remove, and Add a piece (open the picker in "add" mode to append any eligible product — works even after removing everything).

## User preferences

- No emojis anywhere in the product or code.
- IKEA integration must stay a clean, swappable module; user will provide real IKEA APIs at the very end.

## Gotchas

- The `/redesign` call is slow (~50-70s) and costs credits; the Create screen has a dedicated generating state.
- `@expo/vector-icons` (Feather) fonts must be preloaded in `app/_layout.tsx` via `...Feather.font` in `useFonts` — otherwise icons render as blank boxes on real devices (Expo Go), even though they look fine on web (where the font loads via CSS). Expo Go must be fully reloaded to pick up newly bundled fonts.
- Do not change `info.title` in `openapi.yaml`.
- Run `pnpm --filter @workspace/api-spec run codegen` after editing the OpenAPI spec.
- `seedIkeaProducts()` upserts (it does not delete), so re-running ingestion with fewer items leaves stale rows in the DB. Live `/products` count can exceed `ikeaSeed.json` length if older-id rows persist; reset the table if an exact match is required.
- Re-running `ingest:ikea` overwrites `ikeaSeed.json`. The IKEA search endpoint is public/unauthenticated and may change shape — the script normalizes `item.product.{id,name,typeName,mainImageUrl,pipUrl,salesPrice}`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See the `expo` skill for mobile build conventions
