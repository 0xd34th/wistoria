import { getLocales } from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "@wistoria_market_override";

export type Market = "US" | "IN";

function detectMarket(): Market {
  try {
    const locales = getLocales();
    const region = locales[0]?.regionCode ?? "";
    return region.toUpperCase() === "IN" ? "IN" : "US";
  } catch {
    return "US";
  }
}

export async function getMarketAsync(): Promise<Market> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored === "IN" || stored === "US") return stored;
  } catch {
    // fall through to auto-detect
  }
  return detectMarket();
}

export async function setMarketOverride(market: Market): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, market);
}

export async function clearMarketOverride(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

export function useMarket() {
  const [market, setMarketState] = useState<Market>(detectMarket());
  const [isManual, setIsManual] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (!cancelled) {
          if (stored === "IN" || stored === "US") {
            setMarketState(stored);
            setIsManual(true);
          } else {
            setMarketState(detectMarket());
            setIsManual(false);
          }
          setIsLoaded(true);
        }
      } catch {
        if (!cancelled) setIsLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const setMarket = useCallback(async (m: Market) => {
    await setMarketOverride(m);
    setMarketState(m);
    setIsManual(true);
  }, []);

  const resetToAuto = useCallback(async () => {
    await clearMarketOverride();
    setMarketState(detectMarket());
    setIsManual(false);
  }, []);

  return { market, isManual, isLoaded, setMarket, resetToAuto };
}

// Sync helpers kept for backwards-compat in existing call sites
export function getMarket(): Market {
  return detectMarket();
}

export function isIndiaMarket(): boolean {
  return detectMarket() === "IN";
}
