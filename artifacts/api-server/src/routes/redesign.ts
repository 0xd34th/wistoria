import { Buffer } from "node:buffer";
import { Router, type IRouter } from "express";
import { toFile } from "openai";
import { openai } from "../lib/openai";
import {
  getProductsForStyle,
  getStyle,
  listStyles,
  type Product,
  type StylePreset,
} from "../data/ikeaCatalog";

const router: IRouter = Router();

router.get("/styles", (_req, res) => {
  res.json(listStyles());
});

router.get("/products", (req, res) => {
  const styleId =
    typeof req.query["styleId"] === "string" ? req.query["styleId"] : undefined;
  res.json(getProductsForStyle(styleId));
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

function buildPrompt(style: StylePreset, products: Product[]): string {
  const items = products
    .map((p) => `${p.name} (${p.category}, ${p.color})`)
    .join(", ");
  return [
    `Restyle this exact room into a ${style.name} interior design.`,
    style.promptHint,
    "Keep the room's existing architecture, window and door positions, wall layout, flooring, and camera perspective unchanged.",
    `Replace and arrange the furniture and decor to naturally and realistically incorporate these specific IKEA pieces: ${items}.`,
    `Photorealistic interior photography, natural lighting, a cohesive ${style.name} aesthetic.`,
    "Do not add any text, watermarks, or labels.",
  ].join(" ");
}

router.post("/redesign", async (req, res) => {
  const body = req.body as { image?: unknown; styleId?: unknown };
  const image = typeof body.image === "string" ? body.image : "";
  const styleId = typeof body.styleId === "string" ? body.styleId : "";

  if (!image) {
    res.status(400).json({ message: "An image is required." });
    return;
  }

  const style = getStyle(styleId);
  if (!style) {
    res.status(400).json({ message: `Unknown style: ${styleId}` });
    return;
  }

  const decoded = decodeImage(image);
  if ("error" in decoded) {
    res.status(400).json({ message: decoded.error });
    return;
  }

  const products = getProductsForStyle(styleId);

  try {
    const { buffer, mime, ext } = decoded;
    const file = await toFile(buffer, `room.${ext}`, { type: mime });

    const response = await openai.images.edit({
      model: "gpt-image-2",
      image: file,
      prompt: buildPrompt(style, products),
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
