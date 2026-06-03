import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = join(
  __dirname,
  "../../artifacts/api-server/src/data/ikeaSeedIndia.json",
);

interface Product {
  id: string;
  name: string;
  category: string;
  color: string;
  price: number;
  currency: string;
  market: string;
  roomTypes: string[];
  role: string;
  group: string;
  imageUrl: string;
  buyUrl: string;
  widthCm: null;
  depthCm: null;
  heightCm: null;
}

const HEADERS = {
  Accept: "application/json",
  Origin: "https://www.ikea.com",
  Referer: "https://www.ikea.com/",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
};

const SEARCH_TERMS: string[] = [
  // ── Living-room seating ───────────────────────────────────────────
  "sofa", "sectional sofa", "sleeper sofa", "sofa bed", "loveseat",
  "corner sofa", "chaise lounge", "armchair", "rocking chair", "pouf",
  "footstool", "ottoman", "daybed", "bench seating",

  // ── Living-room tables ───────────────────────────────────────────
  "coffee table", "side table", "console table", "nest of tables",
  "tray table", "nesting tables",

  // ── Living-room storage / display ────────────────────────────────
  "bookcase", "display cabinet", "media storage", "TV unit", "TV bench",
  "shelving unit", "open shelving", "wall shelf", "floating shelf",
  "storage cabinet", "sideboard", "vitrine",

  // ── Living-room decor ────────────────────────────────────────────
  "floor lamp", "arc lamp", "reading lamp", "rug", "area rug",
  "flatwoven rug", "shaggy rug", "high pile rug", "low pile rug",
  "picture frame", "wall decor", "wall art canvas", "mirror",
  "plant stand", "indoor planter", "throw pillow", "cushion",
  "blanket throw", "curtains", "blackout curtains", "blinds",

  // ── Bedroom ───────────────────────────────────────────────────────
  "bed frame", "storage bed", "upholstered bed", "bunk bed", "loft bed",
  "mattress", "memory foam mattress",
  "nightstand", "bedside table",
  "wardrobe", "sliding wardrobe", "PAX wardrobe",
  "dresser", "chest of drawers",
  "table lamp", "bedside lamp",
  "bedroom mirror", "full length mirror",
  "bedroom rug", "bed linen", "duvet cover", "pillow",
  "bedspread", "quilt",

  // ── Dining room ───────────────────────────────────────────────────
  "dining table", "extendable dining table", "round dining table",
  "folding table", "drop leaf table",
  "dining chair", "upholstered dining chair",
  "bar stool", "counter stool",
  "pendant lamp", "ceiling lamp", "chandelier",
  "dining storage", "buffet", "china cabinet",

  // ── Kitchen ───────────────────────────────────────────────────────
  "kitchen cart", "kitchen island", "kitchen trolley",
  "kitchen shelving", "kitchen storage", "pantry organizer",
  "bar cart", "wine rack",

  // ── Home office ───────────────────────────────────────────────────
  "desk", "writing desk", "standing desk", "corner desk",
  "office chair", "ergonomic chair", "task chair",
  "drawer unit", "filing cabinet", "office storage",
  "desk lamp", "task lamp",
  "monitor stand", "desk organizer", "office shelving",

  // ── Hallway / entryway ───────────────────────────────────────────
  "hallway storage", "entryway bench", "shoe cabinet", "shoe rack",
  "coat rack", "hooks", "hat stand",
  "hallway mirror",

  // ── Bathroom ────────────────────────────────────────────────────
  "bathroom cabinet", "bathroom mirror", "bathroom shelving",
  "towel rack", "bath mat", "laundry basket",

  // ── Kids room ───────────────────────────────────────────────────
  "kids bed", "childrens bed", "kids bunk bed",
  "kids desk", "kids chair", "kids stool",
  "toy storage", "kids storage", "kids shelf",
  "kids rug", "kids lamp",

  // ── Color & material sweeps ──────────────────────────────────────
  "sofa white", "sofa black", "sofa gray", "sofa beige", "sofa blue",
  "sofa green", "sofa brown", "sofa fabric", "sofa velvet",
  "corner sofa gray", "corner sofa beige", "corner sofa blue",
  "armchair gray", "armchair beige", "armchair blue", "armchair green",
  "armchair white", "armchair black", "armchair velvet", "armchair fabric",
  "bed frame white", "bed frame black", "bed frame gray", "bed frame beige",
  "bed frame brown", "bed frame oak", "bed frame upholstered",
  "dining chair white", "dining chair black", "dining chair gray",
  "dining chair brown", "dining chair blue", "dining chair wood",
  "dining chair fabric", "dining chair velvet",
  "dining table white", "dining table black", "dining table oak",
  "dining table gray", "dining table brown", "dining table wood",
  "coffee table white", "coffee table black", "coffee table oak",
  "coffee table gray", "coffee table brown", "coffee table glass",
  "bookcase white", "bookcase black", "bookcase oak", "bookcase gray",
  "TV unit white", "TV unit black", "TV unit oak", "TV unit gray",
  "wardrobe white", "wardrobe gray", "wardrobe black", "wardrobe oak",
  "chest of drawers white", "chest of drawers black", "chest of drawers oak",
  "nightstand white", "nightstand black", "nightstand oak", "nightstand gray",
  "desk white", "desk black", "desk oak", "desk gray",
  "floor lamp black", "floor lamp white", "floor lamp brass", "floor lamp gold",
  "table lamp black", "table lamp white", "table lamp brass", "table lamp gold",
  "pendant lamp black", "pendant lamp white", "pendant lamp brass",
  "rug white", "rug black", "rug gray", "rug beige", "rug blue",
  "rug green", "rug brown", "rug yellow", "rug pink", "rug multicolor",
  "rug jute", "rug wool", "rug flatwoven", "rug high pile",
  "mirror round", "mirror rectangular", "mirror black", "mirror white",
  "mirror gold", "mirror brass", "mirror wood",
  "curtains white", "curtains gray", "curtains beige", "curtains linen",

  // ── IKEA named product lines ─────────────────────────────────────
  "KALLAX", "BILLY", "HEMNES", "MALM", "PAX", "BESTA",
  "SÖDERHAMN", "KIVIK", "EKTORP", "POÄNG", "LACK", "ALEX",
  "MICKE", "FRIHETEN", "KLIPPAN", "HAVSTA", "EKET", "TROFAST",
  "IVAR", "HEJNE", "STRANDMON", "FINNALA", "VIMLE", "HOLMSUND",
  "GRÖNLID", "JÄTTEBO", "LANDSKRONA", "NORSBORG",
  "MORABO", "LIDHULT", "VALLENTUNA", "HYLTARP",
  "LEIRVIK", "BRIMNES", "TARVA", "ESPEVÄR",
  "TONSTAD", "HAUGA", "KULLEN", "RAST", "NORDLI",
  "ALÄNG", "HEKTAR", "RANARP", "FADO", "TERTIAL",
  "SINNERLIG", "MÖCKELBY", "EKEDALEN", "INGATORP", "LISABO",
  "NORRÅKER", "TOBIAS", "LEIFARNE", "HENRIKSDAL", "BERGMUND",
  "KUNGSBACKA", "GODMORGON", "LILLÅNGEN",
  "RÅSKOG", "NISSAFORS", "GRUNDTAL",
  "FEJKA", "RIBBA", "SANNAHED", "HOVSTA", "MOSSLANDA",
  "NISSEDAL", "MONGSTAD", "KNAPPER",
  "ALGOT", "BOAXEL", "PLATSA",
  "SUNDVIK", "SNIGLAR", "STUVA", "FLISAT",
  "BEKANT", "IDÅSEN", "LAGKAPTEN", "UPPSPEL",
  "MARKUS", "JÄRVFJÄLLET", "HATTEFJÄLL", "FLINTAN",
  "DALSELV", "HEDEVIKEN", "TYSSEDAL", "SONGESAND",
  "KRITTER", "VIKARE",
  "INGOLF", "TERJE", "ODDVAR", "STEFAN",
  "SKOGSTA", "NORRARYD",
  "JOKKMOKK", "STORNAS", "DOCKSTA",
  "MORBYLANGA", "SANDSBERG",
  "DALFRED", "STIG", "FRANKLIN",
  "ORFJALL", "PELLO",
  "KOLBJÖRN", "ENHET",
  "SILVERAN", "ÄNGSJÖN", "TOFTBYN",
  "AGUNNARYD", "FLOALT", "VARMBLIXT",
  "NYMANE", "YPPERLIG", "KROSNÄS",
  "LUSTIGKURRE", "BARNSLIG",
  "SOCKHOLM", "VITTSJO", "LIXHULT",
  "KOMPLEMENT", "HASVIK", "GRIMO",
  "FORSAND", "BJÖRNÖYA",
  "DOMBÄS", "STRAUMEN",
  "HOVET mirror", "NISSEDAL mirror",
  "LINDBYN", "KNOPPÄNG",
  "HOLME", "ENBO", "NYTTJA",
  "TOLSBY", "RÖDALM",
  "SAMLA", "TROFAST box", "SOCKERBIT",
  "TJENA", "DRÖNA box",
];

