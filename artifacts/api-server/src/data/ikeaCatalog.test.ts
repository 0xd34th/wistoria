import { describe, expect, it } from "vitest";
import { SEED_PRODUCTS, selectDecluttered } from "./ikeaCatalog";

/**
 * Locks in the deterministic per-room product selection. These curated sets are
 * what the "Shop the look" tags are anchored to, so their exact contents and
 * order must stay stable. The selection logic is pure (selectDecluttered) and
 * tested over the in-memory seed pool, so it needs no database.
 */
function eligible(roomTypeId: string) {
  return SEED_PRODUCTS.filter((p) => p.roomTypes.includes(roomTypeId));
}

describe("selectDecluttered", () => {
  it("returns the exact ordered living-room set", () => {
    const ids = selectDecluttered(eligible("living-room"), "living-room").map(
      (p) => p.id,
    );
    expect(ids).toEqual([
      "kivik-sofa",
      "listerby-coffee-table",
      "lohals-rug",
      "lauters-floor-lamp",
      "poang-armchair",
    ]);
  });

  it("returns the exact ordered bedroom set", () => {
    const ids = selectDecluttered(eligible("bedroom"), "bedroom").map(
      (p) => p.id,
    );
    expect(ids).toEqual([
      "malm-bed-frame",
      "hemnes-nightstand",
      "hemnes-dresser",
      "taernaby-table-lamp",
      "lohals-rug",
    ]);
  });
});
