import { Buffer } from "node:buffer";
import { Router, type IRouter } from "express";
import { toFile } from "openai";
import { db, redesignsTable, type RedesignRow } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { openai } from "../lib/openai";
import {
  getEligibleProductsForRoom,
  getProductsByIds,
  getProductsForRoom,
  getProductsForStyle,
  getRoom,
  getStyle,
  listRooms,
  listStyles,
  type Product,
  type RoomType,
  type StylePreset,
} from "../data/ikeaCatalog";

const router: IRouter = Router();

function toRedesign(row: RedesignRow) {
  return {
    id: row.id,
    createdAt: row.createdAt.getTime(),
    deviceId: row.deviceId,
    styleId: row.styleId,
    styleName: row.styleName,
    roomTypeId: row.roomTypeId,
    roomName: row.roomName,
    originalImage: row.originalImage,
    redesignedImage: row.redesignedImage,
    products: row.products,
  };
}

router.get("/styles", (_req, res) => {
  res.json(listStyles());
});

router.get("/rooms", (_req, res) => {
  res.json(listRooms());
});

router.get("/products", async (req, res) => {
  const roomTypeId =
    typeof req.query["roomTypeId"] === "string"
      ? req.query["roomTypeId"]
      : undefined;
  // For a room we return the full eligible pool so the result screen can offer
  // every product as a swap alternative; without a room we return everything.
  const products = roomTypeId
    ? await getEligibleProductsForRoom(roomTypeId)
    : await getProductsForStyle();
  res.json(products);
});

router.get("/redesigns", async (req, res) => {
  const deviceId =
    typeof req.query["deviceId"] === "string"
      ? req.query["deviceId"].trim()
      : "";
  if (!deviceId) {
    res.status(400).json({ message: "A device id is required." });
    return;
  }

  try {
    const rows = await db
      .select()
      .from(redesignsTable)
      .where(eq(redesignsTable.deviceId, deviceId))
      .orderBy(desc(redesignsTable.createdAt));
    res.json(rows.map(toRedesign));
  } catch (err) {
    req.log.error({ err }, "Failed to load saved redesigns");
    res.status(500).json({ message: "Could not load your saved redesigns." });
  }
});

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

function detectImage(buffer: Buffer): { mime: string; ext: string } | null {
  if (buffer[0] === 0x89 && buffer[1] === 0x50) {
    return { mime: "image/png", ext: "png" };
  }
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    return { mime: "image/jpeg", ext: "jpg" };
  }
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45
  ) {
    return { mime: "image/webp", ext: "webp" };
  }
  return null;
}

function decodeImage(
  image: string,
): { buffer: Buffer; mime: string; ext: string } | { error: string } {
  const base64 = image.includes(",")
    ? image.slice(image.indexOf(",") + 1)
    : image;
  const normalized = base64.trim();
  if (!normalized || !/^[A-Za-z0-9+/]+={0,2}$/.test(normalized)) {
    return { error: "The image must be valid base64-encoded data." };
  }

  const buffer = Buffer.from(normalized, "base64");
  if (buffer.length === 0) {
    return { error: "The image could not be decoded." };
  }
  if (buffer.length > MAX_IMAGE_BYTES) {
    return { error: "The image is too large. Please use a smaller photo." };
  }

  const detected = detectImage(buffer);
  if (!detected) {
    return { error: "Unsupported image format. Use a JPEG, PNG, or WebP." };
  }
  return { buffer, mime: detected.mime, ext: detected.ext };
}

type Uploadable = Awaited<ReturnType<typeof toFile>>;

type ProductReference = { product: Product; file: Uploadable };

type RefLogger = { warn: (obj: Record<string, unknown>, msg: string) => void };

const REFERENCE_FETCH_TIMEOUT_MS = 8000;

/**
 * Fetches each product's IKEA image and converts it to an Uploadable so it can
 * be passed to the image model as a visual reference. This grounds the generated
 * furniture in the real product's shape/silhouette/color rather than the model
 * inventing a lookalike from the text name alone. Failures are skipped (the
 * product still appears in the text prompt) so a single bad image URL never
 * breaks a redesign.
 *
 * Returns product/file PAIRS in product order, with failures dropped. Pairing
 * keeps each reference image mapped to its product so the prompt can name them
 * in the exact order they are sent — even when some fetches fail.
 */
