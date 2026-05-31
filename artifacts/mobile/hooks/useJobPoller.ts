import { useState, useEffect, useCallback, useRef } from "react";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiUrl } from "@/lib/utils";
import type { Redesign } from "@workspace/api-client-react";

interface PollOptions {
  storageKey: string;
  onDone: (redesign: Redesign) => void;
  onError: (message: string) => void;
}

export function useJobPoller({ storageKey, onDone, onError }: PollOptions) {
  const [isPolling, setIsPolling] = useState(false);
  const cancelRef = useRef(false);
  const activeRef = useRef(false);

  // Use refs for callbacks so poll() doesn't need them as dependencies
  const onDoneRef = useRef(onDone);
  const onErrorRef = useRef(onError);
  useEffect(() => { onDoneRef.current = onDone; });
  useEffect(() => { onErrorRef.current = onError; });

  const poll = useCallback(
    async (jobId: string) => {
      if (activeRef.current) return;
      activeRef.current = true;
      cancelRef.current = false;
      setIsPolling(true);

      try {
        while (!cancelRef.current) {
          try {
            const resp = await fetch(getApiUrl(`jobs/${jobId}`));
            if (resp.status === 404) {
              await AsyncStorage.removeItem(storageKey);
              onErrorRef.current("Redesign timed out. Please try again.");
              return;
            }
            if (resp.ok) {
              const data = (await resp.json()) as {
                status: "pending" | "done" | "failed";
                redesign?: Redesign;
                error?: string;
              };
              if (data.status === "done" && data.redesign) {
                await AsyncStorage.removeItem(storageKey);
                onDoneRef.current(data.redesign);
                return;
              }
              if (data.status === "failed") {
                await AsyncStorage.removeItem(storageKey);
                onErrorRef.current(data.error ?? "Generation failed. Please try again.");
                return;
              }
            }
          } catch {
            // network hiccup — keep retrying
          }
          await new Promise<void>((r) => setTimeout(r, 2000));
        }
      } finally {
        activeRef.current = false;
        setIsPolling(false);
      }
    },
    [storageKey],
  );

  const startJob = useCallback(
    async (jobId: string) => {
      await AsyncStorage.setItem(storageKey, jobId);
      poll(jobId);
    },
    [storageKey, poll],
  );

  const cancel = useCallback(async () => {
    cancelRef.current = true;
    await AsyncStorage.removeItem(storageKey);
  }, [storageKey]);

  // Recover persisted job on mount and when foregrounded
  useEffect(() => {
    let mounted = true;

    const tryRecover = async () => {
      if (!mounted || activeRef.current) return;
      const stored = await AsyncStorage.getItem(storageKey).catch(() => null);
      if (stored && mounted && !activeRef.current) {
        poll(stored);
      }
    };

    tryRecover();

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") tryRecover();
    });

    return () => {
      mounted = false;
      sub.remove();
    };
  }, [poll, storageKey]);

  return { startJob, isPolling, cancel };
}
