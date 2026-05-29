/**
 * IKEA catalog — the swappable "real furniture" layer.
 *
 * Styles and room types are static config. The IKEA products now live in
 * Postgres (ikea_products): SEED_PRODUCTS below is the seed source, pushed into
 * the table by seedIkeaProducts() on server boot, and every product read goes
 * through the database. When a live IKEA product API lands, replace the seed
 * (or seedIkeaProducts) — the table, read helpers, routes, and client are
 * unaffected.
 */

import { db, ikeaProductsTable } from "@workspace/db";
import { arrayContains, inArray, sql } from "drizzle-orm";

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

/**
 * Seed source for the ikea_products table: real IKEA US products. These are the
 * pool the image model draws from; for any given redesign a de-cluttered subset
 * is selected per room (one piece per functional role, capped). Prices in USD.
 *
 * seedIkeaProducts() upserts these into Postgres on boot. When the live IKEA
 * product API lands, replace this array (or seedIkeaProducts) — nothing else in
 * the route or client should need to change.
 */
export const SEED_PRODUCTS: Product[] = [
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
    ["living-room", "bedroom", "dining-room"],
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
  product(
    "raskog-utility-cart",
    "RÅSKOG Utility Cart",
    "Utility cart",
    "White",
    39.99,
    ["kitchen"],
    "cart",
    "https://www.ikea.com/us/en/images/products/raskog-utility-cart-white__1366882_pe957173_s5.jpg?f=u",
    "https://www.ikea.com/us/en/p/raskog-utility-cart-white-30586783/",
  ),
  product(
    "rosentorp-bar-stool",
    "ROSENTORP Bar Stool",
    "Bar stool with backrest",
    "White",
    70,
    ["kitchen"],
    "bar-stool",
    "https://www.ikea.com/us/en/images/products/rosentorp-bar-stool-with-backrest-counter-height-white__1434524_pe983576_s5.jpg?f=u",
    "https://www.ikea.com/us/en/p/rosentorp-bar-stool-with-backrest-counter-height-white-50618194/",
  ),
  product(
    "kungsfors-shelf",
    "KUNGSFORS Shelf",
    "Wall shelf",
    "Bamboo",
    24,
    ["kitchen"],
    "open-shelf",
    "https://www.ikea.com/us/en/images/products/kungsfors-shelf-bamboo__0709886_pe727146_s5.jpg?f=u",
    "https://www.ikea.com/us/en/p/kungsfors-shelf-bamboo-00401781/",
  ),
  product(
    "skurup-pendant-lamp",
    "SKURUP Pendant Lamp",
    "Pendant lamp",
    "Black",
    29.99,
    ["kitchen"],
    "pendant",
    "https://www.ikea.com/us/en/images/products/skurup-pendant-lamp-black__0604110_pe681110_s5.jpg?f=u",
    "https://www.ikea.com/us/en/p/skurup-pendant-lamp-black-70407124/",
  ),
  product(
    "ekedalen-dining-table",
    "EKEDALEN Extendable Table",
    "Dining table, extendable",
    "White",
    299.99,
    ["dining-room"],
    "dining-table",
    "https://www.ikea.com/us/en/images/products/ekedalen-extendable-table-white__0736965_pe740829_s5.jpg?f=u",
    "https://www.ikea.com/us/en/p/ekedalen-extendable-table-white-70340807/",
  ),
  product(
    "bergmund-chair",
    "BERGMUND Chair",
    "Dining chair",
    "Black / Gunnared medium gray",
    125,
    ["dining-room"],
    "dining-chair",
    "https://www.ikea.com/us/en/images/products/bergmund-chair-black-gunnared-medium-gray__0859533_pe780957_s5.jpg?f=u",
    "https://www.ikea.com/us/en/p/bergmund-chair-black-gunnared-medium-gray-s09471699/",
  ),
  product(
    "nymane-pendant-lamp",
    "NYMÅNE LED Pendant Lamp",
    "Pendant lamp",
    "Anthracite",
    99.99,
    ["dining-room"],
    "pendant",
    "https://www.ikea.com/us/en/images/products/nymane-led-pendant-lamp-wireless-dimmable-white-spectrum-anthracite__1008036_pe826684_s5.jpg?f=u",
    "https://www.ikea.com/us/en/p/nymane-led-pendant-lamp-wireless-dimmable-white-spectrum-anthracite-00504048/",
  ),
  product(
    "micke-desk",
    "MICKE Desk",
    "Desk",
    "White",
    99.99,
    ["home-office"],
    "desk",
    "https://www.ikea.com/us/en/images/products/micke-desk-white__0736018_pe740345_s5.jpg?f=u",
    "https://www.ikea.com/us/en/p/micke-desk-white-80213074/",
  ),
  product(
    "markus-office-chair",
    "MARKUS Office Chair",
    "Office chair",
    "Vissle dark gray",
    299.99,
    ["home-office"],
    "office-chair",
    "https://www.ikea.com/us/en/images/products/markus-office-chair-vissle-dark-gray__0724714_pe734597_s5.jpg?f=u",
    "https://www.ikea.com/us/en/p/markus-office-chair-vissle-dark-gray-90289172/",
  ),
  product(
    "kallax-shelf-unit",
    "KALLAX Shelf Unit",
    "Shelf unit",
    "White",
    79.99,
    ["home-office"],
    "shelving",
    "https://www.ikea.com/us/en/images/products/kallax-shelf-unit-white__0644757_pe702939_s5.jpg?f=u",
    "https://www.ikea.com/us/en/p/kallax-shelf-unit-white-80275887/",
  ),
  product(
    "hektar-work-lamp",
    "HEKTAR Work Lamp",
    "Work lamp",
    "Dark gray",
    69.99,
    ["home-office"],
    "task-lamp",
    "https://www.ikea.com/us/en/images/products/hektar-work-lamp-dark-gray__0470194_pe612598_s5.jpg?f=u",
    "https://www.ikea.com/us/en/p/hektar-work-lamp-dark-gray-20349382/",
  ),
  product(
    "alex-drawer-unit",
    "ALEX Drawer Unit",
    "Drawer unit",
    "White",
    95,
    ["home-office"],
    "drawer-unit",
    "https://www.ikea.com/us/en/images/products/alex-drawer-unit-white__0977775_pe813763_s5.jpg?f=u",
    "https://www.ikea.com/us/en/p/alex-drawer-unit-white-00473546/",
  ),
  product(
    "stig-bar-stool",
    "STIG",
    "Bar stool with backrest",
    "Black",
    34.99,
    ["kitchen"],
    "bar-stool",
    "https://www.ikea.com/us/en/images/products/stig-bar-stool-with-backrest-counter-height-black-black__0948110_pe798867_s5.jpg?f=u",
    "https://www.ikea.com/us/en/p/stig-bar-stool-with-backrest-counter-height-black-black-30498418/",
  ),
  product(
    "nordviken-bar-stool",
    "NORDVIKEN",
    "Bar stool with backrest",
    "Black",
    59.99,
    ["kitchen"],
    "bar-stool",
    "https://www.ikea.com/us/en/images/products/nordviken-bar-stool-with-backrest-counter-height-black__0714166_pe729956_s5.jpg?f=u",
    "https://www.ikea.com/us/en/p/nordviken-bar-stool-with-backrest-counter-height-black-00424693/",
  ),
  product(
    "tornviken-open-shelf",
    "TORNVIKEN",
    "Wall shelf",
    "White",
    69.99,
    ["kitchen"],
    "open-shelf",
    "https://www.ikea.com/us/en/images/products/tornviken-wall-shelf-off-white__0734302_pe739423_s5.jpg?f=u",
    "https://www.ikea.com/us/en/p/tornviken-wall-shelf-off-white-60391661/",
  ),
  product(
    "nereby-open-shelf",
    "NEREBY",
    "Wall shelf",
    "Beige",
    9.99,
    ["kitchen"],
    "open-shelf",
    "https://www.ikea.com/us/en/images/products/nereby-wall-shelf-birch__0942036_pe795921_s5.jpg?f=u",
    "https://www.ikea.com/us/en/p/nereby-wall-shelf-birch-90465924/",
  ),
  product(
    "gullsudare-pendant",
    "GULLSUDARE",
    "Pendant lamp shade",
    "White",
    9.99,
    ["kitchen", "dining-room"],
    "pendant",
    "https://www.ikea.com/us/en/images/products/gullsudare-pendant-lamp-shade-white-handmade__1399276_pe968294_s5.jpg?f=u",
    "https://www.ikea.com/us/en/p/gullsudare-pendant-lamp-shade-white-handmade-80583616/",
  ),
  product(
    "trettioen-pendant",
    "TRETTIOEN",
    "Pendant lamp",
    "White",
    14.99,
    ["kitchen", "dining-room"],
    "pendant",
    "https://www.ikea.com/us/en/images/products/trettioen-pendant-lamp-white__1210668_pe909800_s5.jpg?f=u",
    "https://www.ikea.com/us/en/p/trettioen-pendant-lamp-white-10564112/",
  ),
  product(
    "forhoja-cart",
    "FÖRHÖJA",
    "Kitchen cart",
    "Beige",
    179.99,
    ["kitchen"],
    "cart",
    "https://www.ikea.com/us/en/images/products/foerhoeja-kitchen-cart-birch__0736865_pe740780_s5.jpg?f=u",
    "https://www.ikea.com/us/en/p/foerhoeja-kitchen-cart-birch-80035920/",
  ),
  product(
    "forhoja-cart-2",
    "FÖRHÖJA",
    "Kitchen cart",
    "Beige",
    179.99,
    ["kitchen"],
    "cart",
    "https://www.ikea.com/us/en/images/products/foerhoeja-kitchen-cart-birch-white__1057905_pe849059_s5.jpg?f=u",
    "https://www.ikea.com/us/en/p/foerhoeja-kitchen-cart-birch-white-80486724/",
  ),
  product(
    "hagernas-dining-table",
    "HÄGERNÄS",
    "Table and 4 chairs",
    "Beige",
    259.99,
    ["dining-room"],
    "dining-table",
    "https://www.ikea.com/us/en/images/products/haegernaes-table-and-4-chairs-antique-stain-pine__1350925_pe951817_s5.jpg?f=u",
    "https://www.ikea.com/us/en/p/haegernaes-table-and-4-chairs-antique-stain-pine-70575947/",
  ),
  product(
    "skogsta-dining-table",
    "SKOGSTA",
    "Dining table",
    "Brown",
    649.99,
    ["dining-room"],
    "dining-table",
    "https://www.ikea.com/us/en/images/products/skogsta-dining-table-acacia-black__1499941_pe1006841_s5.jpg?f=u",
    "https://www.ikea.com/us/en/p/skogsta-dining-table-acacia-black-70419264/",
  ),
  product(
    "stefan-dining-chair",
    "STEFAN",
    "Chair",
    "Brown",
    35.0,
    ["dining-room"],
    "dining-chair",
    "https://www.ikea.com/us/en/images/products/stefan-chair-brown-black__0727320_pe735593_s5.jpg?f=u",
    "https://www.ikea.com/us/en/p/stefan-chair-brown-black-00211088/",
  ),
  product(
    "nasinge-dining-chair",
    "NÄSINGE",
    "Chair",
    "Beige",
    65.0,
    ["dining-room"],
    "dining-chair",
    "https://www.ikea.com/us/en/images/products/naesinge-chair-dark-brown-stained-kilanda-light-beige__1444950_pe987836_s5.jpg?f=u",
    "https://www.ikea.com/us/en/p/naesinge-chair-dark-brown-stained-kilanda-light-beige-00587581/",
  ),
  product(
    "tonstad-desk",
    "TONSTAD",
    "Desk",
    "White",
    199.99,
    ["home-office"],
    "desk",
    "https://www.ikea.com/us/en/images/products/tonstad-desk-off-white__1329852_pe945282_s5.jpg?f=u",
    "https://www.ikea.com/us/en/p/tonstad-desk-off-white-70538200/",
  ),
  product(
    "utmaning-desk",
    "UTMANING",
    "Gaming desk",
    "Assorted",
    349.99,
    ["home-office"],
    "desk",
    "https://www.ikea.com/us/en/images/products/utmaning-gaming-desk-black__1373988_pe960074_s5.jpg?f=u",
    "https://www.ikea.com/us/en/p/utmaning-gaming-desk-black-s89571732/",
  ),
  product(
    "centerhalv-office-chair",
    "CENTERHALV",
    "Office chair",
    "Black",
    199.99,
    ["home-office"],
    "office-chair",
    "https://www.ikea.com/us/en/images/products/centerhalv-office-chair-black__1408739_pe971989_s5.jpg?f=u",
    "https://www.ikea.com/us/en/p/centerhalv-office-chair-black-10601124/",
  ),
  product(
    "millberget-office-chair",
    "MILLBERGET",
    "Swivel chair",
    "Black",
    119.99,
    ["home-office"],
    "office-chair",
    "https://www.ikea.com/us/en/images/products/millberget-swivel-chair-murum-black__1020142_pe831799_s5.jpg?f=u",
    "https://www.ikea.com/us/en/p/millberget-swivel-chair-murum-black-00489397/",
  ),
  product(
    "ekenabben-shelving",
    "EKENABBEN",
    "Open shelf unit",
    "Beige",
    69.0,
    ["home-office"],
    "shelving",
    "https://www.ikea.com/us/en/images/products/ekenabben-open-shelf-unit-aspen-white__1029351_pe835758_s5.jpg?f=u",
    "https://www.ikea.com/us/en/p/ekenabben-open-shelf-unit-aspen-white-80487813/",
  ),
  product(
    "lack-shelving",
    "LACK",
    "Wall shelf unit",
    "White",
    99.99,
    ["home-office"],
    "shelving",
    "https://www.ikea.com/us/en/images/products/lack-wall-shelf-unit-white__0246565_pe385541_s5.jpg?f=u",
    "https://www.ikea.com/us/en/p/lack-wall-shelf-unit-white-60282186/",
  ),
  product(
    "tertial-task-lamp",
    "TERTIAL",
    "Work lamp",
    "Gray",
    19.99,
    ["home-office"],
    "task-lamp",
    "https://www.ikea.com/us/en/images/products/tertial-work-lamp-dark-gray__0609306_pe684440_s5.jpg?f=u",
    "https://www.ikea.com/us/en/p/tertial-work-lamp-dark-gray-20355434/",
  ),
  product(
    "navlinge-task-lamp",
    "NÄVLINGE",
    "LED work lamp",
    "White",
    24.99,
    ["home-office"],
    "task-lamp",
    "https://www.ikea.com/us/en/images/products/naevlinge-led-work-lamp-white__0709828_pe727111_s5.jpg?f=u",
    "https://www.ikea.com/us/en/p/naevlinge-led-work-lamp-white-00404925/",
  ),
  product(
    "friidrott-drawer-unit",
    "FRIIDROTT",
    "Drawer unit on casters",
    "Assorted",
    49.99,
    ["home-office"],
    "drawer-unit",
    "https://www.ikea.com/us/en/images/products/friidrott-drawer-unit-on-casters-white__1480198_pe1000154_s5.jpg?f=u",
    "https://www.ikea.com/us/en/p/friidrott-drawer-unit-on-casters-white-60609071/",
  ),
  product(
    "lennart-drawer-unit",
    "LENNART",
    "Drawer unit",
    "White",
    19.99,
    ["home-office"],
    "drawer-unit",
    "https://www.ikea.com/us/en/images/products/lennart-drawer-unit-white__0395412_pe564513_s5.jpg?f=u",
    "https://www.ikea.com/us/en/p/lennart-drawer-unit-white-30326177/",
  ),
  product(
    "glostad-sofa",
    "GLOSTAD",
    "Sofa",
    "Gray",
    199.0,
    ["living-room"],
    "sofa",
    "https://www.ikea.com/us/en/images/products/glostad-sofa-knisa-dark-gray__1234948_pe917261_s5.jpg?f=u",
    "https://www.ikea.com/us/en/p/glostad-sofa-knisa-dark-gray-40595942/",
  ),
  product(
    "stockholm-2025-sofa",
    "STOCKHOLM 2025",
    "Sofa",
    "Beige",
    1799.0,
    ["living-room"],
    "sofa",
    "https://www.ikea.com/us/en/images/products/stockholm-2025-sofa-sundhamn-beige__1362734_pe955310_s5.jpg?f=u",
    "https://www.ikea.com/us/en/p/stockholm-2025-sofa-sundhamn-beige-00586096/",
  ),
  product(
    "lack-coffee-table",
    "LACK",
    "Coffee table",
    "Brown",
    29.99,
    ["living-room"],
    "coffee-table",
    "https://www.ikea.com/us/en/images/products/lack-coffee-table-black-brown__57540_pe163122_s5.jpg?f=u",
    "https://www.ikea.com/us/en/p/lack-coffee-table-black-brown-40104294/",
  ),
  product(
    "lack-coffee-table-2",
    "LACK",
    "Coffee table",
    "Brown",
    49.99,
    ["living-room"],
    "coffee-table",
    "https://www.ikea.com/us/en/images/products/lack-coffee-table-black-brown__57537_pe163119_s5.jpg?f=u",
    "https://www.ikea.com/us/en/p/lack-coffee-table-black-brown-00104291/",
  ),
  product(
    "strandmon-accent-seating",
    "STRANDMON",
    "Armchair and ottoman",
    "Yellow",
    369.99,
    ["living-room"],
    "accent-seating",
    "https://www.ikea.com/us/en/images/products/strandmon-armchair-and-ottoman-skiftebo-yellow__1094844_pe863644_s5.jpg?f=u",
    "https://www.ikea.com/us/en/p/strandmon-armchair-and-ottoman-skiftebo-yellow-s89487875/",
  ),
  product(
    "ekenaset-accent-seating",
    "EKENÄSET",
    "Armchair",
    "Beige",
    229.99,
    ["living-room"],
    "accent-seating",
    "https://www.ikea.com/us/en/images/products/ekenaeset-armchair-kilanda-light-beige__1109687_pe870153_s5.jpg?f=u",
    "https://www.ikea.com/us/en/p/ekenaeset-armchair-kilanda-light-beige-30533493/",
  ),
  product(
    "brimnes-bookcase",
    "BRIMNES",
    "Bookcase",
    "White",
    149.0,
    ["living-room"],
    "bookcase",
    "https://www.ikea.com/us/en/images/products/brimnes-bookcase-white__0644268_pe702543_s5.jpg?f=u",
    "https://www.ikea.com/us/en/p/brimnes-bookcase-white-90301225/",
  ),
  product(
    "baggebo-bookcase",
    "BAGGEBO",
    "Bookcase",
    "White",
    32.99,
    ["living-room"],
    "bookcase",
    "https://www.ikea.com/us/en/images/products/baggebo-bookcase-white__0981552_pe815388_s5.jpg?f=u",
    "https://www.ikea.com/us/en/p/baggebo-bookcase-white-20436713/",
  ),
  product(
    "rodflik-floor-lamp",
    "RÖDFLIK",
    "Floor/reading lamp",
    "Gray",
    54.99,
    ["living-room", "bedroom"],
    "floor-lamp",
    "https://www.ikea.com/us/en/images/products/roedflik-floor-reading-lamp-gray-green__1232722_pe916583_s5.jpg?f=u",
    "https://www.ikea.com/us/en/p/roedflik-floor-reading-lamp-gray-green-80563581/",
  ),
  product(
    "okensand-floor-lamp",
    "ÖKENSAND",
    "Floor lamp",
    "Beige",
    79.99,
    ["living-room", "bedroom"],
    "floor-lamp",
    "https://www.ikea.com/us/en/images/products/oekensand-floor-lamp-beech-white__1187892_pe899535_s5.jpg?f=u",
    "https://www.ikea.com/us/en/p/oekensand-floor-lamp-beech-white-90541536/",
  ),
  product(
    "tiphede-rug",
    "TIPHEDE",
    "Rug, flatwoven",
    "Beige",
    39.99,
    ["living-room", "bedroom", "dining-room"],
    "rug",
    "https://www.ikea.com/us/en/images/products/tiphede-rug-flatwoven-natural-black__0772066_pe755879_s5.jpg?f=u",
    "https://www.ikea.com/us/en/p/tiphede-rug-flatwoven-natural-black-40559166/",
  ),
  product(
    "stoense-rug",
    "STOENSE",
    "Rug, low pile",
    "Gray",
    119.99,
    ["living-room", "bedroom", "dining-room"],
    "rug",
    "https://www.ikea.com/us/en/images/products/stoense-rug-low-pile-medium-gray__0624399_pe691812_s5.jpg?f=u",
    "https://www.ikea.com/us/en/p/stoense-rug-low-pile-medium-gray-30426836/",
  ),
  product(
    "slattum-bed",
    "SLATTUM",
    "Upholstered bed frame",
    "Gray",
    149.0,
    ["bedroom"],
    "bed",
    "https://www.ikea.com/us/en/images/products/slattum-upholstered-bed-frame-vissle-dark-gray__1259335_pe926650_s5.jpg?f=u",
    "https://www.ikea.com/us/en/p/slattum-upholstered-bed-frame-vissle-dark-gray-70571256/",
  ),
  product(
    "tarva-bed",
    "TARVA",
    "Bed frame",
    "Beige",
    179.0,
    ["bedroom"],
    "bed",
    "https://www.ikea.com/us/en/images/products/tarva-bed-frame-pine-luroey__0637611_pe698421_s5.jpg?f=u",
    "https://www.ikea.com/us/en/p/tarva-bed-frame-pine-luroey-s29007794/",
  ),
  product(
    "storklinta-nightstand",
    "STORKLINTA",
    "Nightstand",
    "White",
    59.99,
    ["bedroom"],
    "nightstand",
    "https://www.ikea.com/us/en/images/products/storklinta-nightstand-white-with-1-drawer__1283575_pe932557_s5.jpg?f=u",
    "https://www.ikea.com/us/en/p/storklinta-nightstand-white-with-1-drawer-30561155/",
  ),
  product(
    "lillberget-nightstand",
    "LILLBERGET",
    "Nightstand",
    "White",
    39.99,
    ["bedroom"],
    "nightstand",
    "https://www.ikea.com/us/en/images/products/lillberget-nightstand-white__1281809_pe931989_s5.jpg?f=u",
    "https://www.ikea.com/us/en/p/lillberget-nightstand-white-10567568/",
  ),
  product(
    "storklinta-dresser",
    "STORKLINTA",
    "6-drawer dresser",
    "White",
    249.99,
    ["bedroom"],
    "dresser",
    "https://www.ikea.com/us/en/images/products/storklinta-6-drawer-dresser-white-anchor-unlock-function__1283583_pe932540_s5.jpg?f=u",
    "https://www.ikea.com/us/en/p/storklinta-6-drawer-dresser-white-anchor-unlock-function-60561248/",
  ),
  product(
    "storklinta-dresser-2",
    "STORKLINTA",
    "6-drawer dresser",
    "White",
    229.99,
    ["bedroom"],
    "dresser",
    "https://www.ikea.com/us/en/images/products/storklinta-6-drawer-dresser-white-anchor-unlock-function__1283570_pe932552_s5.jpg?f=u",
    "https://www.ikea.com/us/en/p/storklinta-6-drawer-dresser-white-anchor-unlock-function-10559281/",
  ),
  product(
    "fado-table-lamp",
    "FADO",
    "Table lamp",
    "White",
    29.99,
    ["bedroom"],
    "table-lamp",
    "https://www.ikea.com/us/en/images/products/fado-table-lamp-white__0606976_pe682645_s5.jpg?f=u",
    "https://www.ikea.com/us/en/p/fado-table-lamp-white-70096377/",
  ),
  product(
    "arstid-table-lamp",
    "ÅRSTID",
    "Table lamp",
    "Yellow",
    39.99,
    ["bedroom"],
    "table-lamp",
    "https://www.ikea.com/us/en/images/products/arstid-table-lamp-brass-white__0609329_pe684454_s5.jpg?f=u",
    "https://www.ikea.com/us/en/p/arstid-table-lamp-brass-white-80321380/",
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
  kitchen: ["bar-stool", "open-shelf", "pendant", "cart"],
  "dining-room": ["dining-table", "dining-chair", "pendant", "rug"],
  "home-office": ["desk", "office-chair", "shelving", "task-lamp", "drawer-unit"],
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
 * Idempotently seeds the ikea_products table from SEED_PRODUCTS. Runs on server
 * boot; on conflict it refreshes every field so catalog edits propagate without
 * a manual migration. This is the one place the static seed touches the DB —
 * all reads below go through Postgres.
 */
export async function seedIkeaProducts(): Promise<void> {
  if (SEED_PRODUCTS.length === 0) return;
  await db
    .insert(ikeaProductsTable)
    .values(SEED_PRODUCTS)
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
        imageUrl: sql`excluded.image_url`,
        buyUrl: sql`excluded.buy_url`,
      },
    });
}

