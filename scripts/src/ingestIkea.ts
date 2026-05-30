/**
 * IKEA catalog ingestion.
 *
 * Pulls real IKEA US products from IKEA's public search endpoint across a broad
 * set of furniture terms, normalizes each hit into the app's Product shape, and
 * derives a controlled taxonomy:
 *   - role  : narrow functional slot (sofa, table-lamp, ...) used for de-clutter
 *   - group : broad bucket (Lighting, Seating, ...) used for high-level swap
 *   - roomTypes: which rooms the piece is eligible for
 *
 * Output is written to artifacts/api-server/src/data/ikeaSeed.json, which the
 * server seeds into Postgres on boot. This is the swappable layer: when a live
 * IKEA product API lands, only this script (the seed source) changes.
 *
 * Run: pnpm --filter @workspace/scripts run ingest:ikea
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SEARCH_BASE =
  "https://sik.search.blue.cdtapps.com/us/en/search-result-page";
const PAGE_SIZE = 120;
/** Keep the catalog in the hundreds-to-a-thousand range with balanced variety. */
const MAX_PER_ROLE = 30;

/** Broad set of search terms covering the rooms and categories we redesign. */
const SEARCH_TERMS = [
  "sofa",
  "sectional sofa",
  "loveseat",
  "armchair",
  "lounge chair",
  "recliner",
  "coffee table",
  "side table",
  "console table",
  "tv unit",
  "tv bench",
  "bookcase",
  "shelf",
  "shelving unit",
  "cabinet",
  "display cabinet",
  "sideboard",
  "dresser",
  "chest of drawers",
  "drawer unit",
  "wardrobe",
  "shoe cabinet",
  "bed frame",
  "bed",
  "mattress",
  "nightstand",
  "bedside table",
  "headboard",
  "daybed",
  "bunk bed",
  "dining table",
  "dining chair",
  "bar stool",
  "kitchen cart",
  "kitchen island",
  "desk",
  "office chair",
  "gaming chair",
  "floor lamp",
  "table lamp",
  "work lamp",
  "desk lamp",
  "pendant lamp",
  "ceiling lamp",
  "chandelier",
  "wall lamp",
  "rug",
  "mirror",
  "curtains",
  "cushion",
  "plant pot",
  "ottoman",
  "bench",
  "pouffe",
  "stool",
  "magazine rack",
  "room divider",
  "vanity",
  "makeup table",
  "wall art",
  "poster",
  "picture",
  "art print",
  "wall decoration",
];

interface RawColor {
  name?: string;
}
interface RawSalesPrice {
  numeral?: number;
  currencyCode?: string;
}
interface RawProduct {
  id?: string;
  name?: string;
  typeName?: string;
  filterClass?: string;
  mainImageUrl?: string;
  pipUrl?: string;
  colors?: RawColor[];
  salesPrice?: RawSalesPrice;
}
interface RawItem {
  product?: RawProduct;
}

interface SeedProduct {
  id: string;
  name: string;
  category: string;
  color: string;
  price: number;
  currency: string;
  roomTypes: string[];
  role: string;
  group: string;
  imageUrl: string;
  buyUrl: string;
}

const ROOMS = {
  living: "living-room",
  bedroom: "bedroom",
  kitchen: "kitchen",
  dining: "dining-room",
  office: "home-office",
} as const;

/**
 * Ordered role rules. First match wins, so more specific phrases must come
 * before broader ones ("table lamp" before "table", "bar stool" before "stool").
 */
