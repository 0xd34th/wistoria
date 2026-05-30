import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Maximum redesigns (initial generations + regenerations) a Wistoria Pro
// subscriber can run per calendar day. Each generation calls OpenAI's
// gpt-image-2 edit endpoint, which costs real money (roughly $0.04-0.05 per
// run), so an uncapped "unlimited" plan could cost more than the subscription
// brings in. At ~$0.05/redesign, 5/day (up to ~150/month) keeps even a daily
// power user at roughly break-even worst case and highly profitable in normal
// use, while still feeling effectively unlimited.
export const PRO_DAILY_LIMIT = 5;

// Stores the current day's Pro usage as JSON: { date: "YYYY-MM-DD", count }.
// The count resets when the local calendar day changes.
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

  // If the stored count belongs to an earlier day, today's effective usage is 0.
  const today = todayKey();
  const proDailyUsed = date === today ? count : 0;
  const proDailyRemaining = Math.max(0, PRO_DAILY_LIMIT - proDailyUsed);

  const incrementProDaily = async () => {
    const current = todayKey();
    const base = date === current ? count : 0;
    const next = base + 1;
    // Persist durably BEFORE updating state, so an interrupted session cannot
    // lose the increment and hand out an extra paid redesign.
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
