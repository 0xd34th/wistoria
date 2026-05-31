import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from "expo-application";

const DEVICE_ID_KEY = "@wistoria_device_id";
const COOKIE_NAME = "wistoria_device_id";

function generateId(): string {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 10)
  );
}

function getCookieId(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(COOKIE_NAME + "="));
  return match ? match.split("=")[1] : null;
}

function setCookieId(id: string) {
  if (typeof document === "undefined") return;
  // 10-year expiry — as permanent as a cookie can get
  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 10);
  document.cookie = `${COOKIE_NAME}=${id}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
}

export async function getDeviceId(): Promise<string> {
  // iOS: stable per-vendor ID (persists across reinstalls until all apps from
  // the same vendor are removed)
  if (Platform.OS === "ios") {
    const vendorId = await Application.getIosIdForVendorAsync();
    if (vendorId) return vendorId;
  }

  // Android: stable ID tied to the app installation signing key
  if (Platform.OS === "android") {
    const androidId = Application.getAndroidId();
    if (androidId) return androidId;
  }

  // Web: cookies survive browser sessions and cross-tab; localStorage does not
  // reliably survive Replit's production hosting across deployments.
  if (Platform.OS === "web") {
    const fromCookie = getCookieId();
    if (fromCookie) return fromCookie;
    const id = generateId();
    setCookieId(id);
    // Also persist in AsyncStorage (localStorage) as a fallback
    await AsyncStorage.setItem(DEVICE_ID_KEY, id).catch(() => {});
    return id;
  }

  // Final fallback: AsyncStorage (covers emulators and edge cases)
  const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;
  const id = generateId();
  await AsyncStorage.setItem(DEVICE_ID_KEY, id);
  return id;
}