const ROLE_RULES: { role: string; match: string[] }[] = [
  { role: "coffee-table", match: ["coffee table"] },
  { role: "dining-table", match: ["dining table", "table and"] },
  { role: "table-lamp", match: ["table lamp"] },
  { role: "floor-lamp", match: ["floor lamp", "reading lamp"] },
  { role: "task-lamp", match: ["work lamp", "desk lamp", "clamp spotlight"] },
  {
    role: "pendant",
    match: ["pendant", "ceiling lamp", "chandelier", "ceiling light"],
  },
  { role: "wall-lamp", match: ["wall lamp", "sconce"] },
  { role: "bar-stool", match: ["bar stool", "counter stool"] },
  {
    role: "office-chair",
    match: ["office chair", "swivel chair", "gaming chair", "desk chair"],
  },
  { role: "dining-chair", match: ["dining chair"] },
  {
    role: "accent-seating",
    match: ["armchair", "lounge chair", "recliner", "easy chair", "wing chair"],
  },
  { role: "sofa", match: ["sofa", "couch", "sectional", "loveseat", "settee"] },
  { role: "bed", match: ["bed frame", "daybed", "bunk bed", "loft bed"] },
  { role: "nightstand", match: ["nightstand", "bedside"] },
  { role: "dresser", match: ["dresser", "chest of drawers"] },
  { role: "drawer-unit", match: ["drawer unit", "drawers on casters"] },
  { role: "wardrobe", match: ["wardrobe"] },
  { role: "bookcase", match: ["bookcase"] },
  { role: "open-shelf", match: ["wall shelf"] },
  { role: "shelving", match: ["shelf unit", "shelving unit", "open shelf"] },
  { role: "cabinet", match: ["cabinet", "sideboard", "buffet"] },
  { role: "tv-unit", match: ["tv unit", "tv bench"] },
  { role: "cart", match: ["cart", "trolley", "kitchen island"] },
  { role: "desk", match: ["desk", "table top"] },
  { role: "rug", match: ["rug", "carpet"] },
  { role: "mirror", match: ["mirror"] },
  { role: "curtains", match: ["curtain"] },
  { role: "cushion", match: ["cushion", "pillow"] },
  { role: "plant", match: ["plant", "plant pot"] },
  { role: "ottoman", match: ["ottoman", "footstool", "pouffe"] },
  { role: "bench", match: ["bench"] },
  { role: "stool", match: ["stool"] },
  { role: "table", match: ["table"] },
  { role: "chair", match: ["chair"] },
  { role: "lamp", match: ["lamp", "light"] },
  // Wall art comes after the lamp rule so "picture light" classifies as a lamp,
  // while plain "Picture" / "Poster" / "Wall decoration" fall through to here.
  {
    role: "wall-art",
    match: [
      "picture",
      "poster",
      "wall decoration",
      "decoration for wall",
      "art print",
      "artwork",
    ],
  },
];

/** role -> broad group. Generic roles fall back to keyword matching. */
const ROLE_GROUP: Record<string, string> = {
  sofa: "Seating",
  "accent-seating": "Seating",
  "dining-chair": "Seating",
  "bar-stool": "Seating",
  "office-chair": "Seating",
  ottoman: "Seating",
  bench: "Seating",
  stool: "Seating",
  chair: "Seating",
  "coffee-table": "Tables & Desks",
  "dining-table": "Tables & Desks",
  desk: "Tables & Desks",
  table: "Tables & Desks",
  "tv-unit": "Storage",
  bookcase: "Storage",
  shelving: "Storage",
  "open-shelf": "Storage",
  cabinet: "Storage",
  wardrobe: "Storage",
  dresser: "Storage",
  "drawer-unit": "Storage",
  nightstand: "Storage",
  cart: "Storage",
  bed: "Beds",
  "floor-lamp": "Lighting",
  "table-lamp": "Lighting",
  "task-lamp": "Lighting",
  "wall-lamp": "Lighting",
  pendant: "Lighting",
  lamp: "Lighting",
  rug: "Rugs",
  curtains: "Textiles",
  cushion: "Textiles",
  mirror: "Decor",
  plant: "Decor",
  "wall-art": "Wall Art",
};