function classifyProduct(category: string): {
  role: string;
  group: string;
  roomTypes: string[];
} {
  const c = category.toLowerCase();

  if (/sleeper|sofa bed/.test(c))
    return { role: "sofa", group: "Seating", roomTypes: ["living-room"] };
  if (/corner sofa|sectional|sofa section/.test(c))
    return { role: "sofa", group: "Seating", roomTypes: ["living-room"] };
  if (/\bsofa\b/.test(c))
    return { role: "sofa", group: "Seating", roomTypes: ["living-room"] };
  if (/loveseat|2-seat sofa|2 seat sofa/.test(c))
    return { role: "sofa", group: "Seating", roomTypes: ["living-room"] };
  if (/chaise|daybed|day bed/.test(c))
    return { role: "accent-seating", group: "Seating", roomTypes: ["living-room"] };
  if (/armchair/.test(c))
    return { role: "accent-seating", group: "Seating", roomTypes: ["living-room", "bedroom"] };
  if (/rocking chair/.test(c))
    return { role: "accent-seating", group: "Seating", roomTypes: ["living-room"] };
  if (/pouf|pouffe|footstool|ottoman/.test(c))
    return { role: "accent-seating", group: "Seating", roomTypes: ["living-room"] };
  if (/bar stool|counter stool|high stool/.test(c))
    return { role: "bar-stool", group: "Seating", roomTypes: ["kitchen", "dining-room"] };
  if (/dining chair|kitchen chair/.test(c))
    return { role: "dining-chair", group: "Seating", roomTypes: ["dining-room", "kitchen"] };
  if (/\bchair\b/.test(c) && !/office|task|desk|kids|child/.test(c))
    return { role: "dining-chair", group: "Seating", roomTypes: ["dining-room"] };
  if (/office chair|task chair|ergonomic/.test(c))
    return { role: "office-chair", group: "Office", roomTypes: ["home-office"] };
  if (/kids.*chair|children.*chair|child.*stool|kids.*stool/.test(c))
    return { role: "dining-chair", group: "Seating", roomTypes: ["bedroom"] };
  if (/dining table|extendable table|drop-leaf|drop leaf|folding table/.test(c))
    return { role: "dining-table", group: "Tables", roomTypes: ["dining-room", "kitchen"] };
  if (/coffee table/.test(c))
    return { role: "coffee-table", group: "Tables", roomTypes: ["living-room"] };
  if (/side table|end table|accent table|occasional table/.test(c))
    return { role: "coffee-table", group: "Tables", roomTypes: ["living-room", "bedroom"] };
  if (/console table/.test(c))
    return { role: "coffee-table", group: "Tables", roomTypes: ["living-room"] };
  if (/nest.*table|nesting table|tray table/.test(c))
    return { role: "coffee-table", group: "Tables", roomTypes: ["living-room"] };
  if (/desk|writing table|work table/.test(c) && !/kids|child/.test(c))
    return { role: "desk", group: "Office", roomTypes: ["home-office"] };
  if (/kids.*desk|children.*desk|study.*desk/.test(c))
    return { role: "desk", group: "Office", roomTypes: ["bedroom", "home-office"] };
  if (/\btable\b/.test(c))
    return { role: "dining-table", group: "Tables", roomTypes: ["dining-room"] };
  if (/bunk bed|loft bed/.test(c))
    return { role: "bed", group: "Bedroom", roomTypes: ["bedroom"] };
  if (/kids.*bed|children.*bed|child.*bed/.test(c))
    return { role: "bed", group: "Bedroom", roomTypes: ["bedroom"] };
  if (/bed frame|storage bed|upholstered bed|platform bed/.test(c))
    return { role: "bed", group: "Bedroom", roomTypes: ["bedroom"] };
  if (/\bbed\b/.test(c) && !/bedside|bed linen|bedding|bedspread|sofa bed|daybe/.test(c))
    return { role: "bed", group: "Bedroom", roomTypes: ["bedroom"] };
  if (/mattress/.test(c))
    return { role: "bed", group: "Bedroom", roomTypes: ["bedroom"] };
  if (/wardrobe|clothes closet/.test(c))
    return { role: "dresser", group: "Storage", roomTypes: ["bedroom"] };
  if (/chest of drawer|dresser/.test(c))
    return { role: "dresser", group: "Bedroom", roomTypes: ["bedroom"] };
  if (/nightstand|bedside table|bedside cabinet/.test(c))
    return { role: "nightstand", group: "Bedroom", roomTypes: ["bedroom"] };
  if (/pendant|hanging lamp|ceiling lamp|chandelier/.test(c))
    return { role: "pendant", group: "Lighting", roomTypes: ["dining-room", "living-room", "kitchen"] };
  if (/floor lamp|arc lamp/.test(c))
    return { role: "floor-lamp", group: "Lighting", roomTypes: ["living-room", "bedroom"] };
  if (/desk lamp|task lamp|work lamp/.test(c))
    return { role: "task-lamp", group: "Lighting", roomTypes: ["home-office"] };
  if (/table lamp|bedside lamp/.test(c))
    return { role: "table-lamp", group: "Lighting", roomTypes: ["bedroom", "living-room"] };
  if (/wall lamp|sconce/.test(c))
    return { role: "floor-lamp", group: "Lighting", roomTypes: ["living-room", "bedroom"] };
  if (/\blamp\b|\blight\b/.test(c))
    return { role: "floor-lamp", group: "Lighting", roomTypes: ["living-room"] };
  if (/rug|carpet|runner/.test(c))
    return { role: "rug", group: "Textiles", roomTypes: ["living-room", "bedroom", "dining-room"] };
  if (/bookcase|bookshelf/.test(c))
    return { role: "open-shelf", group: "Storage", roomTypes: ["living-room", "home-office"] };
  if (/tv bench|tv unit|tv stand|media.*unit|media.*cabinet|media.*console/.test(c))
    return { role: "tv-unit", group: "Storage", roomTypes: ["living-room"] };
  if (/sideboard|buffet|china cabinet/.test(c))
    return { role: "open-shelf", group: "Storage", roomTypes: ["dining-room", "living-room"] };
  if (/shelv|shelf|open shelv/.test(c))
    return { role: "open-shelf", group: "Storage", roomTypes: ["living-room", "home-office"] };
  if (/display cabinet|vitrine/.test(c))
    return { role: "open-shelf", group: "Storage", roomTypes: ["living-room"] };
  if (/storage.*cabinet|cabinet/.test(c))
    return { role: "open-shelf", group: "Storage", roomTypes: ["living-room"] };
  if (/picture frame|photo frame/.test(c))
    return { role: "wall-art", group: "Decor", roomTypes: ["living-room", "bedroom"] };
  if (/wall decor|wall art|canvas|poster/.test(c))
    return { role: "wall-art", group: "Decor", roomTypes: ["living-room", "bedroom"] };
  if (/mirror/.test(c))
    return { role: "wall-art", group: "Decor", roomTypes: ["living-room", "bedroom", "dining-room"] };
  if (/plant.*pot|planter|pot.*plant|flower.*pot/.test(c))
    return { role: "wall-art", group: "Decor", roomTypes: ["living-room", "bedroom"] };
  if (/vase|candle|candleholder/.test(c))
    return { role: "wall-art", group: "Decor", roomTypes: ["living-room", "dining-room"] };
  if (/curtain|drape|blind|roller blind/.test(c))
    return { role: "wall-art", group: "Textiles", roomTypes: ["living-room", "bedroom"] };
  if (/bed linen|duvet|quilt|bedspread|comforter|pillow|cushion|throw|blanket/.test(c))
    return { role: "wall-art", group: "Textiles", roomTypes: ["bedroom"] };
  if (/hook|coat rack|hat stand|hallway/.test(c))
    return { role: "other", group: "Storage", roomTypes: ["home-office"] };

  return { role: "other", group: "Other", roomTypes: ["living-room"] };
}

