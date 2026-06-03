import { getLocales } from "expo-localization";

export function getMarket(): string {
  try {
    const locales = getLocales();
    const region = locales[0]?.regionCode ?? "";
    return region.toUpperCase() === "IN" ? "IN" : "US";
  } catch {
    return "US";
  }
}

export function isIndiaMarket(): boolean {
  return getMarket() === "IN";
}
