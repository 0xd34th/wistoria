import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { PurchasesPackage } from "react-native-purchases";

import { useColors } from "@/hooks/useColors";
import {
  useSubscription,
  isRevenueCatTestMode,
  REVENUECAT_ENTITLEMENT_IDENTIFIER,
} from "@/lib/revenuecat";
import { PRO_DAILY_LIMIT } from "@/hooks/useDailyUsage";

const BENEFITS = [
  `Up to ${PRO_DAILY_LIMIT} room redesigns every day`,
  "Every design style, unlocked",
  "Swap, add, and curate real IKEA pieces",
  "Full-resolution downloads to save and share",
];

function monthlyEquivalent(annual: PurchasesPackage): string | null {
  const price = annual.product.price;
  const currency = annual.product.currencyCode;
  if (!price || price <= 0) return null;
  const perMonth = price / 12;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "USD",
    }).format(perMonth);
  } catch {
    return null;
  }
}

function savingsPercent(
  monthly: PurchasesPackage | null,
  annual: PurchasesPackage | null,
): number | null {
  if (!monthly || !annual) return null;
  const monthlyYearly = monthly.product.price * 12;
  const annualPrice = annual.product.price;
  if (!monthlyYearly || !annualPrice || monthlyYearly <= 0) return null;
  const pct = Math.round((1 - annualPrice / monthlyYearly) * 100);
  return pct > 0 ? pct : null;
}

