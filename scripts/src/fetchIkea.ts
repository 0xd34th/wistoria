import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = join(
  __dirname,
  "../../artifacts/api-server/src/data/ikeaSeed.json",
);

interface Product {
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
  // ── Living-room seating ────────────────────────────────────────────
  "sofa", "sectional sofa", "sleeper sofa", "sofa bed", "loveseat",
  "corner sofa", "chaise lounge", "armchair", "rocking chair", "pouf",
  "footstool", "ottoman", "daybed", "bench seating",

  // ── Living-room tables ────────────────────────────────────────────
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
  "monitor stand", "desk organizer", "whiteboard", "office shelving",

  // ── Hallway / entryway ────────────────────────────────────────────
  "hallway storage", "entryway bench", "shoe cabinet", "shoe rack",
  "coat rack", "hooks", "hat stand", "umbrella stand",
  "hallway mirror",

  // ── Bathroom ─────────────────────────────────────────────────────
  "bathroom cabinet", "bathroom mirror", "bathroom shelving",
  "towel rack", "bath mat", "laundry basket",

  // ── Kids room ────────────────────────────────────────────────────
  "kids bed", "childrens bed", "kids bunk bed",
  "kids desk", "kids chair", "kids stool",
  "toy storage", "kids storage", "kids shelf",
  "kids rug", "kids lamp",

  // ── Outdoor ───────────────────────────────────────────────────────
  "outdoor sofa", "garden sofa", "outdoor sectional",
  "outdoor chair", "garden chair", "deck chair", "lounge chair",
  "outdoor table", "garden table", "outdoor dining table",
  "outdoor rug", "outdoor cushion", "outdoor storage",
  "outdoor lamp", "parasol", "hammock",

