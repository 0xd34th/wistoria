import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Product } from "@workspace/api-client-react";

export interface SavedRedesign {
  id: string;
  createdAt: number;
  styleId: string;
  styleName: string;
  roomTypeId: string;
  roomName: string;
  originalImage: string; // base64
  redesignedImage: string; // base64
  products: Product[];
}

interface SavedRedesignsContextType {
  redesigns: SavedRedesign[];
  saveRedesign: (redesign: SavedRedesign) => Promise<void>;
  getRedesign: (id: string) => SavedRedesign | undefined;
  isLoading: boolean;
}

const SavedRedesignsContext = createContext<SavedRedesignsContextType | null>(null);

const STORAGE_KEY = "@roomlab_redesigns";

export function SavedRedesignsProvider({ children }: { children: ReactNode }) {
  const [redesigns, setRedesigns] = useState<SavedRedesign[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRedesigns();
  }, []);

  const loadRedesigns = async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        setRedesigns(JSON.parse(data));
      }
    } catch (e) {
      console.error("Failed to load redesigns", e);
    } finally {
      setIsLoading(false);
    }
  };

  const saveRedesign = async (redesign: SavedRedesign) => {
    const updated = [redesign, ...redesigns];
    // Update in-memory state first so the current session always works,
    // even if on-device persistence fails (e.g. storage quota on large images).
    setRedesigns(updated);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to persist redesign to device storage", e);
    }
  };

  const getRedesign = (id: string) => {
    return redesigns.find((r) => r.id === id);
  };

  return (
    <SavedRedesignsContext.Provider value={{ redesigns, saveRedesign, getRedesign, isLoading }}>
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
