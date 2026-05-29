/**
 * IKEA catalog — the swappable "real furniture" layer.
 *
 * This module is the single source of truth for the styles we offer and the
 * real IKEA products we match to each one. It is intentionally self-contained
 * so that when a live IKEA product API is available, only this file needs to
 * be replaced: keep the exported shapes (StylePreset, Product) and the lookup
 * helpers identical, and swap the in-memory data for live API calls.
 */

export interface StylePreset {
  id: string;
  name: string;
  tagline: string;
  description: string;
  accentColor: string;
  previewImage: string;
  /** Internal-only direction passed to the image model. Not exposed via the API. */
  promptHint: string;
}

export interface RoomType {
  id: string;
  name: string;
  description: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  color: string;
  price: number;
  currency: string;
  /** Room type ids this product is eligible for. */
  roomTypes: string[];
  /** Functional role in the room (e.g. sofa, bed, rug), used for de-cluttered selection. */
  role: string;
  imageUrl: string;
  buyUrl: string;
}

const STYLE_DATA: StylePreset[] = [
  {
    id: "cozy",
    name: "Cozy",
    tagline: "Warm, layered, hygge",
    description:
      "Soft textures, warm wood tones, and gentle lighting that make a room feel like a hug.",
    accentColor: "#C77B4A",
    previewImage: "/api/assets/styles/cozy.png",
    promptHint:
      "Warm, inviting hygge atmosphere with soft textures, warm wood tones, layered textiles, and gentle ambient lighting.",
  },
  {
    id: "dark",
    name: "Dark",
    tagline: "Moody and refined",
    description:
      "Deep charcoals, rich woods, and dramatic low lighting for a sophisticated, grounded feel.",
    accentColor: "#3A3D44",
    previewImage: "/api/assets/styles/dark.png",
    promptHint:
      "Moody, sophisticated dark palette with deep charcoals, rich dark woods, dramatic low lighting, and a refined feel.",
  },
  {
    id: "white",
    name: "White",
    tagline: "Bright Scandinavian",
    description:
      "Crisp whites, light woods, and clean lines that flood the space with calm, airy light.",
    accentColor: "#8AA395",
    previewImage: "/api/assets/styles/white.png",
    promptHint:
      "Bright, airy Scandinavian minimalism with crisp whites, light woods, clean lines, and abundant natural light.",
  },
  {
    id: "modern",
    name: "Modern",
    tagline: "Sleek and contemporary",
    description:
      "Clean geometry, muted tones, and premium materials for an uncluttered, contemporary look.",
    accentColor: "#4C6B6F",
    previewImage: "/api/assets/styles/modern.png",
    promptHint:
      "Sleek contemporary design with clean geometry, muted tones, premium materials, and uncluttered sophistication.",
  },
];

function product(
  id: string,
  name: string,
  category: string,
  color: string,
  price: number,
  roomTypes: string[],
  role: string,
  imageUrl: string,
  buyUrl: string,
): Product {
  return {
    id,
    name,
    category,
    color,
    price,
    currency: "USD",
    roomTypes,
    role,
    imageUrl,
    buyUrl,
  };
}

/**
 * Room types drive product selection. A redesign is grounded in a de-cluttered
 * set of pieces chosen for the chosen room (see getProductsForRoom).
 */
const ROOM_DATA: RoomType[] = [
  {
    id: "living-room",
    name: "Living Room",
    description: "Sofa, coffee table, and layered lighting for a shared space.",
  },
  {
    id: "bedroom",
    name: "Bedroom",
    description: "Bed, nightstand, and storage for a restful retreat.",
  },
];

/**
 * The active IKEA test catalog: eleven real IKEA US products. These are the pool
 * the image model draws from; for any given redesign a de-cluttered subset is
 * selected per room (one piece per functional role, capped). Prices in USD.
 *
 * When the live IKEA product API lands, replace this array (and, if needed, the
 * helpers below) — nothing else in the route or client should need to change.
 */