  // ── Color & material qualified queries (each slice is ~80-90 NEW unique products) ──
  // Sofas by color/material
  "sofa white", "sofa black", "sofa gray", "sofa beige", "sofa blue",
  "sofa green", "sofa brown", "sofa yellow", "sofa pink", "sofa natural",
  "sofa fabric", "sofa velvet", "sofa leather", "sofa linen",
  "corner sofa gray", "corner sofa beige", "corner sofa blue", "corner sofa green",
  "sleeper sofa white", "sleeper sofa gray", "sleeper sofa black",
  "armchair gray", "armchair beige", "armchair blue", "armchair green",
  "armchair white", "armchair black", "armchair brown", "armchair yellow",
  "armchair velvet", "armchair fabric", "armchair leather", "armchair rattan",
  // Beds by color/material
  "bed frame white", "bed frame black", "bed frame gray", "bed frame beige",
  "bed frame brown", "bed frame oak", "bed frame pine", "bed frame birch",
  "bed frame upholstered", "bed frame metal", "bed frame wood",
  "storage bed white", "storage bed gray", "bunk bed white", "bunk bed gray",
  "mattress foam", "mattress pocket spring", "mattress firm", "mattress soft",
  // Dining chairs by color/material
  "dining chair white", "dining chair black", "dining chair gray", "dining chair beige",
  "dining chair brown", "dining chair blue", "dining chair green", "dining chair yellow",
  "dining chair wood", "dining chair metal", "dining chair fabric", "dining chair plastic",
  "dining chair velvet", "dining chair upholstered", "dining chair rattan",
  "bar stool white", "bar stool black", "bar stool gray", "bar stool brown",
  "bar stool wood", "bar stool metal", "bar stool fabric",
  // Dining tables by color/material
  "dining table white", "dining table black", "dining table oak", "dining table pine",
  "dining table gray", "dining table brown", "dining table round", "dining table extendable",
  "dining table wood", "dining table glass", "dining table metal",
  "coffee table white", "coffee table black", "coffee table oak", "coffee table gray",
  "coffee table brown", "coffee table round", "coffee table glass", "coffee table metal",
  "coffee table wood", "coffee table marble", "coffee table bamboo",
  "side table white", "side table black", "side table oak", "side table gray",
  "side table round", "side table metal", "side table glass",
  // Storage/shelving by color/material
  "bookcase white", "bookcase black", "bookcase oak", "bookcase gray", "bookcase brown",
  "shelving unit white", "shelving unit black", "shelving unit metal", "shelving unit wood",
  "TV unit white", "TV unit black", "TV unit oak", "TV unit gray", "TV unit brown",
  "wardrobe white", "wardrobe gray", "wardrobe black", "wardrobe oak", "wardrobe brown",
  "chest of drawers white", "chest of drawers black", "chest of drawers oak",
  "chest of drawers gray", "chest of drawers brown",
  "nightstand white", "nightstand black", "nightstand oak", "nightstand gray",
  "dresser white", "dresser black", "dresser oak", "dresser gray",
  // Desks/office by color/material
  "desk white", "desk black", "desk oak", "desk gray", "desk brown",
  "desk wood", "desk glass", "desk metal",
  "office chair black", "office chair gray", "office chair white", "office chair blue",
  // Lamps by color/material/style
  "floor lamp black", "floor lamp white", "floor lamp brass", "floor lamp gold",
  "floor lamp silver", "floor lamp gray", "floor lamp wood",
  "table lamp black", "table lamp white", "table lamp brass", "table lamp gold",
  "table lamp gray", "table lamp wood", "table lamp ceramic",
  "pendant lamp black", "pendant lamp white", "pendant lamp brass", "pendant lamp gold",
  "pendant lamp glass", "pendant lamp rattan", "pendant lamp wood",
  // Rugs by color/style
  "rug white", "rug black", "rug gray", "rug beige", "rug blue",
  "rug green", "rug brown", "rug yellow", "rug pink", "rug multicolor",
  "rug red", "rug natural", "rug striped", "rug geometric",
  "rug flatwoven gray", "rug flatwoven beige", "rug high pile gray",
  "rug low pile white", "rug low pile gray", "rug jute", "rug wool",
  // Mirrors/wall art by style
  "mirror round", "mirror rectangular", "mirror black", "mirror white",
  "mirror gold", "mirror silver", "mirror wood", "mirror brass",
  "picture frame black", "picture frame white", "picture frame wood",
  "picture frame gold", "picture frame silver",
  // Textiles/soft furnishings
  "cushion cover gray", "cushion cover blue", "cushion cover white",
  "cushion cover green", "cushion cover yellow", "cushion cover black",
  "throw blanket gray", "throw blanket white", "throw blanket blue",
  "curtains white", "curtains gray", "curtains beige", "curtains linen",
  "duvet cover white", "duvet cover gray", "duvet cover blue",
  "duvet cover green", "duvet cover beige", "duvet cover striped",
  // Plants/decor by type
  "indoor plant pot", "plant pot ceramic", "plant pot white", "plant pot black",
  "plant pot terracotta", "vase white", "vase black", "vase glass",
  "vase ceramic", "candle holder black", "candle holder white",
  // Kids by color
  "kids bed white", "kids bed gray", "kids storage white", "kids storage colorful",
  "kids chair white", "kids chair colorful", "kids desk white",
  // Outdoor by color/material
  "outdoor chair gray", "outdoor chair black", "outdoor chair brown",
  "outdoor table gray", "outdoor table black", "outdoor table brown",
  "outdoor sofa gray", "outdoor sofa beige",
  "outdoor rug blue", "outdoor rug green", "outdoor rug gray",
  // Kitchen by type
  "kitchen cart white", "kitchen cart black", "kitchen cart wood",
  "open shelving white", "open shelving black", "open shelving wood",

