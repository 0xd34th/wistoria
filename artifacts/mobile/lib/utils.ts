export function getAssetUrl(path: string): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;

  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (!domain) return path;

  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  return `https://${domain}/${cleanPath}`;
}

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