/**
 * Returns the full active product catalog from the database. Kept for the
 * /products endpoint and forward compatibility; selection for a redesign goes
 * through getProductsForRoom.
 */
export async function getProductsForStyle(_styleId?: string): Promise<Product[]> {
  return db.select().from(ikeaProductsTable);
}

/**
 * All products eligible for a room (the full swappable pool), regardless of the
 * de-cluttered default selection. Powers the result screen's "swap" picker,
 * where the user can replace a curated piece with any other eligible product.
 */
export async function getEligibleProductsForRoom(
  roomTypeId: string,
): Promise<Product[]> {
  return db
    .select()
    .from(ikeaProductsTable)
    .where(arrayContains(ikeaProductsTable.roomTypes, [roomTypeId]));
}

/**
 * Resolves an explicit, user-curated list of product ids to real products,
 * preserving the given order and dropping any unknown ids. Used when the user
 * has curated their pieces on the result screen and asks to regenerate.
 */
export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  if (ids.length === 0) return [];
  const rows = await db
    .select()
    .from(ikeaProductsTable)
    .where(inArray(ikeaProductsTable.id, ids));
  const byId = new Map(rows.map((p) => [p.id, p]));
  const result: Product[] = [];
  for (const id of ids) {
    const match = byId.get(id);
    if (match) result.push(match);
  }
  return result;
}