const GROUP_KEYWORDS: { group: string; match: string[] }[] = [
  { group: "Lighting", match: ["lamp", "light", "pendant", "chandelier"] },
  {
    group: "Seating",
    match: [
      "sofa",
      "couch",
      "armchair",
      "chair",
      "stool",
      "bench",
      "pouffe",
      "recliner",
      "ottoman",
    ],
  },
  { group: "Beds", match: ["bed", "mattress", "headboard"] },
  {
    group: "Storage",
    match: [
      "shelf",
      "bookcase",
      "cabinet",
      "dresser",
      "drawer",
      "wardrobe",
      "sideboard",
      "chest",
      "cart",
      "rack",
      "storage",
    ],
  },
  {
    group: "Wall Art",
    match: ["picture", "poster", "wall decoration", "art print", "artwork"],
  },
  { group: "Tables & Desks", match: ["table", "desk"] },
  { group: "Rugs", match: ["rug", "carpet"] },
  {
    group: "Textiles",
    match: ["cushion", "pillow", "throw", "curtain", "blanket", "duvet"],
  },
  {
    group: "Decor",
    match: ["mirror", "vase", "frame", "plant", "clock", "candle"],
  },
];

/** role -> eligible rooms. Generic roles get a sensible default. */
const ROLE_ROOMS: Record<string, string[]> = {
  sofa: [ROOMS.living],
  "coffee-table": [ROOMS.living],
  "accent-seating": [ROOMS.living, ROOMS.bedroom],
  bookcase: [ROOMS.living, ROOMS.office],
  "tv-unit": [ROOMS.living],
  rug: [ROOMS.living, ROOMS.bedroom, ROOMS.dining],
  "floor-lamp": [ROOMS.living, ROOMS.bedroom],
  "table-lamp": [ROOMS.bedroom, ROOMS.living],
  "wall-lamp": [ROOMS.living, ROOMS.bedroom],
  pendant: [ROOMS.living, ROOMS.dining, ROOMS.kitchen],
  bed: [ROOMS.bedroom],
  nightstand: [ROOMS.bedroom],
  dresser: [ROOMS.bedroom],
  wardrobe: [ROOMS.bedroom],
  "bar-stool": [ROOMS.kitchen],
  cart: [ROOMS.kitchen],
  "open-shelf": [ROOMS.kitchen, ROOMS.office],
  "dining-table": [ROOMS.dining],
  "dining-chair": [ROOMS.dining],
  desk: [ROOMS.office],
  "office-chair": [ROOMS.office],
  shelving: [ROOMS.office, ROOMS.living],
  "task-lamp": [ROOMS.office],
  "drawer-unit": [ROOMS.office, ROOMS.bedroom],
  cabinet: [ROOMS.living, ROOMS.dining],
  mirror: [ROOMS.bedroom, ROOMS.living],
  ottoman: [ROOMS.living],
  bench: [ROOMS.living, ROOMS.bedroom],
  curtains: [ROOMS.living, ROOMS.bedroom],
  cushion: [ROOMS.living, ROOMS.bedroom],
  plant: [ROOMS.living, ROOMS.bedroom],
  "wall-art": [ROOMS.living, ROOMS.bedroom, ROOMS.dining, ROOMS.office],
};

function classifyRole(blob: string): string {
  for (const { role, match } of ROLE_RULES) {
    if (match.some((m) => blob.includes(m))) return role;
  }
  return "other";
}

function classifyGroup(role: string, blob: string): string {
  const mapped = ROLE_GROUP[role];
  if (mapped) return mapped;
  for (const { group, match } of GROUP_KEYWORDS) {
    if (match.some((m) => blob.includes(m))) return group;
  }
  return "Other";
}