async function fetchTerm(term: string): Promise<Product[]> {
  const url = `https://sik.search.blue.cdtapps.com/in/en/search-result-page?q=${encodeURIComponent(term)}&size=100`;
  try {
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) return [];
    const data: unknown = await res.json();
    const items: unknown[] =
      (data as Record<string, unknown>)?.searchResultPage?.products?.main?.items ?? [];

    const products: Product[] = [];
    for (const item of items as Record<string, unknown>[]) {
      const p = item?.product as Record<string, unknown> | undefined;
      if (!p) continue;
      const id = String(p.id ?? p.itemNo ?? "");
      if (!id) continue;

      const name = String(p.name ?? "");
      const typeName = String(p.typeName ?? "");
      const colors = (p.colors as { hex?: string; name?: string }[] | undefined) ?? [];
      const colorName = colors[0]?.name ?? "";

      // India API uses salesPrice.numeral (not price.numeral)
      const salesPrice = p.salesPrice as Record<string, unknown> | undefined;
      const price = Number(salesPrice?.numeral ?? 0) || 0;

      // India API: mainImageUrl is already a full absolute URL
      const imageUrl = String(p.mainImageUrl ?? "");

      const { role, group, roomTypes } = classifyProduct(typeName);

      products.push({
        id,
        name,
        category: typeName,
        color: colorName,
        price,
        currency: "INR",
        market: "IN",
        roomTypes,
        role,
        group,
        imageUrl,
        buyUrl: String(p.pipUrl ?? `https://www.ikea.com/in/en/search/?q=${encodeURIComponent(name)}`),
        widthCm: null,
        depthCm: null,
        heightCm: null,
      });
    }
    return products;
  } catch {
    return [];
  }
}