export function Paywall({
  visible,
  onClose,
  onPurchased,
}: {
  visible: boolean;
  onClose: () => void;
  onPurchased?: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    monthlyPackage,
    annualPackage,
    purchase,
    restore,
    isPurchasing,
    isRestoring,
    isLoading,
  } = useSubscription();

  const [selected, setSelected] = useState<"annual" | "monthly">("annual");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<PurchasesPackage | null>(null);

  const packages: { key: "annual" | "monthly"; pkg: PurchasesPackage }[] = [];
  if (annualPackage) packages.push({ key: "annual", pkg: annualPackage });
  if (monthlyPackage) packages.push({ key: "monthly", pkg: monthlyPackage });

  const selectedPackage =
    selected === "annual" ? annualPackage : monthlyPackage;

  const savings = savingsPercent(monthlyPackage, annualPackage);

  const runPurchase = async (pkg: PurchasesPackage) => {
    setErrorMessage(null);
    try {
      await purchase(pkg);
      onPurchased?.();
      onClose();
    } catch (e: unknown) {
      const err = e as { userCancelled?: boolean; message?: string };
      if (err?.userCancelled) return;
      setErrorMessage(err?.message ?? "Purchase failed. Please try again.");
    }
  };

  const handleContinue = () => {
    if (!selectedPackage) return;
    if (isRevenueCatTestMode()) {
      setPendingConfirm(selectedPackage);
      return;
    }
    runPurchase(selectedPackage);
  };

  const handleRestore = async () => {
    setErrorMessage(null);
    try {
      const info = await restore();
      if (info.entitlements.active?.[REVENUECAT_ENTITLEMENT_IDENTIFIER]) {
        onPurchased?.();
        onClose();
      } else {
        setErrorMessage("No previous purchases found to restore.");
      }
    } catch (e: unknown) {
      const err = e as { message?: string };
      setErrorMessage(err?.message ?? "Restore failed. Please try again.");
    }
  };

  const busy = isPurchasing || isRestoring;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 8 }]}>
        <View style={styles.topBar}>
          <Pressable onPress={onClose} hitSlop={12} style={styles.closeButton} disabled={busy}>
            <Feather name="x" size={26} color={colors.foreground} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.badge, { backgroundColor: colors.primary }]}>
            <Feather name="zap" size={14} color={colors.primaryForeground} />
            <Text style={[styles.badgeText, { color: colors.primaryForeground }]}>WISTORIA PRO</Text>
          </View>

          <Text style={[styles.title, { color: colors.foreground }]}>
            Redesign your space, every day.
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Go Pro to keep reimagining your space with real, shoppable IKEA furniture.
          </Text>

          <View style={styles.benefits}>
            {BENEFITS.map((b) => (
              <View key={b} style={styles.benefitRow}>
                <View style={[styles.benefitIcon, { backgroundColor: colors.secondary }]}>
                  <Feather name="check" size={14} color={colors.secondaryForeground} />
                </View>
                <Text style={[styles.benefitText, { color: colors.foreground }]}>{b}</Text>
              </View>
            ))}
          </View>

          {isLoading && packages.length === 0 ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
          ) : packages.length === 0 ? (
            <View style={[styles.noPlans, { borderColor: colors.border }]}>
              <Text style={[styles.noPlansText, { color: colors.mutedForeground }]}>
                Subscription plans aren't available in this preview. They activate once the app is
                published to the App Store or Google Play.
              </Text>
            </View>
          ) : (
            <View style={styles.plans}>
              {packages.map(({ key, pkg }) => {
                const isActive = selected === key;
                const isAnnual = key === "annual";
                const perMonth = isAnnual ? monthlyEquivalent(pkg) : null;
                return (
                  <Pressable
                    key={key}
                    onPress={() => setSelected(key)}
                    style={[
                      styles.planCard,
                      { backgroundColor: colors.card, borderColor: colors.border },
                      isActive && { borderColor: colors.primary, borderWidth: 2 },
                    ]}
                  >
                    <View style={styles.planLeft}>
                      <View
                        style={[
                          styles.radio,
                          { borderColor: isActive ? colors.primary : colors.border },
                        ]}
                      >
                        {isActive && <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />}
                      </View>
                      <View>
                        <Text style={[styles.planName, { color: colors.foreground }]}>
                          {isAnnual ? "Annual" : "Monthly"}
                        </Text>
                        <Text style={[styles.planMeta, { color: colors.mutedForeground }]}>
                          {isAnnual
                            ? perMonth
                              ? `${perMonth} / month, billed yearly`
                              : "Billed yearly"
                            : "Billed monthly"}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.planRight}>
                      {isAnnual && savings ? (
                        <View style={[styles.savePill, { backgroundColor: colors.secondary }]}>
                          <Text style={[styles.savePillText, { color: colors.secondaryForeground }]}>
                            SAVE {savings}%
                          </Text>
                        </View>
                      ) : null}
                      <Text style={[styles.planPrice, { color: colors.foreground }]}>
                        {pkg.product.priceString}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

          {errorMessage ? (
            <Text style={[styles.errorText, { color: colors.destructive }]}>{errorMessage}</Text>
          ) : null}

          {packages.length > 0 && (
            <Pressable
              onPress={handleContinue}
              disabled={busy || !selectedPackage}
              style={({ pressed }) => [
                styles.cta,
                { backgroundColor: colors.primary },
                (busy || !selectedPackage) && { opacity: 0.5 },
                pressed && { transform: [{ scale: 0.98 }] },
              ]}
            >
              {isPurchasing ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <Text style={[styles.ctaText, { color: colors.primaryForeground }]}>
                  Start Wistoria Pro
                </Text>
              )}
            </Pressable>
          )}

          <Pressable onPress={handleRestore} disabled={busy} style={styles.restoreBtn}>
            {isRestoring ? (
              <ActivityIndicator color={colors.mutedForeground} size="small" />
            ) : (
              <Text style={[styles.restoreText, { color: colors.mutedForeground }]}>
                Restore purchases
              </Text>
            )}
          </Pressable>

          <Text style={[styles.fineprint, { color: colors.mutedForeground }]}>
            Subscriptions renew automatically until cancelled. Manage or cancel anytime in your
            App Store or Google Play account settings.
          </Text>
        </ScrollView>

        {pendingConfirm && (
          <View style={styles.confirmOverlay}>
            <View style={[styles.confirmCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.confirmTitle, { color: colors.foreground }]}>
                Confirm test purchase
              </Text>
              <Text style={[styles.confirmBody, { color: colors.mutedForeground }]}>
                This is a simulated purchase of {pendingConfirm.product.priceString} (
                {pendingConfirm.packageType.toLowerCase()}). No real charge will be made.
              </Text>
              <View style={styles.confirmActions}>
                <Pressable
                  onPress={() => setPendingConfirm(null)}
                  style={[styles.confirmBtn, { backgroundColor: colors.muted }]}
                >
                  <Text style={[styles.confirmBtnText, { color: colors.foreground }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    const pkg = pendingConfirm;
                    setPendingConfirm(null);
                    runPurchase(pkg);
                  }}
                  style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
                >
                  <Text style={[styles.confirmBtnText, { color: colors.primaryForeground }]}>
                    Confirm
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  badge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    marginBottom: 20,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  title: {
    fontSize: 30,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
    lineHeight: 36,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    lineHeight: 24,
    marginBottom: 28,
  },
  benefits: {
    gap: 16,
    marginBottom: 32,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  benefitIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  benefitText: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  plans: {
    gap: 14,
  },
  planCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
  },
  planLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  planName: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  planMeta: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  planRight: {
    alignItems: "flex-end",
    gap: 6,
  },
  savePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
  },
  savePillText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  planPrice: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  noPlans: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
  },
  noPlansText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
    textAlign: "center",
  },
  errorText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    marginTop: 20,
    textAlign: "center",
  },
  cta: {
    marginTop: 28,
    paddingVertical: 18,
    borderRadius: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
  },
  restoreBtn: {
    marginTop: 18,
    alignItems: "center",
    paddingVertical: 6,
  },
  restoreText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  fineprint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
    textAlign: "center",
    marginTop: 20,
  },
  confirmOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  confirmCard: {
    width: "100%",
    borderRadius: 20,
    padding: 24,
  },
  confirmTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    marginBottom: 10,
  },
  confirmBody: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
    marginBottom: 24,
  },
  confirmActions: {
    flexDirection: "row",
    gap: 12,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 100,
    alignItems: "center",
  },
  confirmBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
});
