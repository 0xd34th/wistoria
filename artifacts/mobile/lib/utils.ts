/**
 * Returns an absolute URL for an asset path relative to the API server.
 */
export function getAssetUrl(path: string): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (!domain) return path;

  // Remove leading slash if present to avoid double slash
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  return `https://${domain}/${cleanPath}`;
}

/**
 * Returns a higher-resolution variant of an IKEA product image. IKEA's CDN
 * (ikea.com) accepts an `imwidth` query param that controls the rendered width;
 * the default URLs we store often resolve to tiny thumbnails, so we request a
 * larger width for crisp display in the collection and swap UI. Non-IKEA URLs
 * (and absolute API asset URLs) are passed through unchanged.
 */
export function ikeaImageUrl(url: string, width = 1000): string {
  const absolute = getAssetUrl(url);
  if (!absolute.includes("ikea.com")) return absolute;

  try {
    const parsed = new URL(absolute);
    parsed.searchParams.set("imwidth", String(width));
    return parsed.toString();
  } catch {
    return absolute;
  }
}