async function fetchProductReferenceImages(
  products: Product[],
  log?: RefLogger,
): Promise<ProductReference[]> {
  const results = await Promise.all(
    products.map(async (p, i): Promise<ProductReference | null> => {
      try {
        const res = await fetch(p.imageUrl, {
          signal: AbortSignal.timeout(REFERENCE_FETCH_TIMEOUT_MS),
        });
        if (!res.ok) {
          log?.warn(
            { productId: p.id, status: res.status },
            "Skipped product reference image (bad response)",
          );
          return null;
        }
        const buffer = Buffer.from(await res.arrayBuffer());
        const detected = detectImage(buffer);
        if (!detected) {
          log?.warn(
            { productId: p.id },
            "Skipped product reference image (unsupported format)",
          );
          return null;
        }
        const file = await toFile(buffer, `product-${i}.${detected.ext}`, {
          type: detected.mime,
        });
        return { product: p, file };
      } catch (err) {
        log?.warn(
          { productId: p.id, err },
          "Skipped product reference image (fetch error)",
        );
        return null;
      }
    }),
  );
  return results.filter((r): r is ProductReference => r !== null);
}

function buildPrompt(
  style: StylePreset,
  room: RoomType,
  products: Product[],
  referenceProducts: Product[] = [],
): string {
  const items = products
    .map((p) => `${p.name} (${p.category}, ${p.color})`)
    .join("; ");
  const lines = [
    `You are an interior renovation tool. The FIRST image is a photograph of a real ${room.name.toLowerCase()} to edit.`,
    "CRITICAL: Keep the room's layout and architecture IDENTICAL to the original photo. Do not move, add, remove, or resize any walls, windows, doors, ceiling, or built-in structures. Preserve the exact camera angle, perspective, focal length, framing, room dimensions, and proportions. The position of the floor, walls, and openings must match the original precisely.",
    `Renovate the space in a ${style.name} interior style. ${style.promptHint}`,
    `Furnish and decorate the room using ONLY these specific IKEA products, placing each one naturally, realistically, and at a believable scale where it belongs in the scene: ${items}.`,
  ];
  if (referenceProducts.length > 0) {
    const refNames = referenceProducts.map((p) => p.name).join("; ");
    lines.push(
      `The ${referenceProducts.length} image(s) AFTER the room photo are reference photos of these specific IKEA products, in this exact order: ${refNames}. Reproduce each one FAITHFULLY: match its exact shape, silhouette, proportions, frame, leg style, cushion form, materials, texture, and color. Do NOT invent a generic lookalike or alter the design — the rendered furniture must clearly be the same product shown in its reference photo, only re-lit and positioned to fit the room.`,
    );
  }
  lines.push(
    "You may update wall color, flooring finish, textiles, and lighting mood to suit the style, but the structural layout and viewpoint must remain exactly the same as the original.",
    "Photorealistic interior photography with accurate proportions and natural lighting. Do not add any text, watermarks, labels, logos, or people.",
  );
  return lines.join(" ");
}

