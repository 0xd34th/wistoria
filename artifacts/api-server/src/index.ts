import app from "./app";
import { logger } from "./lib/logger";
import { seedIkeaProducts } from "./data/ikeaCatalog";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function start() {
  try {
    await seedIkeaProducts();
    logger.info("IKEA catalog seeded");
  } catch (err) {
    logger.error({ err }, "Failed to seed IKEA catalog");
  }

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
  });
}

void start();
