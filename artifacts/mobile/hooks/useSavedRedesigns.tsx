import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  useListRedesigns,
  getListRedesignsQueryKey,
  type Redesign,
} from "@workspace/api-client-react";
import { getDeviceId } from "@/lib/deviceId";

export type SavedRedesign = Redesign;

interface SavedRedesignsContextType {
  redesigns: Redesign[];
  getRedesign: (id: string) => Redesign | undefined;
  isLoading: boolean;
  deviceId: string | null;
}

const SavedRedesignsContext = createContext<SavedRedesignsContextType | null>(null);

export function SavedRedesignsProvider({ children }: { children: ReactNode }) {
  const [deviceId, setDeviceId] = useState<string | null>(null);

  useEffect(() => {
    getDeviceId()
      .then(setDeviceId)
      .catch((e) => console.error("Failed to load device id", e));
  }, []);

  const { data, isLoading } = useListRedesigns({
    query: { queryKey: getListRedesignsQueryKey() },
  });

  const redesigns = data ?? [];
  const getRedesign = (id: string) => redesigns.find((r) => r.id === id);

  return (
    <SavedRedesignsContext.Provider
      value={{
        redesigns,
        getRedesign,
        isLoading,
        deviceId,
      }}
    >
      {children}
    </SavedRedesignsContext.Provider>
  );
}

export function useSavedRedesigns() {
  const context = useContext(SavedRedesignsContext);
  if (!context) {
    throw new Error("useSavedRedesigns must be used within SavedRedesignsProvider");
  }
  return context;
}
