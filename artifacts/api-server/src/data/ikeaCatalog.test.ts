import { describe, expect, it } from "vitest";
import { type Product, selectDecluttered } from "./ikeaCatalog";

/**
 * Locks in the deterministic per-room product selection. The de-clutter logic is
 * pure (selectDecluttered), so it's tested over a small synthetic pool rather
 * than the generated IKEA seed (whose exact ids change when the catalog is
 * re-ingested). What matters: one piece per functional role, ordered by the
 * room's role priority, capped, with optional user narrowing.
 */
function p(id: string, role: string, roomTypes: string[]): Product {
  return {
    id,
    name: id,
    category: role,
    color: "white",
    price: 99,
    currency: "USD",
    roomTypes,
    role,
    group: "Test",
    imageUrl: `https://example.com/${id}.jpg`,
    buyUrl: `https://example.com/${id}`,
  };
}

describe("selectDecluttered", () => {
  const livingRoom: Product[] = [
    p("sofa-a", "sofa", ["living-room"]),
    p("sofa-b", "sofa", ["living-room"]),
    p("table-a", "coffee-table", ["living-room"]),
    p("rug-a", "rug", ["living-room"]),
    p("lamp-a", "floor-lamp", ["living-room"]),
    p("chair-a", "accent-seating", ["living-room"]),
    p("book-a", "bookcase", ["living-room"]),
    p("pend-a", "pendant", ["living-room"]),
  ];

  it("picks one piece per role, ordered by room priority and capped at 5", () => {
    const ids = selectDecluttered(livingRoom, "living-room").map((x) => x.id);
    expect(ids).toEqual([
      "sofa-a",
      "table-a",
      "rug-a",
      "lamp-a",
      "chair-a",
    ]);
  });

  it("never returns two products with the same role", () => {
    const roles = selectDecluttered(livingRoom, "living-room").map(
      (x) => x.role,
    );
    expect(new Set(roles).size).toBe(roles.length);
  });

  it("narrows to a user-selected subset when provided", () => {
    const ids = selectDecluttered(livingRoom, "living-room", [
      "table-a",
      "rug-a",
    ]).map((x) => x.id);
    expect(ids).toEqual(["table-a", "rug-a"]);
  });

  it("falls back to the default selection if the filter leaves nothing", () => {
    const ids = selectDecluttered(livingRoom, "living-room", [
      "does-not-exist",
    ]).map((x) => x.id);
    expect(ids.length).toBeGreaterThan(0);
  });
});
