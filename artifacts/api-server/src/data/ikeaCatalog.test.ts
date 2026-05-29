import { describe, expect, it } from "vitest";
import { getProductsForRoom } from "./ikeaCatalog";

/**
 * Locks in the deterministic per-room product selection. These curated sets are
 * what the "Shop the look" tags are anchored to, so their exact contents and
 * order must stay stable. If a catalog edit changes either, this test should
 * fail loudly so the change is a deliberate decision.
 */
describe("getProductsForRoom", () => {
  it("returns the exact ordered living-room set", () => {
    const ids = getProductsForRoom("living-room").map((p) => p.id);
    expect(ids).toEqual([
      "kivik-sofa",
      "listerby-coffee-table",
      "lohals-rug",
      "lauters-floor-lamp",
      "poang-armchair",
    ]);
  });

  it("returns the exact ordered bedroom set", () => {
    const ids = getProductsForRoom("bedroom").map((p) => p.id);
    expect(ids).toEqual([
      "malm-bed-frame",
      "hemnes-nightstand",
      "hemnes-dresser",
      "taernaby-table-lamp",
      "lohals-rug",
    ]);
  });
});
