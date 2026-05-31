import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const PRO_DAILY_LIMIT = 5;

const PRO_DAILY_KEY = "@wistoria_pro_daily_used";

function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

interface DailyUsageContextType {
  proDailyUsed: number;
  proDailyRemaining: number;
  hasProRedesignToday: boolean;
  isLoaded: boolean;
  incrementProDaily: () => Promise<void>;
}

const DailyUsageContext = createContext<DailyUsageContextType | null>(null);

export function DailyUsageProvider({ children }: { children: ReactNode }) {
  const [date, setDate] = useState<string>(todayKey());
  const [count, setCount] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(PRO_DAILY_KEY)
      .then((value) => {
        if (!value) return;
        try {
          const parsed = JSON.parse(value) as { date?: string; count?: number };
          if (typeof parsed.date === "string") setDate(parsed.date);
          if (typeof parsed.count === "number" && Number.isFinite(parsed.count)) {
            setCount(parsed.count);
          }
        } catch {
          // Ignore malformed values; treat as a fresh day.
        }
      })
      .catch((e) => console.error("Failed to load daily usage", e))
      .finally(() => setIsLoaded(true));
  }, []);

  const today = todayKey();
  const proDailyUsed = date === today ? count : 0;
  const proDailyRemaining = Math.max(0, PRO_DAILY_LIMIT - proDailyUsed);

  const incrementProDaily = async () => {
    const current = todayKey();
    const base = date === current ? count : 0;
    const next = base + 1;
    await AsyncStorage.setItem(
      PRO_DAILY_KEY,
      JSON.stringify({ date: current, count: next }),
    );
    setDate(current);
    setCount(next);
  };

  return (
    <DailyUsageContext.Provider
      value={{
        proDailyUsed,
        proDailyRemaining,
        hasProRedesignToday: proDailyRemaining > 0,
        isLoaded,
        incrementProDaily,
      }}
    >
      {children}
    </DailyUsageContext.Provider>
  );
}

export function useDailyUsage() {
  const context = useContext(DailyUsageContext);
  if (!context) {
    throw new Error("useDailyUsage must be used within a DailyUsageProvider");
  }
  return context;
}
