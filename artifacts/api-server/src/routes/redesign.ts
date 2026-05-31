import { Buffer } from "node:buffer";
import { Router, type IRouter } from "express";
import { toFile } from "openai";
import { db, redesignsTable, type RedesignRow } from "@workspace/db";
import { count, desc, eq, sql, and } from "drizzle-orm";
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

const FREE_REDESIGN_LIMIT = 1;
const PRO_DAILY_LIMIT = 5;

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

async function checkRateLimit(
  _deviceId: string,
  _isSubscribed: boolean,
): Promise<{ allowed: boolean; message: string }> {
  return { allowed: true, message: "" }; // TESTING: rate limit disabled
  if (_isSubscribed) {
    const today = new Date().toISOString().split("T")[0];
    const [row] = await db
      .select({ total: count() })
      .from(redesignsTable)
      .where(
        and(
          eq(redesignsTable.deviceId, deviceId),
          sql`DATE(${redesignsTable.createdAt} AT TIME ZONE 'UTC') = ${today}::date`,
        ),
      );
    const dailyCount = row?.total ?? 0;
    if (dailyCount >= PRO_DAILY_LIMIT) {
      return {
        allowed: false,
        message: `You've used all ${PRO_DAILY_LIMIT} Pro redesigns for today. Your limit resets tomorrow.`,
      };
    }
  } else {
    const [row] = await db
      .select({ total: count() })
      .from(redesignsTable)
      .where(eq(redesignsTable.deviceId, deviceId));
    const totalCount = row?.total ?? 0;
    if (totalCount >= FREE_REDESIGN_LIMIT) {
      return {
        allowed: false,
        message:
          "You've used your free redesign. Upgrade to Pro for more redesigns.",
      };
    }
  }
  return { allowed: true, message: "" };
}

const PROXY_ALLOW_LIST = ["www.ikea.com", "ikea.com"];
const PROXY_CACHE_SECONDS = 60 * 60 * 24; // 24 hours

router.get("/proxy/image", async (req, res) => {
  const raw = typeof req.query["url"] === "string" ? req.query["url"] : "";
  if (!raw) {
    res.status(400).json({ message: "url query param is required" });
    return;
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    res.status(400).json({ message: "Invalid URL" });
    return;
  }

  if (parsed.protocol !== "https:") {
    res.status(400).json({ message: "Only HTTPS URLs are allowed" });
    return;
  }

  if (!PROXY_ALLOW_LIST.some((h) => parsed.hostname === h || parsed.hostname.endsWith(`.${h}`))) {
    res.status(403).json({ message: "Domain not allowed" });
    return;
  }

  try {
    const upstream = await fetch(parsed.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Referer: "https://www.ikea.com/",
        Accept: "image/webp,image/apng,image/*,*/*;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (!upstream.ok) {
      req.log.warn(
        { url: parsed.toString(), status: upstream.status },
        "Upstream proxy image failed",
      );
      res.status(upstream.status).json({ message: "Upstream image unavailable" });
      return;
    }

    const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
    const buffer = Buffer.from(await upstream.arrayBuffer());

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", `public, max-age=${PROXY_CACHE_SECONDS}`);
    res.setHeader("Content-Length", buffer.length);
    res.send(buffer);
  } catch (err) {
    req.log.warn({ err }, "Image proxy fetch error");
    res.status(502).json({ message: "Could not fetch image" });
  }
});

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
type RefLogger = {
  warn: (obj: Record<string, unknown>, msg: string) => void;
  info: (obj: Record<string, unknown>, msg: string) => void;
};

const REFERENCE_FETCH_TIMEOUT_MS = 8000;
const REFERENCE_IMAGE_WIDTH = 512;

function downscaledIkeaUrl(url: string, width: number): string {
  if (!url.includes("ikea.com")) return url;
  try {
    const parsed = new URL(url);
    parsed.searchParams.set("imwidth", String(width));
    return parsed.toString();
  } catch {
    return url;
  }
}

