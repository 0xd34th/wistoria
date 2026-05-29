import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export interface StoredProduct {
  id: string;
  name: string;
  category: string;
  color: string;
  price: number;
  currency: string;
  roomTypes: string[];
  role: string;
  imageUrl: string;
  buyUrl: string;
}

export const redesignsTable = pgTable(
  "redesigns",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    deviceId: text("device_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    styleId: text("style_id").notNull(),
    styleName: text("style_name").notNull(),
    roomTypeId: text("room_type_id").notNull(),
    roomName: text("room_name").notNull(),
    originalImage: text("original_image").notNull(),
    redesignedImage: text("redesigned_image").notNull(),
    products: jsonb("products").$type<StoredProduct[]>().notNull(),
  },
  (table) => [
    index("redesigns_device_created_idx").on(table.deviceId, table.createdAt),
  ],
);

export type RedesignRow = typeof redesignsTable.$inferSelect;
export type InsertRedesign = typeof redesignsTable.$inferInsert;
