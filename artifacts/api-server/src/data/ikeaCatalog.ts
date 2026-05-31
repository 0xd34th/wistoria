import { db, ikeaProductsTable } from "@workspace/db";
import { and, arrayContains, inArray, ne, sql } from "drizzle-orm";

import ikeaSeed from "./ikeaSeed.json";

export interface StylePreset {
  id: string;
  name: string;
  tagline: string;
  description: string;
  accentColor: string;
  previewImage: string;
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
  roomTypes: string[];
  role: string;
  group: string;
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
  {
    id: "kitchen",
    name: "Kitchen",
    description: "Bar stools, open shelving, and a cart for a functional cook space.",
  },
  {
    id: "dining-room",
    name: "Dining Room",
    description: "Table, chairs, and a pendant for gathering over meals.",
  },
  {
    id: "home-office",
    name: "Home Office",
    description: "Desk, chair, and storage for a focused workspace.",
  },
];

export const SEED_PRODUCTS: Product[] = ikeaSeed as Product[];

const ROOM_ROLE_PRIORITY: Record<string, string[]> = {
  "living-room": [
    "sofa",
    "coffee-table",
    "rug",
    "floor-lamp",
    "wall-art",
    "accent-seating",
    "bookcase",
    "pendant",
  ],
  bedroom: [
    "bed",
    "nightstand",
    "wall-art",
    "dresser",
    "table-lamp",
    "rug",
    "floor-lamp",
  ],
  kitchen: ["bar-stool", "open-shelf", "pendant", "cart"],
  "dining-room": ["dining-table", "dining-chair", "pendant", "wall-art", "rug"],
  "home-office": [
    "desk",
    "office-chair",
    "shelving",
    "wall-art",
    "task-lamp",
    "drawer-unit",
  ],
};

const MAX_PRODUCTS_PER_ROOM = 6;

function reclassifyProduct(p: Product): Product {
  if (p.role === "bench" && /storage|shoe/i.test(p.category)) {
    return { ...p, role: "storage-bench", group: "Storage" };
  }
  return p;
}

function reclassifyAll(products: Product[]): Product[] {
  return products.map(reclassifyProduct);
}

function shuffleProducts(products: Product[]): Product[] {
  const copy = [...products];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

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

export async function seedIkeaProducts(): Promise<void> {
  if (SEED_PRODUCTS.length === 0) return;
  const CHUNK_SIZE = 500;
  for (let i = 0; i < SEED_PRODUCTS.length; i += CHUNK_SIZE) {
    const chunk = SEED_PRODUCTS.slice(i, i + CHUNK_SIZE);
    await db
      .insert(ikeaProductsTable)
      .values(chunk)
      .onConflictDoUpdate({
        target: ikeaProductsTable.id,
        set: {
          name: sql`excluded.name`,
          category: sql`excluded.category`,
          color: sql`excluded.color`,
          price: sql`excluded.price`,
          currency: sql`excluded.currency`,
          roomTypes: sql`excluded.room_types`,
          role: sql`excluded.role`,
          group: sql`excluded."group"`,
          imageUrl: sql`excluded.image_url`,
          buyUrl: sql`excluded.buy_url`,
        },
      });
  }
}

export async function getProductsForStyle(_styleId?: string): Promise<Product[]> {
  const rows = await db
    .select()
    .from(ikeaProductsTable)
    .orderBy(ikeaProductsTable.id);
  return reclassifyAll(rows);
}

export async function getEligibleProductsForRoom(
  roomTypeId: string,
): Promise<Product[]> {
  const rows = await db
    .select()
    .from(ikeaProductsTable)
    .where(
      and(
        arrayContains(ikeaProductsTable.roomTypes, [roomTypeId]),
        ne(ikeaProductsTable.role, "other"),
      ),
    )
    .orderBy(ikeaProductsTable.id);
  return reclassifyAll(rows);
}

export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  if (ids.length === 0) return [];
  const rows = await db
    .select()
    .from(ikeaProductsTable)
    .where(inArray(ikeaProductsTable.id, ids));
  const byId = new Map(reclassifyAll(rows).map((p) => [p.id, p]));
  const result: Product[] = [];
  for (const id of ids) {
    const match = byId.get(id);
    if (match) result.push(match);
  }
  return result;
}

export function selectDecluttered(
  eligible: Product[],
  roomTypeId: string,
  selectedProductIds?: string[],
  randomize = false,
): Product[] {
  const pool = randomize ? shuffleProducts(eligible) : eligible;
  const byRole = new Map<string, Product>();
  for (const p of pool) {
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
  for (const remaining of byRole.values()) {
    ordered.push(remaining);
  }

  const defaultSelection = ordered.slice(0, MAX_PRODUCTS_PER_ROOM);

  if (!selectedProductIds || selectedProductIds.length === 0) {
    return defaultSelection;
  }

  const allowed = new Set(selectedProductIds);
  const filtered = defaultSelection.filter((p) => allowed.has(p.id));
  return filtered.length > 0 ? filtered : defaultSelection;
}

export async function getProductsForRoom(
  roomTypeId: string,
  selectedProductIds?: string[],
): Promise<Product[]> {
  const eligible = await getEligibleProductsForRoom(roomTypeId);
  const randomize = !selectedProductIds || selectedProductIds.length === 0;
  return selectDecluttered(eligible, roomTypeId, selectedProductIds, randomize);
}