async function fetchProductReferenceImages(
  products: Product[],
  log?: RefLogger,
): Promise<ProductReference[]> {
  const results = await Promise.all(
    products.map(async (p, i): Promise<ProductReference | null> => {
      try {
        const res = await fetch(
          downscaledIkeaUrl(p.imageUrl, REFERENCE_IMAGE_WIDTH),
          { signal: AbortSignal.timeout(REFERENCE_FETCH_TIMEOUT_MS) },
        );
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
  const refs = results.filter((r): r is ProductReference => r !== null);
  log?.info(
    {
      requested: products.length,
      attached: refs.length,
      images: refs.map((r) => ({
        product: r.product.name,
        type: r.file.type,
        bytes: r.file.size,
      })),
    },
    "Product reference images attached for redesign",
  );
  return refs;
}

function formatProductLine(p: Product): string {
  const dims: string[] = [];
  if (p.widthCm != null && p.depthCm != null) {
    dims.push(`${p.widthCm}×${p.depthCm} cm footprint`);
  }
  if (p.heightCm != null) {
    dims.push(`${p.heightCm} cm tall`);
  }
  const dimStr = dims.length > 0 ? `, ${dims.join(", ")}` : "";
  return `${p.name} (${p.category}, ${p.color}${dimStr})`;
}

function buildPrompt(
  style: StylePreset,
  room: RoomType,
  products: Product[],
  referenceProducts: Product[] = [],
): string {
  const items = products.map(formatProductLine).join("; ");
  const lines = [
    `You are an interior renovation tool. The FIRST image is a photograph of a real ${room.name.toLowerCase()} to edit.`,
    "CRITICAL: Keep the room's layout and architecture IDENTICAL to the original photo. Do not move, add, remove, or resize any walls, windows, doors, ceiling, or built-in structures. Preserve the exact camera angle, perspective, focal length, framing, room dimensions, and proportions. The position of the floor, walls, and openings must match the original precisely.",
    `Renovate the space in a ${style.name} interior style. ${style.promptHint}`,
    `Furnish and decorate the room using ONLY these specific IKEA products, placing each one naturally, realistically, and at a believable scale where it belongs in the scene: ${items}.`,
    "SCALE IS CRITICAL: Render each piece at its EXACT real-world size as specified in centimeters. A rug listed as 170×240 cm must visibly cover the majority of the open floor between furniture — it should be large and prominent on the floor, never small or timid. A sofa listed as 230 cm wide must span a full wall section. A pendant lamp must hang from the ceiling at a convincing size. Never scale items down to a fraction of their real size. All items must be in true proportion to each other and to the room's architecture.",
  ];
  if (referenceProducts.length > 0) {
    const refNames = referenceProducts.map((p) => p.name).join("; ");
    lines.push(
      `The ${referenceProducts.length} image(s) AFTER the room photo are reference photos of these specific IKEA products, in this exact order: ${refNames}. Reproduce each one FAITHFULLY: match its exact shape, silhouette, proportions, frame, leg style, cushion form, materials, texture, and color. Do NOT invent a generic lookalike or alter the design — the rendered furniture must clearly be the same product shown in its reference photo, only re-lit and positioned to fit the room.`,
    );
  }
  if (products.some((p) => p.role === "rug")) {
    lines.push(
      "RUG HANDLING: First completely REMOVE any rug or carpet already on the floor in the original photo. Then lay the new rug flat on the floor and reproduce its OWN true outline exactly as shown in its reference photo — round, oval, runner, animal-hide, or any irregular shape. Do NOT force the rug into a rectangle or square, and do NOT copy the shape, size, or position of the rug that was previously in the room. Match the reference rug's pattern, border, and proportions.",
    );
  }
  if (products.some((p) => p.role === "wall-art")) {
    lines.push(
      "WALL ART HANDLING: Hang the artwork flat against a wall at natural eye level, where wall art would realistically go. Reproduce the EXACT image, scene, colors, and framing shown in its reference photo — do NOT invent a different picture or alter the artwork. Keep it upright and rectangular with believable scale and a subtle, realistic shadow; do not distort the wall or surrounding architecture to fit it.",
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
    isSubscribed?: unknown;
    productIds?: unknown;
  };
  const deviceId =
    typeof body.deviceId === "string" ? body.deviceId.trim() : "";
  const isSubscribed = body.isSubscribed === true;
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

  const rateCheck = await checkRateLimit(deviceId, isSubscribed);
  if (!rateCheck.allowed) {
    res.status(429).json({ message: rateCheck.message });
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
      quality: "low",
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
    isSubscribed?: unknown;
    productIds?: unknown;
  };
  const image = typeof body.image === "string" ? body.image : "";
  const styleId = typeof body.styleId === "string" ? body.styleId : "";
  const roomTypeId =
    typeof body.roomTypeId === "string" ? body.roomTypeId : "";
  const deviceId =
    typeof body.deviceId === "string" ? body.deviceId.trim() : "";
  const isSubscribed = body.isSubscribed === true;
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

  const rateCheck = await checkRateLimit(deviceId, isSubscribed);
  if (!rateCheck.allowed) {
    res.status(429).json({ message: rateCheck.message });
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
      quality: "low",
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
