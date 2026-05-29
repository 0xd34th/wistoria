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

function ikeaSearchUrl(name: string): string {
  return `https://www.ikea.com/us/en/search/?q=${encodeURIComponent(name)}`;
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
  styleId: string,
  id: string,
  name: string,
  category: string,
  color: string,
  price: number,
): Product {
  return {
    id,
    name,
    category,
    color,
    price,
    currency: "USD",
    styleId,
    imageUrl: `/api/assets/products/${id}.png`,
    buyUrl: ikeaSearchUrl(name),
  };
}

const PRODUCT_DATA: Product[] = [
  // Cozy
  product("cozy", "cozy-poang", "POÄNG Armchair", "Seating", "Birch / beige", 149),
  product("cozy", "cozy-klippan", "KLIPPAN Loveseat", "Sofas", "Warm rust", 279),
  product("cozy", "cozy-vindum", "VINDUM Rug", "Rugs", "Cream high pile", 179),
  product("cozy", "cozy-sinnerlig", "SINNERLIG Pendant Lamp", "Lighting", "Natural bamboo", 79.99),
  // Dark
  product("dark", "dark-landskrona", "LANDSKRONA Sofa", "Sofas", "Dark grey leather", 899),
  product("dark", "dark-hektar", "HEKTAR Floor Lamp", "Lighting", "Dark grey", 69.99),
  product("dark", "dark-kallax", "KALLAX Shelf Unit", "Storage", "Black-brown", 79.99),
  product("dark", "dark-stockholm", "STOCKHOLM Coffee Table", "Tables", "Walnut veneer", 279),
  // White
  product("white", "white-soderhamn", "SÖDERHAMN Sofa", "Sofas", "Light beige", 999),
  product("white", "white-docksta", "DOCKSTA Table", "Tables", "White", 229),
  product("white", "white-billy", "BILLY Bookcase", "Storage", "White", 69.99),
  product("white", "white-fado", "FADO Table Lamp", "Lighting", "White glass", 19.99),
  // Modern
  product("modern", "modern-kivik", "KIVIK Sofa", "Sofas", "Slate grey", 699),
  product("modern", "modern-listerby", "LISTERBY Coffee Table", "Tables", "Oak veneer", 179),
  product("modern", "modern-nymane", "NYMÅNE Floor Lamp", "Lighting", "Anthracite", 89),
  product("modern", "modern-vittsjo", "VITTSJÖ Shelving Unit", "Storage", "Black / glass", 69.99),
];

/** Public style list (without internal prompt hints). */
export function listStyles(): Omit<StylePreset, "promptHint">[] {
  return STYLE_DATA.map(({ promptHint: _promptHint, ...rest }) => rest);
}

export function getStyle(styleId: string): StylePreset | undefined {
  return STYLE_DATA.find((s) => s.id === styleId);
}

export function getProductsForStyle(styleId?: string): Product[] {
  if (!styleId) return PRODUCT_DATA;
  return PRODUCT_DATA.filter((p) => p.styleId === styleId);
}
