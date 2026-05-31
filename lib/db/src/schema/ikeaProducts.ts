import {
  doublePrecision,
  index,
  pgTable,
  text,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

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
    group: text("group").notNull().default("Other"),
    imageUrl: text("image_url").notNull(),
    buyUrl: text("buy_url").notNull(),
  },
  (table) => [
    index("ikea_products_role_idx").on(table.role),
    index("ikea_products_group_idx").on(table.group),
  ],
);

export const insertIkeaProductSchema = createInsertSchema(ikeaProductsTable);
export type InsertIkeaProduct = z.infer<typeof insertIkeaProductSchema>;
export type IkeaProductRow = typeof ikeaProductsTable.$inferSelect;