router.post("/redesigns/:id/regenerate", async (req, res) => {
  const id = req.params.id;
  const body = req.body as {
    deviceId?: unknown;
    productIds?: unknown;
  };
  const deviceId =
    typeof body.deviceId === "string" ? body.deviceId.trim() : "";
  const productIds = Array.isArray(body.productIds)
    ? body.productIds.filter((pid): pid is string => typeof pid === "string")
    : [];

  if (!deviceId) {
    res.status(400).json({ message: "A device id is required." });
    return;
  }

  if (productIds.length === 0) {
    res
      .status(400)
      .json({ message: "Keep at least one piece to regenerate the room." });
    return;
  }

  const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(id)) {
    res.status(404).json({ message: "Design not found." });
    return;
  }

  const existing = await db
    .select()
    .from(redesignsTable)
    .where(eq(redesignsTable.id, id))
    .limit(1);
  const current = existing[0];

  if (!current || current.deviceId !== deviceId) {
    res.status(404).json({ message: "Design not found." });
    return;
  }

  const style = getStyle(current.styleId);
  const room = getRoom(current.roomTypeId);
  if (!style || !room) {
    res.status(400).json({ message: "This design can no longer be generated." });
    return;
  }

  const products = await getProductsByIds(productIds);
  if (products.length === 0) {
    res.status(400).json({ message: "None of the chosen pieces are available." });
    return;
  }

  const decoded = decodeImage(current.originalImage);
  if ("error" in decoded) {
    res.status(400).json({ message: decoded.error });
    return;
  }

  try {
    const { buffer, mime, ext } = decoded;
    const file = await toFile(buffer, `room.${ext}`, { type: mime });
    const references = await fetchProductReferenceImages(products, req.log);

    const response = await openai.images.edit({
      model: "gpt-image-2",
      image: [file, ...references.map((r) => r.file)],
      prompt: buildPrompt(
        style,
        room,
        products,
        references.map((r) => r.product),
      ),
      size: "auto",
    });

    const redesignedImage = response.data?.[0]?.b64_json ?? "";
    if (!redesignedImage) {
      res.status(502).json({ message: "The redesign could not be generated." });
      return;
    }

    const [row] = await db
      .update(redesignsTable)
      .set({ redesignedImage, products })
      .where(eq(redesignsTable.id, id))
      .returning();

    if (!row) {
      res.status(500).json({ message: "The redesign could not be saved." });
      return;
    }

    res.json(toRedesign(row));
  } catch (err) {
    req.log.error({ err }, "Redesign regeneration failed");
    res
      .status(502)
      .json({ message: "Something went wrong regenerating the redesign." });
  }
});

router.post("/redesign", async (req, res) => {
  const body = req.body as {
    image?: unknown;
    styleId?: unknown;
    roomTypeId?: unknown;
    deviceId?: unknown;
    productIds?: unknown;
  };
  const image = typeof body.image === "string" ? body.image : "";
  const styleId = typeof body.styleId === "string" ? body.styleId : "";
  const roomTypeId =
    typeof body.roomTypeId === "string" ? body.roomTypeId : "";
  const deviceId =
    typeof body.deviceId === "string" ? body.deviceId.trim() : "";
  const selectedProductIds = Array.isArray(body.productIds)
    ? body.productIds.filter((id): id is string => typeof id === "string")
    : undefined;

  if (!image) {
    res.status(400).json({ message: "An image is required." });
    return;
  }

  if (!deviceId) {
    res.status(400).json({ message: "A device id is required." });
    return;
  }

  const style = getStyle(styleId);
  if (!style) {
    res.status(400).json({ message: `Unknown style: ${styleId}` });
    return;
  }

  const room = getRoom(roomTypeId);
  if (!room) {
    res.status(400).json({ message: `Unknown room type: ${roomTypeId}` });
    return;
  }

  const decoded = decodeImage(image);
  if ("error" in decoded) {
    res.status(400).json({ message: decoded.error });
    return;
  }

  const products = await getProductsForRoom(roomTypeId, selectedProductIds);

  try {
    const { buffer, mime, ext } = decoded;
    const file = await toFile(buffer, `room.${ext}`, { type: mime });
    const references = await fetchProductReferenceImages(products, req.log);

    const response = await openai.images.edit({
      model: "gpt-image-2",
      image: [file, ...references.map((r) => r.file)],
      prompt: buildPrompt(
        style,
        room,
        products,
        references.map((r) => r.product),
      ),
      size: "auto",
    });

    const redesignedImage = response.data?.[0]?.b64_json ?? "";
    if (!redesignedImage) {
      res.status(502).json({ message: "The redesign could not be generated." });
      return;
    }

    const [row] = await db
      .insert(redesignsTable)
      .values({
        deviceId,
        styleId,
        styleName: style.name,
        roomTypeId,
        roomName: room.name,
        originalImage: image,
        redesignedImage,
        products,
      })
      .returning();

    if (!row) {
      res.status(500).json({ message: "The redesign could not be saved." });
      return;
    }

    res.json(toRedesign(row));
  } catch (err) {
    req.log.error({ err }, "Redesign generation failed");
    res
      .status(502)
      .json({ message: "Something went wrong generating the redesign." });
  }
});

export default router;
