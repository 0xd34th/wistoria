import {
  doublePrecision,
  index,
  pgTable,
  text,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * The IKEA catalog, now stored in Postgres instead of a static array. This is
 * the swappable "real furniture" layer: when a live IKEA product API lands, the
 * seed source changes but this table (and the read helpers over it) stay put.
 */
export const ikeaProductsTable = pgTable(
  "ikea_products",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    category: text("category").notNull(),
    color: text("color").notNull(),
    price: doublePrecision("price").notNull(),
    currency: text("currency").notNull().default("USD"),
    roomTypes: text("room_types").array().notNull(),
    role: text("role").notNull(),
    imageUrl: text("image_url").notNull(),
    buyUrl: text("buy_url").notNull(),
  },
  (table) => [index("ikea_products_role_idx").on(table.role)],
);

export const insertIkeaProductSchema = createInsertSchema(ikeaProductsTable);
export type InsertIkeaProduct = z.infer<typeof insertIkeaProductSchema>;
export type IkeaProductRow = typeof ikeaProductsTable.$inferSelect;