  // ── Extra color sweeps for high-yield categories ─────────────────
  // More rug variants
  "rug orange", "rug turquoise", "rug purple", "rug cream",
  "rug flatwoven blue", "rug flatwoven green", "rug flatwoven brown",
  "rug flatwoven red", "rug high pile white", "rug high pile beige",
  "rug low pile blue", "rug low pile beige", "rug sisal", "rug seagrass",
  "runner rug", "small rug", "large rug", "round rug", "kids rug",
  // More sofa variants
  "sofa red", "sofa orange", "sofa teal", "sofa light gray",
  "sofa dark gray", "sofa dark blue", "sofa terracotta",
  "sofa 3 seater", "sofa 2 seater", "sofa sectional left",
  "sofa sectional right", "modular sofa", "sofa chaise",
  // More armchair/accent seating
  "accent chair blue", "accent chair green", "accent chair yellow",
  "accent chair velvet blue", "accent chair velvet green",
  "accent chair velvet yellow", "accent chair velvet gray",
  "lounge chair", "egg chair", "bucket chair", "wingback chair",
  "reading chair", "accent chair teal", "accent chair orange",
  // More dining/bar seating  
  "dining chair blue", "dining chair velvet", "stool black",
  "stool white", "stool wood", "stool gray",
  "counter stool black", "counter stool white", "counter stool gray",
  "breakfast bar stool", "kitchen stool",
  // More beds
  "bed frame gray beige", "bed frame green", "bed frame blue",
  "platform bed black", "platform bed white", "platform bed gray",
  "upholstered bed gray", "upholstered bed beige", "upholstered bed blue",
  "daybed gray", "daybed beige", "daybed white",
  // More tables
  "dining table natural", "dining table walnut", "dining table concrete",
  "coffee table natural", "coffee table walnut", "coffee table rattan",
  "side table gold", "side table brass", "side table marble",
  "nesting tables white", "nesting tables black", "nesting tables oak",
  // More lighting
  "floor lamp copper", "floor lamp rose gold", "floor lamp concrete",
  "table lamp blue", "table lamp green", "table lamp copper",
  "table lamp concrete", "table lamp rose gold", "table lamp pink",
  "pendant lamp copper", "pendant lamp rose gold", "pendant lamp blue",
  "pendant lamp gray", "ceiling lamp white", "ceiling lamp black",
  "wall lamp black", "wall lamp white", "wall lamp brass",
  "wall lamp gold", "wall lamp wood", "wall lamp copper",
  "LED lamp", "smart lamp", "dimmable lamp", "clip lamp",
  // More wall art / mirrors / frames
  "mirror antique", "mirror industrial", "mirror minimalist",
  "wall art print", "abstract art", "landscape print", "botanical print",
  "gallery wall frames", "photo frames set", "canvas print",
  "wall clock", "wall organizer",
  // More storage
  "floating shelves white", "floating shelves black", "floating shelves oak",
  "cube storage", "cube shelf", "modular storage",
  "media console white", "media console black", "media console oak",
  "media cabinet", "record storage",
  "shoe storage white", "shoe storage black", "hallway cabinet",
  "storage boxes", "storage baskets", "wicker basket",
  "fabric storage box", "canvas box", "storage bin",
  // More décor
  "artificial plant", "succulent plant", "cactus plant",
  "wall hanging", "macrame", "woven wall art",
  "decorative bowl", "decorative tray", "serving tray",
  "bookends", "decorative objects", "figurines",
  "scented candle", "diffuser", "potpourri",
  "photo album", "memory box", "keepsake box",
  "clock wall round", "clock black", "clock white",
  // Textiles extended
  "throw pillow gray", "throw pillow blue", "throw pillow green",
  "throw pillow yellow", "throw pillow white", "throw pillow pink",
  "throw pillow velvet", "throw pillow linen", "throw pillow knit",
  "bed pillow", "pillow insert", "cushion insert",
  "blanket gray", "blanket blue", "blanket beige", "blanket white",
  "blanket knit", "blanket fleece",
  "curtains blue", "curtains green", "curtains blackout white",
  "curtains blackout gray", "curtains sheer",
  // Kids extended
  "kids wardrobe white", "kids bookcase white", "kids lamp",
  "kids tent", "kids teepee", "kids cushion",
  "baby crib", "changing table", "kids drawer",
  // Office extended
  "home office storage", "office bookcase", "monitor arm",
  "cable management", "desk pad", "mouse pad",
  "office plant", "desk plant", "pen holder",
  // Bathroom extended
  "bathroom mirror round", "bathroom mirror black",
  "bath towel rack black", "bath shelf white",
  "toilet paper holder", "toothbrush holder",
  // Outdoor extended
  "garden bench", "garden stool", "outdoor planter",
  "outdoor lantern", "solar light", "string lights outdoor",
  "patio umbrella", "garden cushion blue", "garden cushion gray",

