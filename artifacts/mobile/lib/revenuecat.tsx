import React, { createContext, useContext } from "react";
import { Platform } from "react-native";
import { useMutation, useQuery } from "@tanstack/react-query";
import Constants from "expo-constants";
import type {
  CustomerInfo,
  PurchasesOffering,
  PurchasesPackage,
} from "react-native-purchases";

const REVENUECAT_TEST_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY;
const REVENUECAT_IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
const REVENUECAT_ANDROID_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;

export const REVENUECAT_ENTITLEMENT_IDENTIFIER = "pro";

const isNative = Platform.OS === "ios" || Platform.OS === "android";

export function isRevenueCatTestMode() {
  return (
    __DEV__ ||
    Platform.OS === "web" ||
    Constants.executionEnvironment === "storeClient"
  );
}

function getRevenueCatApiKey() {
  if (!REVENUECAT_TEST_API_KEY || !REVENUECAT_IOS_API_KEY || !REVENUECAT_ANDROID_API_KEY) {
    throw new Error(
      "RevenueCat Public API Keys not found. Set EXPO_PUBLIC_REVENUECAT_TEST_API_KEY, EXPO_PUBLIC_REVENUECAT_IOS_API_KEY, and EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY.",
    );
  }

  if (isRevenueCatTestMode()) {
    return REVENUECAT_TEST_API_KEY;
  }

  if (Platform.OS === "ios") {
    return REVENUECAT_IOS_API_KEY;
  }

  if (Platform.OS === "android") {
    return REVENUECAT_ANDROID_API_KEY;
  }

  return REVENUECAT_TEST_API_KEY;
}

export function initializeRevenueCat() {
  if (!isNative) {
    console.log("[RevenueCat] Skipping init on web/non-native platform");
    return;
  }

  const apiKey = getRevenueCatApiKey();
  if (!apiKey) throw new Error("RevenueCat Public API Key not found");

  const RC = require("react-native-purchases").default;
  if (!RC || typeof RC.configure !== "function") {
    console.log("[RevenueCat] Native module not available");
    return;
  }

  if (RC.LOG_LEVEL) {
    RC.setLogLevel(RC.LOG_LEVEL.DEBUG);
  }
  RC.configure({ apiKey });
  console.log("[RevenueCat] Configured");
}

function useSubscriptionContext() {
  const customerInfoQuery = useQuery({
    queryKey: ["revenuecat", "customer-info"],
    queryFn: async (): Promise<CustomerInfo | null> => {
      if (!isNative) return null;
      const RC = require("react-native-purchases").default;
      if (!RC?.getCustomerInfo) return null;
      return RC.getCustomerInfo();
    },
    staleTime: 60 * 1000,
  });

  const offeringsQuery = useQuery({
    queryKey: ["revenuecat", "offerings"],
    queryFn: async () => {
      if (!isNative) return null;
      const RC = require("react-native-purchases").default;
      if (!RC?.getOfferings) return null;
      return RC.getOfferings();
    },
    staleTime: 300 * 1000,
  });

  const purchaseMutation = useMutation({
    mutationFn: async (packageToPurchase: PurchasesPackage) => {
      const RC = require("react-native-purchases").default;
      const { customerInfo } = await RC.purchasePackage(packageToPurchase);
      return customerInfo as CustomerInfo;
    },
    onSuccess: () => customerInfoQuery.refetch(),
  });

  const restoreMutation = useMutation({
    mutationFn: async () => {
      const RC = require("react-native-purchases").default;
      return RC.restorePurchases();
    },
    onSuccess: () => customerInfoQuery.refetch(),
  });

  const currentOffering: PurchasesOffering | null =
    (offeringsQuery.data as any)?.current ?? null;

  const monthlyPackage = currentOffering?.monthly ?? null;
  const annualPackage = currentOffering?.annual ?? null;

  const isSubscribed =
    (customerInfoQuery.data?.entitlements.active?.[REVENUECAT_ENTITLEMENT_IDENTIFIER]) !== undefined;

  return {
    customerInfo: customerInfoQuery.data as CustomerInfo | null | undefined,
    currentOffering,
    monthlyPackage,
    annualPackage,
    isSubscribed,
    isCustomerInfoLoading: customerInfoQuery.isLoading,
    isLoading: customerInfoQuery.isLoading || offeringsQuery.isLoading,
    purchase: purchaseMutation.mutateAsync,
    restore: restoreMutation.mutateAsync,
    isPurchasing: purchaseMutation.isPending,
    isRestoring: restoreMutation.isPending,
  };
}

type SubscriptionContextValue = ReturnType<typeof useSubscriptionContext>;
const Context = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const value = useSubscriptionContext();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useSubscription() {
  const ctx = useContext(Context);
  if (!ctx) {
    throw new Error("useSubscription must be used within a SubscriptionProvider");
  }
  return ctx;
}
