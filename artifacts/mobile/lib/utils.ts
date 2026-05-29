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