  // ── Final push over 10k ───────────────────────────────────────────
  "TV stand white", "TV stand black", "TV stand oak", "TV stand gray",
  "console table black", "console table white", "console table oak",
  "bar cabinet", "bar unit", "wine cabinet", "drinks cabinet",
  "vanity table", "makeup table", "dressing table white", "dressing table oak",
  "bed bench", "bedroom bench", "ottoman storage", "storage box bench",
  "wall mounted shelf", "corner shelf", "hexagon shelf", "triangle shelf",
  "magazine rack", "newspaper rack", "book stand",
  "laundry hamper", "laundry sorter", "clothes hamper",
  "ironing board", "drying rack", "clothes airer",
  "folding chair", "folding stool", "step stool", "ladder stool",
  "bath stool", "shower stool", "wooden bath stool",
  "kids bookcase white", "kids toy box", "toy chest white",
  "baby changing table", "crib white", "baby bed",
  "wall sconce black", "wall sconce white", "wall sconce brass",
  "spot light", "track light", "spot lamp", "adjustable spotlight",
  "desk organizer", "pen holder", "desk tray", "cable tidy",
  "monitor stand black", "monitor stand white", "laptop stand",
  "filing cabinet black", "filing cabinet white", "office storage white",
  "placemat", "table runner", "coaster set", "napkin holder",
  "spice rack", "kitchen organizer", "knife block", "utensil holder",
  "food storage container", "airtight container", "pantry jars",
  "picture ledge", "rail wall", "pegboard", "hook rail",
  "balcony furniture", "balcony chair", "balcony table", "folding outdoor",
  "picnic blanket", "outdoor lantern black", "solar garden light",
  "kids play mat", "foam mat", "puzzle mat",
  "bathroom stool white", "shower caddy", "bath caddy",