const PRODUCT_DATA: Product[] = [
  product(
    "kivik-sofa",
    "KIVIK Sofa",
    "Sofa, 3-seat",
    "Tibbleby beige/gray",
    799,
    ["living-room"],
    "sofa",
    "https://www.ikea.com/us/en/images/products/kivik-sofa-tibbleby-beige-gray__1056143_pe848278_s5.jpg?f=u",
    "https://www.ikea.com/us/en/p/kivik-sofa-tibbleby-beige-gray-s39440593/",
  ),
  product(
    "listerby-coffee-table",
    "LISTERBY Coffee Table",
    "Coffee table",
    "Oak veneer",
    249.99,
    ["living-room"],
    "coffee-table",
    "https://www.ikea.com/us/en/images/products/listerby-coffee-table-oak-veneer__1022538_pe832796_s5.jpg?f=u",
    "https://www.ikea.com/us/en/p/listerby-coffee-table-oak-veneer-50515313/",
  ),
  product(
    "billy-bookcase",
    "BILLY Bookcase",
    "Bookcase",
    "White",
    79,
    ["living-room"],
    "bookcase",
    "https://www.ikea.com/us/en/images/products/billy-bookcase-white__0625599_pe692385_s5.jpg?f=u",
    "https://www.ikea.com/us/en/p/billy-bookcase-white-20522046/",
  ),
  product(
    "poang-armchair",
    "POÄNG Armchair",
    "Armchair",
    "Birch veneer / Knisa light beige",
    129,
    ["living-room"],
    "accent-seating",
    "https://www.ikea.com/us/en/images/products/poaeng-armchair-birch-veneer-knisa-light-beige__0571500_pe666933_s5.jpg?f=u",
    "https://www.ikea.com/us/en/p/poaeng-armchair-birch-veneer-knisa-light-beige-s59305928/",
  ),
  product(
    "sinnerlig-pendant-lamp",
    "SINNERLIG Pendant Lamp",
    "Pendant lamp",
    "Bamboo / handmade",
    69.99,
    ["living-room"],
    "pendant",
    "https://www.ikea.com/us/en/images/products/sinnerlig-pendant-lamp-bamboo-handmade__0919001_pe786542_s5.jpg?f=u",
    "https://www.ikea.com/us/en/p/sinnerlig-pendant-lamp-bamboo-handmade-70315030/",
  ),
  product(
    "malm-bed-frame",
    "MALM Bed Frame",
    "Bed frame, Queen",
    "White / Luröy",
    299,
    ["bedroom"],
    "bed",
    "https://www.ikea.com/us/en/images/products/malm-bed-frame-white-luroey__1101527_pe866706_s5.jpg?f=u",
    "https://www.ikea.com/us/en/p/malm-bed-frame-white-luroey-s29009482/",
  ),
  product(
    "hemnes-nightstand",
    "HEMNES Nightstand",
    "Nightstand",
    "White stain",
    129.99,
    ["bedroom"],
    "nightstand",
    "https://www.ikea.com/us/en/images/products/hemnes-nightstand-white-stain__0624424_pe691831_s5.jpg?f=u",
    "https://www.ikea.com/us/en/p/hemnes-nightstand-white-stain-20200456/",
  ),
  product(
    "hemnes-dresser",
    "HEMNES 6-drawer Dresser",
    "Dresser",
    "White stain",
    399.99,
    ["bedroom"],
    "dresser",
    "https://www.ikea.com/us/en/images/products/hemnes-6-drawer-dresser-white-stain__1151315_pe886165_s5.jpg?f=u",
    "https://www.ikea.com/us/en/p/hemnes-6-drawer-dresser-white-stain-00576196/",
  ),
  product(
    "taernaby-table-lamp",
    "TÄRNABY Table Lamp",
    "Table lamp",
    "Anthracite",
    34.99,
    ["bedroom"],
    "table-lamp",
    "https://www.ikea.com/us/en/images/products/taernaby-table-lamp-dimmable-anthracite__1188962_pe899634_s5.jpg?f=u",
    "https://www.ikea.com/us/en/p/taernaby-table-lamp-anthracite-00323887/",
  ),
  product(
    "lohals-rug",
    "LOHALS Rug",
    "Rug, flatwoven",
    "Natural jute",
    129,
    ["living-room", "bedroom"],
    "rug",
    "https://www.ikea.com/us/en/images/products/lohals-rug-flatwoven-natural__0280221_pe419173_s5.jpg?f=u",
    "https://www.ikea.com/us/en/p/lohals-rug-flatwoven-natural-50277393/",
  ),
  product(
    "lauters-floor-lamp",
    "LAUTERS Floor Lamp",
    "Floor lamp",
    "Ash / white",
    79.99,
    ["living-room", "bedroom"],
    "floor-lamp",
    "https://www.ikea.com/us/en/images/products/lauters-floor-lamp-ash-white__0663863_pe712536_s5.jpg?f=u",
    "https://www.ikea.com/us/en/p/lauters-floor-lamp-ash-white-00405048/",
  ),
];

/**
 * Per-room functional role priority. Selection walks this list in order, picks
 * the first eligible product per role, and caps the result — keeping the redesign
 * (and its shoppable tags) de-cluttered and believable for the room.
 */
const ROOM_ROLE_PRIORITY: Record<string, string[]> = {
  "living-room": [
    "sofa",
    "coffee-table",
    "rug",
    "floor-lamp",
    "accent-seating",
    "bookcase",
    "pendant",
  ],
  bedroom: ["bed", "nightstand", "dresser", "table-lamp", "rug", "floor-lamp"],
};

const MAX_PRODUCTS_PER_ROOM = 5;

/** Public style list (without internal prompt hints). */
export function listStyles(): Omit<StylePreset, "promptHint">[] {
  return STYLE_DATA.map(({ promptHint: _promptHint, ...rest }) => rest);
}

export function getStyle(styleId: string): StylePreset | undefined {
  return STYLE_DATA.find((s) => s.id === styleId);
}

export function listRooms(): RoomType[] {
  return ROOM_DATA;
}

export function getRoom(roomTypeId: string): RoomType | undefined {
  return ROOM_DATA.find((r) => r.id === roomTypeId);
}

/**
 * Returns the full active product catalog. Kept for the /products endpoint and
 * forward compatibility; selection for a redesign goes through getProductsForRoom.
 */
export function getProductsForStyle(_styleId?: string): Product[] {
  return PRODUCT_DATA;
}

/**
 * Deterministically selects a de-cluttered set of products for a room: one piece
 * per functional role, ordered by the room's role priority and capped at
 * MAX_PRODUCTS_PER_ROOM. This keeps the generated room — and the "Shop the look"
 * tags overlaid on it — accurate and uncluttered.
 */
export function getProductsForRoom(roomTypeId: string): Product[] {
  const eligible = PRODUCT_DATA.filter((p) => p.roomTypes.includes(roomTypeId));

  const byRole = new Map<string, Product>();
  for (const p of eligible) {
    if (!byRole.has(p.role)) {
      byRole.set(p.role, p);
    }
  }

  const priority = ROOM_ROLE_PRIORITY[roomTypeId] ?? [];
  const ordered: Product[] = [];
  for (const role of priority) {
    const match = byRole.get(role);
    if (match) {
      ordered.push(match);
      byRole.delete(role);
    }
  }
  // Append any eligible roles not covered by the priority list (future-proofing).
  for (const remaining of byRole.values()) {
    ordered.push(remaining);
  }

  return ordered.slice(0, MAX_PRODUCTS_PER_ROOM);
}
