// RevenueCat Developer API client, authenticated via the Replit RevenueCat
// connector (blueprint id: "revenuecat"). The connector proxy injects and
// refreshes OAuth credentials automatically, so we never handle API keys here.
// Never cache the returned client — tokens expire; call this per operation.
import { createClient } from "@replit/revenuecat-sdk/client";
import { ReplitConnectors } from "@replit/connectors-sdk";

export async function getUncachableRevenueCatClient() {
  const connectors = new ReplitConnectors();
  const proxyFetch = connectors.createProxyFetch("revenuecat");

  return createClient({
    baseUrl: "https://api.revenuecat.com/v2",
    fetch: proxyFetch as typeof fetch,
  });
}