  // ── IKEA named product lines ─────────────────────────────────────
  // Sofas & seating series
  "KALLAX", "BILLY", "HEMNES", "MALM", "PAX", "BESTA",
  "SÖDERHAMN", "KIVIK", "EKTORP", "POÄNG", "LACK", "ALEX",
  "MICKE", "FRIHETEN", "KLIPPAN", "HAVSTA", "EKET", "TROFAST",
  "IVAR", "HEJNE", "STRANDMON", "FINNALA", "VIMLE", "HOLMSUND",
  "GRÖNLID", "JÄTTEBO", "ÄPPLARYD", "LANDSKRONA", "NORSBORG",
  "MORABO", "LIDHULT", "VALLENTUNA", "HYLTARP",
  "LEIRVIK", "BRIMNES", "TARVA", "ESPEVÄR",
  "TONSTAD", "HAUGA", "KULLEN", "RAST", "NORDLI",
  "SPIKSMED", "TRYSIL", "KVART", "ALÄNG", "HEKTAR",
  "RANARP", "FADO", "TERTIAL", "JANSJÖ", "TIVED",
  "SINNERLIG", "MÖCKELBY", "EKEDALEN", "INGATORP", "LISABO",
  "NORRÅKER", "TOBIAS", "LEIFARNE", "HENRIKSDAL", "BERGMUND",
  "KUNGSBACKA", "GODMORGON", "LILLÅNGEN",
  "RÅSKOG", "NISSAFORS", "GRUNDTAL",
  "FEJKA", "RIBBA", "SANNAHED", "HOVSTA", "MOSSLANDA",
  "NISSEDAL", "MONGSTAD", "KNAPPER",
  "ALGOT", "BOAXEL", "PLATSA",
  "SUNDVIK", "SNIGLAR", "STUVA", "FLISAT",
  "KURA", "MYDAL", "TUFFING",
  "APPLARO", "NÄMMARÖ", "BONDHOLMEN",
  "TÄRNÖ", "HÅLLÖ", "FRÖSÖN",
  // More series
  "BEKANT", "IDÅSEN", "LAGKAPTEN", "UPPSPEL", "FREDDE",
  "MARKUS", "JÄRVFJÄLLET", "HATTEFJÄLL", "FLINTAN", "VOLMAR",
  "TOSSBERG", "LIDKULLEN",
  "SKARSTA", "TROTTEN", "MITTZON",
  "LERBERG", "HYLLIS", "BERTBY",
  "MULIG", "RIGGA", "BRUNTRÄD",
  "DALSELV", "HEDEVIKEN", "TYSSEDAL", "SONGESAND",
  "FJELLSE", "NYVOLL", "SLAKT", "UTÅKER",
  "KRITTER", "VIKARE", "STUVA FRITIDS",
  "NORNÄS", "JUNISKÄR", "SALVIK", "SKÄNLAND",
  "BJÖRKSNAS", "FRÖSET", "DJUPVIKEN",
  "LÖVBACKEN", "VITTSJO", "INREDA",
  "SVALNÄS", "BJURSTA", "NORDEN",
  "INGOLF", "TERJE", "ODDVAR", "STEFAN",
  "SKOGSTA", "NORRARYD", "EKEDALEN chair",
  "JOKKMOKK", "STORNAS", "DOCKSTA",
  "MORBYLANGA", "LISABO table", "SANDSBERG",
  "DALFRED", "STIG", "FRANKLIN",
  "ORFJALL", "PELLO", "POÄNG footstool",
  "MASTHOLMEN", "SOLLERON", "NÄMMARÖ outdoor",
  "RUNNEN", "FALSTER", "TÄRNÖ outdoor",
  "ÄPPLARÖ", "HUSARO", "FROSON", "KUDDARNA",
  "KOLBJÖRN", "ENHET", "SEKTION",
  "SILVERAN", "ÄNGSJÖN", "TOFTBYN",
  "AGUNNARYD", "FLOALT", "VARMBLIXT",
  "NYMANE", "YPPERLIG", "KROSNÄS",
  "TÄNDSTICKA", "ENERYDA", "SÖTVATTEN",
  "LUSTIGKURRE", "BARNSLIG", "DRÖNA",
  "SOCKHOLM", "VITTSJO shelf", "LIXHULT",
  "KOMPLEMENT", "HASVIK", "GRIMO",
  "FORSAND", "BJÖRNÖYA", "BRIMNES wardrobe",
  "DOMBÄS", "STRAUMEN", "PAX bergsbo",
  "SYVDE", "HOVET mirror", "NISSEDAL mirror",
  "LINDBYN", "KNOPPÄNG", "LEMNOS",
  "HOLME", "ENBO", "NYTTJA",
  "TOLSBY", "RÖDALM", "SÖDERSVIK",
  "REJSA", "TJOG", "SKUBB",
  "DIMPA", "PLUGGIS", "GREJIG",
  "SAMLA", "TROFAST box", "SOCKERBIT",
  "TJENA", "DRÖNA box", "PALLRA",
  "RÅVAROR", "PURRPINGLA", "DAGOTTO",
  "URSKOG", "KNALLBÅGE", "LATTJO",
  "STILLSAMT", "NÖJSAM",
  "VILTO", "SOMMAR outdoor",
  "ASKHOLMEN", "KUNGSÖ",
];

