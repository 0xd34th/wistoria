# RoomLab

RoomLab is an Expo mobile app where a user photographs their room, picks a style (cozy / dark / white / modern), and gets an AI-generated redesign grounded in real, shoppable IKEA furniture with tap-to-buy links.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm --filter @workspace/mobile run dev` — run the Expo app (via workflow only)
- `pnpm --filter @workspace/mobile run typecheck` — typecheck the mobile app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- Required secret: `OPENAI_API_KEY` (user-provided; used directly, not the Replit AI Integrations proxy)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Mobile: Expo (expo-router, expo-image-picker, expo-image, expo-web-browser), React Query
- API: Express 5
- AI: OpenAI `gpt-image-2` image edit (latest model), called via a direct `openai` client in `artifacts/api-server/src/lib/openai.ts` using `OPENAI_API_KEY`
- Validation: Zod (`zod/v4`)
- API codegen: Orval (from OpenAPI spec)
- Storage: device-local AsyncStorage (no server DB)

## Where things live

- API contract: `lib/api-spec/openapi.yaml` (do not change `info.title` — it controls generated filenames)
- Generated hooks/types: `lib/api-client-react/src/generated/` (consumed via `@workspace/api-client-react`)
- IKEA catalog (swappable layer): `artifacts/api-server/src/data/ikeaCatalog.ts` — 4 styles + a global test catalog of 4 real IKEA US products (POÄNG Armchair, LOHALS Rug, LAUTERS Floor Lamp, SINNERLIG Pendant Lamp) with real product-page buy links and IKEA CDN image URLs. `getProductsForStyle` returns all 4 regardless of style.
- Redesign route: `artifacts/api-server/src/routes/redesign.ts`
- OpenAI client: `artifacts/api-server/src/lib/openai.ts` (direct `OPENAI_API_KEY` client)
- Static product/style images: `artifacts/api-server/assets/` served at `/api/assets/...`
- Mobile screens: `artifacts/mobile/app/` (`index.tsx` home, `create.tsx`, `redesign/[id].tsx`)
- AsyncStorage context: `artifacts/mobile/hooks/useSavedRedesigns.tsx`
- Theme tokens: `artifacts/mobile/constants/colors.ts` (terracotta + sage palette)

## Architecture decisions

- IKEA furniture data is isolated in `ikeaCatalog.ts` as a clean, swappable module — real IKEA APIs will replace it later without touching routes or the client.
- `/redesign` accepts base64 image + styleId, prompts the image model with the catalog products, and returns the redesigned image (base64) plus the grounding products. Body limit raised to 25mb for image payloads. The prompt is written to keep the room's layout/architecture/perspective IDENTICAL and only renovate with the catalog's IKEA pieces.
- Mobile navigates with `useRouter().push()` rather than `<Link asChild>` — on web, `Link asChild` + `Pressable` with array styles crashes react-native-web (array style reaches a raw `<a>`).
- The app reaches the API via `setBaseUrl(https://${EXPO_PUBLIC_DOMAIN})`; relative asset paths from the API are made absolute with `lib/utils.ts#getAssetUrl`.

## Product

- Home: gallery of saved redesigns (AsyncStorage) or an empty state.
- Create: capture/upload a room photo, choose a style, generate (20-70s).
- Result: before/after toggle (Canvas/Curated) of the room; a "Shop the look" toggle overlays tappable IKEA tag cards (name + price) on the redesigned image at distributed anchor points; plus a shoppable IKEA product list. All open the real IKEA product page in the browser.

## User preferences

- No emojis anywhere in the product or code.
- IKEA integration must stay a clean, swappable module; user will provide real IKEA APIs at the very end.

## Gotchas

- The `/redesign` call is slow (~50-70s) and costs credits; the Create screen has a dedicated generating state.
- `@expo/vector-icons` (Feather) fonts must be preloaded in `app/_layout.tsx` via `...Feather.font` in `useFonts` — otherwise icons render as blank boxes on real devices (Expo Go), even though they look fine on web (where the font loads via CSS). Expo Go must be fully reloaded to pick up newly bundled fonts.
- Do not change `info.title` in `openapi.yaml`.
- Run `pnpm --filter @workspace/api-spec run codegen` after editing the OpenAPI spec.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See the `expo` skill for mobile build conventions