function classifyRooms(role: string, group: string): string[] {
  const mapped = ROLE_ROOMS[role];
  if (mapped) return mapped;
  // Group-level fallback for generic roles.
  switch (group) {
    case "Lighting":
      return [ROOMS.living, ROOMS.bedroom];
    case "Seating":
      return [ROOMS.living, ROOMS.dining];
    case "Tables & Desks":
      return [ROOMS.living, ROOMS.office];
    case "Storage":
      return [ROOMS.living, ROOMS.bedroom, ROOMS.office];
    case "Beds":
      return [ROOMS.bedroom];
    case "Rugs":
      return [ROOMS.living, ROOMS.bedroom, ROOMS.dining];
    case "Wall Art":
      return [ROOMS.living, ROOMS.bedroom, ROOMS.dining, ROOMS.office];
    case "Textiles":
    case "Decor":
      return [ROOMS.living, ROOMS.bedroom];
    default:
      return [ROOMS.living];
  }
}

async function fetchTerm(term: string): Promise<RawItem[]> {
  const url = `${SEARCH_BASE}?q=${encodeURIComponent(term)}&size=${PAGE_SIZE}&types=PRODUCT`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    console.warn(`  term "${term}" failed: ${res.status}`);
    return [];
  }
  const data = (await res.json()) as {
    searchResultPage?: { products?: { main?: { items?: RawItem[] } } };
  };
  return data.searchResultPage?.products?.main?.items ?? [];
}

function normalize(raw: RawProduct): SeedProduct | null {
  const id = raw.id?.trim();
  const name = raw.name?.trim();
  const typeName = raw.typeName?.trim();
  const imageUrl = raw.mainImageUrl?.trim();
  const buyUrl = raw.pipUrl?.trim();
  const price = raw.salesPrice?.numeral;
  if (!id || !name || !typeName || !imageUrl || !buyUrl) return null;
  if (typeof price !== "number" || !Number.isFinite(price) || price <= 0)
    return null;

  const blob = `${typeName} ${raw.filterClass ?? ""}`.toLowerCase();
  const role = classifyRole(blob);
  const group = classifyGroup(role, blob);
  const roomTypes = classifyRooms(role, group);

  return {
    id,
    name,
    category: typeName,
    color: raw.colors?.[0]?.name?.trim() || "Assorted",
    price,
    currency: raw.salesPrice?.currencyCode || "USD",
    roomTypes,
    role,
    group,
    imageUrl,
    buyUrl,
  };
}

async function main(): Promise<void> {
  const byId = new Map<string, SeedProduct>();
  console.log(`Ingesting IKEA catalog across ${SEARCH_TERMS.length} terms...`);

  for (const term of SEARCH_TERMS) {
    const items = await fetchTerm(term);
    let added = 0;
    for (const item of items) {
      if (!item.product) continue;
      const norm = normalize(item.product);
      if (!norm) continue;
      if (!byId.has(norm.id)) {
        byId.set(norm.id, norm);
        added += 1;
      }
    }
    console.log(`  ${term}: ${items.length} hits, +${added} new`);
    await new Promise((r) => setTimeout(r, 150));
  }

  const perRole = new Map<string, number>();
  const capped: SeedProduct[] = [];
  for (const p of byId.values()) {
    const count = perRole.get(p.role) ?? 0;
    if (count >= MAX_PER_ROLE) continue;
    perRole.set(p.role, count + 1);
    capped.push(p);
  }

  const products = capped.sort((a, b) => a.id.localeCompare(b.id));

  const here = path.dirname(fileURLToPath(import.meta.url));
  const outPath = path.resolve(
    here,
    "../../artifacts/api-server/src/data/ikeaSeed.json",
  );
  await writeFile(outPath, JSON.stringify(products, null, 2) + "\n", "utf8");

  const groups = new Map<string, number>();
  const rooms = new Map<string, number>();
  for (const p of products) {
    groups.set(p.group, (groups.get(p.group) ?? 0) + 1);
    for (const r of p.roomTypes) rooms.set(r, (rooms.get(r) ?? 0) + 1);
  }
  console.log(`\nWrote ${products.length} products to ${outPath}`);
  console.log("By group:", Object.fromEntries([...groups].sort()));
  console.log("By room:", Object.fromEntries([...rooms].sort()));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
