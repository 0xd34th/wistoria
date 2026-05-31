import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEED_PATH = join(
  __dirname,
  "../../artifacts/api-server/src/data/ikeaSeed.json",
);

interface Product {
  id: string;
  role: string;
  widthCm?: number;
  depthCm?: number;
  heightCm?: number;
  [key: string]: unknown;
}

interface DimRange {
  minW: number;
  maxW: number;
  minD: number;
  maxD: number;
  minH: number;
  maxH: number;
}

const ROLE_DIMS: Record<string, DimRange> = {
  rug:             { minW: 133, maxW: 250, minD: 195, maxD: 350, minH: 1,   maxH: 3   },
  sofa:            { minW: 175, maxW: 290, minD: 85,  maxD: 110, minH: 70,  maxH: 90  },
  "coffee-table":  { minW: 75,  maxW: 140, minD: 45,  maxD: 90,  minH: 38,  maxH: 55  },
  bed:             { minW: 140, maxW: 210, minD: 200, maxD: 215, minH: 90,  maxH: 130 },
  nightstand:      { minW: 40,  maxW: 65,  minD: 35,  maxD: 55,  minH: 50,  maxH: 75  },
  "floor-lamp":    { minW: 25,  maxW: 45,  minD: 25,  maxD: 45,  minH: 140, maxH: 185 },
  pendant:         { minW: 25,  maxW: 65,  minD: 25,  maxD: 65,  minH: 20,  maxH: 50  },
  "wall-art":      { minW: 40,  maxW: 120, minD: 2,   maxD: 5,   minH: 40,  maxH: 120 },
  "dining-table":  { minW: 115, maxW: 200, minD: 70,  maxD: 110, minH: 72,  maxH: 78  },
  "dining-chair":  { minW: 43,  maxW: 58,  minD: 47,  maxD: 60,  minH: 78,  maxH: 100 },
  "bar-stool":     { minW: 35,  maxW: 50,  minD: 35,  maxD: 50,  minH: 90,  maxH: 115 },
  desk:            { minW: 95,  maxW: 160, minD: 50,  maxD: 80,  minH: 70,  maxH: 80  },
  "office-chair":  { minW: 55,  maxW: 68,  minD: 55,  maxD: 70,  minH: 90,  maxH: 135 },
  bookcase:        { minW: 60,  maxW: 100, minD: 22,  maxD: 40,  minH: 100, maxH: 225 },
  dresser:         { minW: 80,  maxW: 160, minD: 40,  maxD: 55,  minH: 70,  maxH: 130 },
  shelving:        { minW: 60,  maxW: 120, minD: 20,  maxD: 40,  minH: 100, maxH: 220 },
  "task-lamp":     { minW: 15,  maxW: 35,  minD: 15,  maxD: 35,  minH: 30,  maxH: 65  },
  "table-lamp":    { minW: 20,  maxW: 45,  minD: 20,  maxD: 45,  minH: 35,  maxH: 75  },
  "accent-seating":{ minW: 60,  maxW: 95,  minD: 65,  maxD: 100, minH: 70,  maxH: 95  },
  cart:            { minW: 45,  maxW: 80,  minD: 35,  maxD: 55,  minH: 65,  maxH: 105 },
  "open-shelf":    { minW: 60,  maxW: 120, minD: 20,  maxD: 40,  minH: 20,  maxH: 40  },
  "drawer-unit":   { minW: 40,  maxW: 80,  minD: 40,  maxD: 60,  minH: 50,  maxH: 90  },
  bench:           { minW: 80,  maxW: 165, minD: 35,  maxD: 55,  minH: 40,  maxH: 55  },
  "storage-bench": { minW: 80,  maxW: 165, minD: 35,  maxD: 55,  minH: 40,  maxH: 55  },
  other:           { minW: 30,  maxW: 80,  minD: 25,  maxD: 60,  minH: 25,  maxH: 80  },
};

function simpleHash(str: string): number {
  let h = 0x9e3779b9;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 0x9e3779b9);
    h = (h << 13) | (h >>> 19);
  }
  return (h >>> 0);
}

function deterministicInt(seed: number, min: number, max: number): number {
  const range = max - min + 1;
  return min + (seed % range);
}

function addDimensions(p: Product): Product {
  if (p.widthCm != null && p.depthCm != null && p.heightCm != null) {
    return p;
  }
  const range = ROLE_DIMS[p.role] ?? ROLE_DIMS["other"]!;
  const h1 = simpleHash(p.id + "w");
  const h2 = simpleHash(p.id + "d");
  const h3 = simpleHash(p.id + "h");
  return {
    ...p,
    widthCm:  deterministicInt(h1, range.minW, range.maxW),
    depthCm:  deterministicInt(h2, range.minD, range.maxD),
    heightCm: deterministicInt(h3, range.minH, range.maxH),
  };
}

const raw = JSON.parse(readFileSync(SEED_PATH, "utf-8")) as Product[];
const updated = raw.map(addDimensions);

const rugsBefore = raw.filter((p) => p.role === "rug");
const rugsAfter  = updated.filter((p) => p.role === "rug");
const sample     = rugsAfter.slice(0, 3);

console.log(`Updated ${updated.length} products with dimension data.`);
console.log(`Rugs: ${rugsBefore.length} → dimensions added to ${rugsAfter.length}`);
console.log("Sample rug dimensions:", sample.map((p) => `${p.name}: ${p.widthCm}×${p.depthCm} cm (h:${p.heightCm} cm)`));

writeFileSync(SEED_PATH, JSON.stringify(updated, null, 2), "utf-8");
console.log(`Written to ${SEED_PATH}`);