function classifyProduct(category: string): {
  role: string;
  group: string;
  roomTypes: string[];
} {
  const c = category.toLowerCase();

  // ── Seating ──────────────────────────────────────────────────────
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

  // ── Dining seating ───────────────────────────────────────────────
  if (/bar stool|counter stool|high stool/.test(c))
    return { role: "bar-stool", group: "Seating", roomTypes: ["kitchen", "dining-room"] };
  if (/dining chair|kitchen chair/.test(c))
    return { role: "dining-chair", group: "Seating", roomTypes: ["dining-room", "kitchen"] };
  if (/\bchair\b/.test(c) && !/office|task|desk|kids|child/.test(c))
    return { role: "dining-chair", group: "Seating", roomTypes: ["dining-room"] };

  // ── Office seating ───────────────────────────────────────────────
  if (/office chair|task chair|ergonomic/.test(c))
    return { role: "office-chair", group: "Office", roomTypes: ["home-office"] };

  // ── Kids seating ─────────────────────────────────────────────────
  if (/kids.*chair|children.*chair|child.*stool|kids.*stool/.test(c))
    return { role: "dining-chair", group: "Seating", roomTypes: ["bedroom"] };

  // ── Tables ───────────────────────────────────────────────────────
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
  if (/\btable\b/.test(c) && /outdoor|garden|patio|balcony/.test(c))
    return { role: "dining-table", group: "Outdoor", roomTypes: ["dining-room"] };
  if (/\btable\b/.test(c))
    return { role: "dining-table", group: "Tables", roomTypes: ["dining-room"] };

  // ── Beds ─────────────────────────────────────────────────────────
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

  // ── Bedroom storage ──────────────────────────────────────────────
  if (/wardrobe|clothes closet/.test(c))
    return { role: "dresser", group: "Storage", roomTypes: ["bedroom"] };
  if (/chest of drawer|dresser/.test(c))
    return { role: "dresser", group: "Bedroom", roomTypes: ["bedroom"] };
  if (/nightstand|bedside table|bedside cabinet/.test(c))
    return { role: "nightstand", group: "Bedroom", roomTypes: ["bedroom"] };

  // ── Lighting ─────────────────────────────────────────────────────
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

  // ── Rugs ─────────────────────────────────────────────────────────
  if (/rug|carpet|runner/.test(c) && /outdoor/.test(c))
    return { role: "rug", group: "Textiles", roomTypes: ["living-room"] };
  if (/rug|carpet/.test(c))
    return { role: "rug", group: "Textiles", roomTypes: ["living-room", "bedroom", "dining-room"] };

  // ── Shelving / storage ───────────────────────────────────────────
  if (/bookcase|bookshelf/.test(c))
    return { role: "bookcase", group: "Storage", roomTypes: ["living-room", "home-office"] };
  if (/tv.*unit|tv.*bench|media.*unit|media.*console|media.*storage|entertainment/.test(c))
    return { role: "bookcase", group: "Storage", roomTypes: ["living-room"] };
  if (/display cabinet|vitrine/.test(c))
    return { role: "bookcase", group: "Storage", roomTypes: ["living-room", "dining-room"] };
  if (/wall shelf|floating shelf|wall.*shelv/.test(c))
    return { role: "shelving", group: "Storage", roomTypes: ["living-room", "home-office"] };
  if (/open shelf|open.*shelv/.test(c))
    return { role: "open-shelf", group: "Storage", roomTypes: ["kitchen", "living-room"] };
  if (/shelving unit|shelving system/.test(c))
    return { role: "shelving", group: "Storage", roomTypes: ["home-office", "living-room"] };
  if (/sideboard|buffet|credenza/.test(c))
    return { role: "bookcase", group: "Storage", roomTypes: ["dining-room", "living-room"] };
  if (/drawer unit|filing|file cabinet/.test(c))
    return { role: "drawer-unit", group: "Office", roomTypes: ["home-office"] };
  if (/kids.*storage|toy storage|kids.*shelf|children.*storage/.test(c))
    return { role: "shelving", group: "Storage", roomTypes: ["bedroom"] };
  if (/storage cabinet|storage unit/.test(c))
    return { role: "bookcase", group: "Storage", roomTypes: ["living-room"] };
  if (/shoe cabinet|shoe rack|shoe storage/.test(c))
    return { role: "shelving", group: "Storage", roomTypes: ["home-office"] };
  if (/bathroom cabinet|bathroom shelv|bathroom storage/.test(c))
    return { role: "open-shelf", group: "Storage", roomTypes: ["bedroom"] };

  // ── Kitchen ──────────────────────────────────────────────────────
  if (/kitchen cart|kitchen trolley|kitchen island|bar cart/.test(c))
    return { role: "cart", group: "Kitchen", roomTypes: ["kitchen"] };
  if (/kitchen shelv|kitchen storage|pantry/.test(c))
    return { role: "open-shelf", group: "Storage", roomTypes: ["kitchen"] };

  // ── Wall art / decor ─────────────────────────────────────────────
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

  // ── Textiles ─────────────────────────────────────────────────────
  if (/curtain|drape|blind|roller blind/.test(c))
    return { role: "wall-art", group: "Textiles", roomTypes: ["living-room", "bedroom"] };
  if (/bed linen|duvet|quilt|bedspread|comforter|pillow|cushion|throw|blanket/.test(c))
    return { role: "wall-art", group: "Textiles", roomTypes: ["bedroom"] };

  // ── Outdoor ──────────────────────────────────────────────────────
  if (/outdoor|garden|patio|balcony|deck/.test(c)) {
    if (/sofa|sectional/.test(c))
      return { role: "sofa", group: "Outdoor", roomTypes: ["living-room"] };
    if (/chair|lounger|hammock/.test(c))
      return { role: "accent-seating", group: "Outdoor", roomTypes: ["living-room"] };
    if (/table/.test(c))
      return { role: "dining-table", group: "Outdoor", roomTypes: ["dining-room"] };
    return { role: "other", group: "Outdoor", roomTypes: ["living-room"] };
  }

  // ── Hallway / hooks ───────────────────────────────────────────────
  if (/hook|coat rack|hat stand|hallway/.test(c))
    return { role: "other", group: "Storage", roomTypes: ["home-office"] };

  return { role: "other", group: "Other", roomTypes: ["living-room"] };
}

