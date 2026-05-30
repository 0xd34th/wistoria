import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Number of redesigns a non-subscriber can generate before hitting the paywall.
export const FREE_REDESIGN_LIMIT = 1;

// A monotonic counter of how many redesigns this device has generated. It only
// ever increases — deleting saved redesigns does NOT reset it, so the free quota
// cannot be farmed by clearing the gallery.
const FREE_USED_KEY = "@wistoria_free_redesigns_used";

interface FreeUsageContextType {
  freeUsed: number;
  freeRemaining: number;
  hasFreeRedesign: boolean;
  isLoaded: boolean;
  incrementFreeUsed: () => Promise<void>;
}

const FreeUsageContext = createContext<FreeUsageContextType | null>(null);

export function FreeUsageProvider({ children }: { children: ReactNode }) {
  const [freeUsed, setFreeUsed] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(FREE_USED_KEY)
      .then((value) => {
        const parsed = value ? parseInt(value, 10) : 0;
        setFreeUsed(Number.isFinite(parsed) ? parsed : 0);
      })
      .catch((e) => console.error("Failed to load free usage", e))
      .finally(() => setIsLoaded(true));
  }, []);

  const incrementFreeUsed = async () => {
    // Persist durably BEFORE updating state / navigating, so an interrupted
    // session cannot lose the increment and hand out an extra free redesign.
    const next = freeUsed + 1;
    await AsyncStorage.setItem(FREE_USED_KEY, String(next));
    setFreeUsed(next);
  };

  const freeRemaining = Math.max(0, FREE_REDESIGN_LIMIT - freeUsed);

  return (
    <FreeUsageContext.Provider
      value={{
        freeUsed,
        freeRemaining,
        hasFreeRedesign: freeRemaining > 0,
        isLoaded,
        incrementFreeUsed,
      }}
    >
      {children}
    </FreeUsageContext.Provider>
  );
}

export function useFreeUsage() {
  const context = useContext(FreeUsageContext);
  if (!context) {
    throw new Error("useFreeUsage must be used within a FreeUsageProvider");
  }
  return context;
}
