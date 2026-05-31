import { ReplitConnectors } from "@replit/connectors-sdk";
import { createClient } from "@replit/revenuecat-sdk/client";

export async function getUncachableRevenueCatClient() {
  const connectors = new ReplitConnectors();

  const proxyFetch = async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    const path = url.pathname + url.search;

    const headers: Record<string, string> = {};
    request.headers.forEach((value: string, key: string) => {
      if (key.toLowerCase() !== "authorization") {
        headers[key] = value;
      }
    });

    let bodyText: string | undefined;
    if (request.method !== "GET" && request.method !== "HEAD") {
      try {
        bodyText = await request.text();
      } catch {
        bodyText = undefined;
      }
    }

    const proxyOpts: Record<string, unknown> = {
      method: request.method,
      headers,
    };
    if (bodyText) proxyOpts.body = bodyText;

    return connectors.proxy("revenuecat", path, proxyOpts) as unknown as Response;
  };

  const client = createClient({
    baseUrl: "https://api.revenuecat.com/v2",
    fetch: proxyFetch,
  });

  return client;
}