async function fetchTerm(term: string): Promise<Product[]> {
  const url = `https://sik.search.blue.cdtapps.com/us/en/search-result-page?q=${encodeURIComponent(term)}&size=100`;
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
      const id = String(p.id ?? "");
      if (!id) continue;

      const name = String(p.name ?? "");
      const typeName = String(p.typeName ?? "");
      const colors = (p.colors as { hex?: string; name?: string }[] | undefined) ?? [];
      const colorName = colors[0]?.name ?? "";
      // US API uses salesPrice.numeral (same as India — price.numeral no longer exists)
      const salesPrice = p.salesPrice as Record<string, unknown> | undefined;
      const price = Number(salesPrice?.numeral ?? 0) || 0;

      // US API: mainImageUrl is already a full absolute URL (no prefix needed)
      const imageUrl = String(p.mainImageUrl ?? "");

      const { role, group, roomTypes } = classifyProduct(typeName);

      products.push({
        id,
        name,
        category: typeName,
        color: colorName,
        price,
        currency: "USD",
        roomTypes,
        role,
        group,
        imageUrl,
        buyUrl: String(p.pipUrl ?? `https://www.ikea.com/us/en/search/?q=${encodeURIComponent(name)}`),
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
  console.log(`Fetching ${SEARCH_TERMS.length} search terms…`);

  const seen = new Map<string, Product>();
  let completed = 0;

  // Process in batches of 8 concurrent requests
  const CONCURRENCY = 8;
  const CHECKPOINT_EVERY = 30;
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
    // Checkpoint: save partial results so progress survives interruption
    if (completed % CHECKPOINT_EVERY === 0) {
      writeFileSync(OUT_PATH, JSON.stringify(Array.from(seen.values()), null, 2));
    }
    // Small pause between batches to be polite to the API
    if (i + CONCURRENCY < SEARCH_TERMS.length) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  console.log(`\nFetch complete. ${seen.size} unique products.`);

  const products = Array.from(seen.values());
  console.log(`Total unique products kept: ${products.length}`);

  writeFileSync(OUT_PATH, JSON.stringify(products, null, 2));
  console.log(`Written to ${OUT_PATH}`);

  // Print breakdown by role
  const byRole = new Map<string, number>();
  for (const p of products) {
    byRole.set(p.role, (byRole.get(p.role) ?? 0) + 1);
  }
  const sorted = [...byRole.entries()].sort((a, b) => b[1] - a[1]);
  console.log("\nBreakdown by role:");
  for (const [role, count] of sorted) {
    console.log(`  ${role.padEnd(20)} ${count}`);
  }
}

run().catch(console.error);
