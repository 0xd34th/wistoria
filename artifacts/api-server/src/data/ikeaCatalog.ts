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

export interface Product {
  id: string;
  name: string;
  category: string;
  color: string;
  price: number;
  currency: string;
  styleId: string;
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
    styleId: "all",
    imageUrl,
    buyUrl,
  };
}

/**
 * The active IKEA test catalog: four real IKEA US products. These are the exact
 * pieces the image model is instructed to place in every redesign, and the items
 * surfaced as shoppable tags and cards in the app. Prices in USD.
 *
 * When the live IKEA product API lands, replace this array (and, if needed, the
 * helpers below) — nothing else in the route or client should need to change.
 */
const PRODUCT_DATA: Product[] = [
  product(
    "poang-armchair",
    "POÄNG Armchair",
    "Armchair",
    "Birch veneer / Knisa light beige",
    129,
    "https://www.ikea.com/us/en/images/products/poaeng-armchair-birch-veneer-knisa-light-beige__0571500_pe666933_s5.jpg?f=u",
    "https://www.ikea.com/us/en/p/poaeng-armchair-birch-veneer-knisa-light-beige-s59305928/",
  ),
  product(
    "lohals-rug",
    "LOHALS Rug",
    "Rug, flatwoven",
    "Natural jute",
    129,
    "https://www.ikea.com/us/en/images/products/lohals-rug-flatwoven-natural__0280221_pe419173_s5.jpg?f=u",
    "https://www.ikea.com/us/en/p/lohals-rug-flatwoven-natural-50277393/",
  ),
  product(
    "lauters-floor-lamp",
    "LAUTERS Floor Lamp",
    "Floor lamp",
    "Ash / white",
    79.99,
    "https://www.ikea.com/us/en/images/products/lauters-floor-lamp-ash-white__0663863_pe712536_s5.jpg?f=u",
    "https://www.ikea.com/us/en/p/lauters-floor-lamp-ash-white-00405048/",
  ),
  product(
    "sinnerlig-pendant-lamp",
    "SINNERLIG Pendant Lamp",
    "Pendant lamp",
    "Bamboo / handmade",
    69.99,
    "https://www.ikea.com/us/en/images/products/sinnerlig-pendant-lamp-bamboo-handmade__0919001_pe786542_s5.jpg?f=u",
    "https://www.ikea.com/us/en/p/sinnerlig-pendant-lamp-bamboo-handmade-70315030/",
  ),
];

/** Public style list (without internal prompt hints). */
export function listStyles(): Omit<StylePreset, "promptHint">[] {
  return STYLE_DATA.map(({ promptHint: _promptHint, ...rest }) => rest);
}

export function getStyle(styleId: string): StylePreset | undefined {
  return STYLE_DATA.find((s) => s.id === styleId);
}

/**
 * Returns the active product catalog. The test catalog is global (every style is
 * renovated with the same four real IKEA pieces), so the optional styleId is
 * currently ignored but kept for forward compatibility with a per-style API.
 */
export function getProductsForStyle(_styleId?: string): Product[] {
  return PRODUCT_DATA;
}