async function run() {
  console.log(`Fetching ${SEARCH_TERMS.length} search terms from IKEA India…`);

  const seen = new Map<string, Product>();
  let completed = 0;

  const CONCURRENCY = 6;
  const CHECKPOINT_EVERY = 30; // save every 30 terms
  for (let i = 0; i < SEARCH_TERMS.length; i += CONCURRENCY) {
    const batch = SEARCH_TERMS.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(fetchTerm));
    for (let j = 0; j < results.length; j++) {
      for (const p of results[j]!) {
        if (!seen.has(p.id)) seen.set(p.id, p);
      }
      completed++;
      process.stdout.write(
        `\r  ${completed}/${SEARCH_TERMS.length} terms done — ${seen.size} unique products`,
      );
    }
    // Checkpoint: save partial results periodically so progress survives interruption
    if (completed % CHECKPOINT_EVERY === 0) {
      const partial = Array.from(seen.values()).filter(
        (p) => p.imageUrl && /_pe[0-9]+_s5/.test(p.imageUrl),
      );
      writeFileSync(OUT_PATH, JSON.stringify(partial, null, 2));
    }
    if (i + CONCURRENCY < SEARCH_TERMS.length) {
      await new Promise((r) => setTimeout(r, 400));
    }
  }

  console.log(`\nFetch complete. ${seen.size} unique products.`);

  // Final write: filter out bad image URLs (same purge logic as the catalog)
  const valid = Array.from(seen.values()).filter(
    (p) => p.imageUrl && /_pe[0-9]+_s5/.test(p.imageUrl),
  );

  console.log(`After image filter: ${valid.length} products.`);
  writeFileSync(OUT_PATH, JSON.stringify(valid, null, 2));
  console.log(`Written to ${OUT_PATH}`);

  const byRole = new Map<string, number>();
  for (const p of valid) {
    byRole.set(p.role, (byRole.get(p.role) ?? 0) + 1);
  }
  const sorted = [...byRole.entries()].sort((a, b) => b[1] - a[1]);
  console.log("\nBreakdown by role:");
  for (const [role, count] of sorted) {
    console.log(`  ${role.padEnd(20)} ${count}`);
  }
}

run().catch(console.error);
