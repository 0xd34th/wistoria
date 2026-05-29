import { Buffer } from "node:buffer";
import { Router, type IRouter } from "express";
import { toFile } from "openai";
import { openai } from "../lib/openai";
import {
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

router.get("/styles", (_req, res) => {
  res.json(listStyles());
});

router.get("/rooms", (_req, res) => {
  res.json(listRooms());
});

router.get("/products", (req, res) => {
  const roomTypeId =
    typeof req.query["roomTypeId"] === "string"
      ? req.query["roomTypeId"]
      : undefined;
  res.json(
    roomTypeId ? getProductsForRoom(roomTypeId) : getProductsForStyle(),
  );
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

function buildPrompt(
  style: StylePreset,
  room: RoomType,
  products: Product[],
): string {
  const items = products
    .map((p) => `${p.name} (${p.category}, ${p.color})`)
    .join("; ");
  return [
    `You are an interior renovation tool. Edit this photograph of a real ${room.name.toLowerCase()}.`,
    "CRITICAL: Keep the room's layout and architecture IDENTICAL to the original photo. Do not move, add, remove, or resize any walls, windows, doors, ceiling, or built-in structures. Preserve the exact camera angle, perspective, focal length, framing, room dimensions, and proportions. The position of the floor, walls, and openings must match the original precisely.",
    `Renovate the space in a ${style.name} interior style. ${style.promptHint}`,
    `Furnish and decorate the room using ONLY these specific IKEA products, placing each one naturally, realistically, and at a believable scale where it belongs in the scene: ${items}.`,
    "You may update wall color, flooring finish, textiles, and lighting mood to suit the style, but the structural layout and viewpoint must remain exactly the same as the original.",
    "Photorealistic interior photography with accurate proportions and natural lighting. Do not add any text, watermarks, labels, logos, or people.",
  ].join(" ");
}

router.post("/redesign", async (req, res) => {
  const body = req.body as {
    image?: unknown;
    styleId?: unknown;
    roomTypeId?: unknown;
    productIds?: unknown;
  };
  const image = typeof body.image === "string" ? body.image : "";
  const styleId = typeof body.styleId === "string" ? body.styleId : "";
  const roomTypeId =
    typeof body.roomTypeId === "string" ? body.roomTypeId : "";
  const selectedProductIds = Array.isArray(body.productIds)
    ? body.productIds.filter((id): id is string => typeof id === "string")
    : undefined;

  if (!image) {
    res.status(400).json({ message: "An image is required." });
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

  const products = getProductsForRoom(roomTypeId, selectedProductIds);

  try {
    const { buffer, mime, ext } = decoded;
    const file = await toFile(buffer, `room.${ext}`, { type: mime });

    const response = await openai.images.edit({
      model: "gpt-image-2",
      image: file,
      prompt: buildPrompt(style, room, products),
      size: "auto",
    });

    const redesignedImage = response.data?.[0]?.b64_json ?? "";
    if (!redesignedImage) {
      res.status(502).json({ message: "The redesign could not be generated." });
      return;
    }

    res.json({ redesignedImage, styleId, products });
  } catch (err) {
    req.log.error({ err }, "Redesign generation failed");
    res
      .status(502)
      .json({ message: "Something went wrong generating the redesign." });
  }
});

export default router;