/**
 * Pure de-clutter logic over an already-fetched eligible pool: picks one piece
 * per functional role, ordered by the room's role priority and capped at
 * MAX_PRODUCTS_PER_ROOM. Extracted as a pure function so it stays unit-testable
 * without a database. Optionally narrows to a user-chosen subset; if the filter
 * would leave nothing, the full default selection is returned so a redesign is
 * never grounded in zero products.
 */
export function selectDecluttered(
  eligible: Product[],
  roomTypeId: string,
  selectedProductIds?: string[],
): Product[] {
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

  const defaultSelection = ordered.slice(0, MAX_PRODUCTS_PER_ROOM);

  if (!selectedProductIds || selectedProductIds.length === 0) {
    return defaultSelection;
  }

  const allowed = new Set(selectedProductIds);
  const filtered = defaultSelection.filter((p) => allowed.has(p.id));
  return filtered.length > 0 ? filtered : defaultSelection;
}

/**
 * Deterministically selects a de-cluttered set of products for a room from the
 * database: one piece per functional role, ordered by the room's role priority
 * and capped. Keeps the generated room — and the "Shop the look" tags overlaid
 * on it — accurate and uncluttered.
 */
export async function getProductsForRoom(
  roomTypeId: string,
  selectedProductIds?: string[],
): Promise<Product[]> {
  const eligible = await getEligibleProductsForRoom(roomTypeId);
  return selectDecluttered(eligible, roomTypeId, selectedProductIds);
}
