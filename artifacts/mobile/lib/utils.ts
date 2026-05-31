export function getApiUrl(path: string): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  const clean = path.startsWith("/") ? path.slice(1) : path;
  if (!domain) return `/api/${clean}`;
  return `https://${domain}/api/${clean}`;
}

export function getAssetUrl(path: string): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;

  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (!domain) return path;

  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  return `https://${domain}/${cleanPath}`;
}

export function ikeaImageUrl(url: string, width = 1000): string {
  if (!url) return "";

  const absolute = getAssetUrl(url);
  if (!absolute.includes("ikea.com")) return absolute;

  const domain = process.env.EXPO_PUBLIC_DOMAIN;

  let sized: string;
  try {
    const parsed = new URL(absolute);
    parsed.searchParams.set("imwidth", String(width));
    sized = parsed.toString();
  } catch {
    sized = absolute;
  }

  if (!domain) return sized;
  return `https://${domain}/api/proxy/image?url=${encodeURIComponent(sized)}`;
}
