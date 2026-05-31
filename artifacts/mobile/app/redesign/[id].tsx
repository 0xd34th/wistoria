import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Image,
  Dimensions,
  Modal,
  ActivityIndicator,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";
import * as WebBrowser from "expo-web-browser";
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useQueryClient } from "@tanstack/react-query";

import { useColors } from "@/hooks/useColors";
import { useSavedRedesigns } from "@/hooks/useSavedRedesigns";
import { useFreeUsage } from "@/hooks/useFreeUsage";
import { useDailyUsage, PRO_DAILY_LIMIT } from "@/hooks/useDailyUsage";
import { useSubscription } from "@/lib/revenuecat";
import { Paywall } from "@/components/Paywall";
import { ikeaImageUrl } from "@/lib/utils";
import { useJobPoller } from "@/hooks/useJobPoller";
import { ZoomableImageModal } from "@/components/ZoomableImageModal";
import {
  useListProducts,
  getListProductsQueryKey,
  useRegenerateRedesign,
  getListRedesignsQueryKey,
  type Product,
  type Redesign,
} from "@workspace/api-client-react";

const { width } = Dimensions.get("window");

function ProductThumb({
  imageUrl,
  size,
  style,
  colors,
}: {
  imageUrl: string;
  size: "card" | "thumb";
  style?: object;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  const [error, setError] = useState(false);
  if (error || !imageUrl) {
    return (
      <View
        style={[
          style,
          {
            backgroundColor: colors.muted,
            alignItems: "center",
            justifyContent: "center",
          },
        ]}
      >
        <Feather
          name="image"
          size={size === "card" ? 28 : 20}
          color={colors.mutedForeground}
        />
      </View>
    );
  }
  return (
    <ExpoImage
      source={{ uri: ikeaImageUrl(imageUrl, size === "card" ? 1000 : 200) }}
      style={style}
      contentFit="cover"
      transition={150}
      onError={() => setError(true)}
    />
  );
}

const formatPrice = (price: number) => `$${price.toFixed(2)}`;

const humanizeRole = (role: string) =>
  role
    .split("-")
    .map((w) => (w.length ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(" ");

export default function RedesignResultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { getRedesign, deviceId } = useSavedRedesigns();
  const queryClient = useQueryClient();
  const { mutateAsync: regenerate, isPending: isRegenMutating } = useRegenerateRedesign();
  const { isSubscribed, isCustomerInfoLoading } = useSubscription();
  const { hasFreeRedesign, incrementFreeUsed, isLoaded: isFreeUsageLoaded } = useFreeUsage();
  const { hasProRedesignToday, incrementProDaily, isLoaded: isDailyLoaded } = useDailyUsage();

  const isAccessReady = !isCustomerInfoLoading && isFreeUsageLoaded && isDailyLoaded;

  const redesign = getRedesign(id);

  const [showOriginal, setShowOriginal] = useState(false);
  const [workingProducts, setWorkingProducts] = useState<Product[]>(() => redesign?.products ?? []);
  const [swapIndex, setSwapIndex] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [swapGroup, setSwapGroup] = useState<string | null>(null);
  const [swapRole, setSwapRole] = useState<string | null>(null);
  const [swapSearch, setSwapSearch] = useState("");
  const [zoomVisible, setZoomVisible] = useState(false);
  const [downloadState, setDownloadState] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [showPaywall, setShowPaywall] = useState(false);
  const [dailyLimitHit, setDailyLimitHit] = useState(false);

  const onRegenDone = useCallback(
    async (updated: Redesign) => {
      if (isSubscribed) {
        await incrementProDaily();
      } else {
        await incrementFreeUsed();
      }
      const listKey = getListRedesignsQueryKey();
      queryClient.setQueryData<Redesign[]>(listKey, (prev) =>
        prev ? prev.map((r) => (r.id === updated.id ? updated : r)) : [updated],
      );
      queryClient.invalidateQueries({ queryKey: listKey });
      setWorkingProducts(updated.products);
      setShowOriginal(false);
    },
    [isSubscribed, incrementProDaily, incrementFreeUsed, deviceId, queryClient],
  );

  const onRegenError = useCallback((message: string) => {
    console.error("Regeneration failed:", message);
  }, []);

  const { startJob: startRegenJob, isPolling: isRegenPolling } = useJobPoller({
    storageKey: `@wistoria_pending_regen_job_${id}`,
    onDone: onRegenDone,
    onError: onRegenError,
  });

  const isRegenerating = isRegenMutating || isRegenPolling;

  const roomTypeId = redesign?.roomTypeId ?? "";
  const productsParams = { roomTypeId };
  const { data: eligibleProducts, isLoading: isLoadingAlternatives } = useListProducts(productsParams, {
    query: { enabled: !!roomTypeId, queryKey: getListProductsQueryKey(productsParams) },
  });

  const swapTarget = swapIndex !== null ? workingProducts[swapIndex] : null;

  const swapGroups = useMemo(() => {
    const groups = Array.from(new Set((eligibleProducts ?? []).map((p) => p.group)));
    groups.sort((a, b) => a.localeCompare(b));
    if (swapTarget && groups.includes(swapTarget.group)) {
      return [swapTarget.group, ...groups.filter((g) => g !== swapTarget.group)];
    }
    return groups;
  }, [eligibleProducts, swapTarget]);

  const swapRoles = useMemo(() => {
    if (!swapGroup) return [];
    const roles = Array.from(
      new Set((eligibleProducts ?? []).filter((p) => p.group === swapGroup).map((p) => p.role)),
    );
    roles.sort((a, b) => humanizeRole(a).localeCompare(humanizeRole(b)));
    if (swapTarget && swapTarget.group === swapGroup && roles.includes(swapTarget.role)) {
      return [swapTarget.role, ...roles.filter((r) => r !== swapTarget.role)];
    }
    return roles;
  }, [eligibleProducts, swapGroup, swapTarget]);

  const filteredAlternatives = useMemo(() => {
    const q = swapSearch.trim().toLowerCase();
    return (eligibleProducts ?? []).filter((p) => {
      // When a specific role is chosen, role wins — ignore group so all
      // 210 rugs (or whatever role) show up regardless of which group chip
      // was used to navigate to that role.
      const matchesGroup = swapRole ? true : !swapGroup || p.group === swapGroup;
      const matchesRole = !swapRole || p.role === swapRole;
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q);
      return matchesGroup && matchesRole && matchesSearch;
    });
  }, [eligibleProducts, swapGroup, swapRole, swapSearch]);

  const openSwap = (index: number) => {
    setIsAdding(false);
    setSwapGroup(workingProducts[index]?.group ?? null);
    setSwapRole(workingProducts[index]?.role ?? null);
    setSwapSearch("");
    setSwapIndex(index);
  };

  const openAdd = () => {
    setSwapIndex(null);
    setSwapGroup(null);
    setSwapRole(null);
    setSwapSearch("");
    setIsAdding(true);
  };

  const closePicker = () => {
    setSwapIndex(null);
    setIsAdding(false);
  };

  const selectSwapGroup = (group: string | null) => {
    setSwapGroup(group);
    setSwapRole(null);
  };

  useEffect(() => {
    if (redesign) setWorkingProducts(redesign.products);
  }, [id, redesign?.redesignedImage]);

  if (!redesign) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.mutedForeground }]}>Design not found.</Text>
        <Pressable
          style={[styles.backButton, { marginTop: 24, backgroundColor: colors.card }]}
          onPress={() => router.replace("/")}
        >
          <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold" }}>Back to Studio</Text>
        </Pressable>
      </View>
    );
  }

  const openBuyLink = async (product: Product) => {
    const q = encodeURIComponent(`${product.name} ${product.color}`);
    const searchUrl = `https://www.ikea.com/us/en/search/products/?q=${q}`;
    try {
      await WebBrowser.openBrowserAsync(searchUrl);
    } catch (e) {
      console.error("Failed to open link", e);
    }
  };

  const handleDownload = async () => {
    if (!redesign || downloadState === "saving") return;
    const base64 = showOriginal ? redesign.originalImage : redesign.redesignedImage;
    if (!base64) return;
    setDownloadState("saving");
    try {
      if (Platform.OS === "web") {
        const doc = (globalThis as { document?: Document }).document;
        if (!doc) throw new Error("No document available");
        const link = doc.createElement("a");
        link.href = `data:image/png;base64,${base64}`;
        link.download = `wistoria-${redesign.id}.png`;
        doc.body.appendChild(link);
        link.click();
        doc.body.removeChild(link);
      } else {
        const perm = await MediaLibrary.requestPermissionsAsync(true);
        if (!perm.granted) {
          setDownloadState("error");
          setTimeout(() => setDownloadState("idle"), 2500);
          return;
        }
        const fileUri = `${FileSystem.cacheDirectory}wistoria-${redesign.id}.png`;
        await FileSystem.writeAsStringAsync(fileUri, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        await MediaLibrary.saveToLibraryAsync(fileUri);
      }
      setDownloadState("done");
      setTimeout(() => setDownloadState("idle"), 2500);
    } catch (e) {
      console.error("Failed to save image", e);
      setDownloadState("error");
      setTimeout(() => setDownloadState("idle"), 2500);
    }
  };

  const removeProduct = (productId: string) => {
    setWorkingProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  const chooseAlternative = (product: Product) => {
    if (isAdding) {
      setWorkingProducts((prev) =>
        prev.some((p) => p.id === product.id) ? prev : [...prev, product],
      );
      closePicker();
      return;
    }
    if (swapIndex === null) return;
    setWorkingProducts((prev) => {
      const next = [...prev];
      const existingIdx = next.findIndex((p) => p.id === product.id);
      next[swapIndex] = product;
      if (existingIdx !== -1 && existingIdx !== swapIndex) {
        next.splice(existingIdx, 1);
      }
      return next;
    });
    closePicker();
  };

  const savedIds = redesign.products.map((p) => p.id).join(",");
  const workingIds = workingProducts.map((p) => p.id).join(",");
  const isDirty = savedIds !== workingIds;
  const canRegenerate = isDirty && workingProducts.length > 0 && !!deviceId && !isRegenerating && isAccessReady;

  const handleRegenerate = async () => {
    if (!deviceId || workingProducts.length === 0) return;
    if (!isAccessReady) return;

    // TESTING: paywall and daily limit disabled
    // if (!isSubscribed && !hasFreeRedesign) {
    //   setShowPaywall(true);
    //   return;
    // }
    // if (isSubscribed && !hasProRedesignToday) {
    //   setDailyLimitHit(true);
    //   return;
    // }

    try {
      const { jobId } = await regenerate({
        id,
        data: { deviceId, isSubscribed, productIds: workingProducts.map((p) => p.id) },
      });
      await startRegenJob(jobId);
    } catch (e) {
      console.error("Failed to start regeneration", e);
    }
  };

  if (isRegenerating) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background, padding: 32 }]}>
        <Animated.View entering={FadeIn.duration(500)} style={{ alignItems: "center" }}>
          <View style={[styles.regenIconWrap, { backgroundColor: colors.accent }]}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
          <Text style={[styles.regenTitle, { color: colors.foreground }]}>Reimagining your space...</Text>
          <Text style={[styles.regenSubtitle, { color: colors.mutedForeground }]}>
            We're regenerating the room with your curated pieces. This takes about a minute.
          </Text>
        </Animated.View>
      </View>
    );
  }

  const currentImageUri = `data:image/png;base64,${showOriginal ? redesign.originalImage : redesign.redesignedImage}`;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Paywall
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        onPurchased={() => setShowPaywall(false)}
      />
      <ZoomableImageModal
        visible={zoomVisible}
        uri={currentImageUri}
        onClose={() => setZoomVisible(false)}
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: (insets.bottom || 24) + (isDirty ? 110 : 24) }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.imageSection}>
          <View style={[styles.navRow, { paddingTop: insets.top + 16 }]}>
            <Pressable onPress={() => router.replace("/")} style={styles.navButton}>
              <Feather name="arrow-left" size={24} color="#ffffff" />
            </Pressable>
            <View style={styles.navActions}>
              <Pressable onPress={() => setZoomVisible(true)} style={styles.navButton}>
                <Feather name="maximize-2" size={20} color="#ffffff" />
              </Pressable>
              <Pressable
                onPress={handleDownload}
                style={styles.navButton}
                disabled={downloadState === "saving"}
              >
                {downloadState === "saving" ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Feather
                    name={
                      downloadState === "done"
                        ? "check"
                        : downloadState === "error"
                          ? "alert-circle"
                          : "download"
                    }
                    size={20}
                    color="#ffffff"
                  />
                )}
              </Pressable>
            </View>
          </View>

          <Image
            source={{ uri: currentImageUri }}
            style={styles.mainImage}
            resizeMode="cover"
          />

          <View style={styles.toggleContainer}>
            <Pressable
              style={[
                styles.toggleButton,
                showOriginal ? { backgroundColor: colors.primary } : { backgroundColor: "rgba(0,0,0,0.5)" },
              ]}
              onPress={() => setShowOriginal(true)}
            >
              <Text style={[styles.toggleText, showOriginal ? { color: colors.primaryForeground } : { color: "#ffffff" }]}>
                Canvas
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.toggleButton,
                !showOriginal ? { backgroundColor: colors.primary } : { backgroundColor: "rgba(0,0,0,0.5)" },
              ]}
              onPress={() => setShowOriginal(false)}
            >
              <Text style={[styles.toggleText, !showOriginal ? { color: colors.primaryForeground } : { color: "#ffffff" }]}>
                Curated
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.contentSection}>
          <Animated.View entering={FadeInDown.delay(100)}>
            <Text style={[styles.title, { color: colors.foreground }]}>{redesign.styleName} Studio</Text>
            <Text style={[styles.date, { color: colors.mutedForeground }]}>
              {redesign.roomName ? `${redesign.roomName} · ` : ""}
              {new Date(redesign.createdAt).toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </Text>
          </Animated.View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <Animated.View entering={FadeInDown.delay(200)}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>The Collection</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>
              These are the pieces the AI placed in your room. Remove any you don't want, or swap
              one for an alternative, then regenerate.
            </Text>

            <View style={[styles.scaleNotice, { backgroundColor: colors.muted, borderRadius: colors.radius }]}>
              <Feather name="alert-circle" size={13} color={colors.mutedForeground} />
              <Text style={[styles.scaleNoticeText, { color: colors.mutedForeground }]}>
                Items may not be rendered exactly to scale. Always verify measurements before purchasing.
              </Text>
            </View>

            {workingProducts.length === 0 && (
              <Text style={[styles.emptyHint, { color: colors.destructive }]}>
                Add at least one piece back to regenerate your room.
              </Text>
            )}

            <Pressable
              style={({ pressed }) => [
                styles.addPieceButton,
                { borderColor: colors.primary, borderRadius: colors.radius },
                pressed && { opacity: 0.6 },
              ]}
              onPress={openAdd}
            >
              <Feather name="plus" size={18} color={colors.primary} />
              <Text style={[styles.addPieceText, { color: colors.primary }]}>Add a piece</Text>
            </Pressable>

            <View style={styles.productsList}>
              {workingProducts.map((product, index) => (
                <View
                  key={product.id}
                  style={[
                    styles.productCard,
                    { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius },
                  ]}
                >
                  <Pressable
                    style={({ pressed }) => [pressed && { opacity: 0.9 }]}
                    onPress={() => openBuyLink(product)}
                  >
                    <ProductThumb
                      imageUrl={product.imageUrl}
                      size="card"
                      style={[
                        styles.productImage,
                        { borderTopLeftRadius: colors.radius, borderTopRightRadius: colors.radius },
                      ]}
                      colors={colors}
                    />
                    <View style={styles.productInfo}>
                      <View style={styles.ikeaBadge}>
                        <Text style={styles.ikeaBadgeText}>IKEA</Text>
                      </View>
                      <View style={styles.productHeader}>
                        <Text style={[styles.productName, { color: colors.foreground }]} numberOfLines={1}>
                          {product.name}
                        </Text>
                        <Text style={[styles.productPrice, { color: colors.foreground }]}>
                          {formatPrice(product.price)}
                        </Text>
                      </View>
                      <Text style={[styles.productCategory, { color: colors.mutedForeground }]}>
                        {product.category} • {product.color}
                      </Text>
                      <View style={styles.buyLink}>
                        <Text style={[styles.buyText, { color: colors.primary }]}>View on IKEA</Text>
                        <Feather name="arrow-up-right" size={14} color={colors.primary} />
                      </View>
                    </View>
                  </Pressable>

                  <View style={[styles.cardActions, { borderTopColor: colors.border }]}>
                    <Pressable
                      style={({ pressed }) => [styles.cardAction, pressed && { opacity: 0.6 }]}
                      onPress={() => openSwap(index)}
                    >
                      <Feather name="repeat" size={18} color={colors.primary} />
                      <Text style={[styles.cardActionText, { color: colors.primary }]}>Swap</Text>
                    </Pressable>
                    <View style={[styles.actionSeparator, { backgroundColor: colors.border }]} />
                    <Pressable
                      style={({ pressed }) => [styles.cardAction, pressed && { opacity: 0.6 }]}
                      onPress={() => removeProduct(product.id)}
                    >
                      <Feather name="trash-2" size={18} color={colors.mutedForeground} />
                      <Text style={[styles.cardActionText, { color: colors.mutedForeground }]}>Remove</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          </Animated.View>
        </View>
      </ScrollView>

      {isDirty && (
        <Animated.View
          entering={FadeInDown}
          style={[
            styles.footer,
            { paddingBottom: insets.bottom || 24, borderTopColor: colors.border, backgroundColor: colors.card },
          ]}
        >
          {dailyLimitHit && (
            <View style={styles.dailyNotice}>
              <Feather name="clock" size={16} color={colors.primary} />
              <Text style={[styles.dailyNoticeText, { color: colors.primary }]}>
                You've used all {PRO_DAILY_LIMIT} Pro redesigns for today. Your limit resets tomorrow.
              </Text>
            </View>
          )}
          <Pressable
            style={({ pressed }) => [
              styles.regenButton,
              { backgroundColor: colors.primary },
              !canRegenerate && { opacity: 0.4 },
              pressed && canRegenerate && { transform: [{ scale: 0.98 }] },
            ]}
            disabled={!canRegenerate}
            onPress={handleRegenerate}
          >
            <Feather name="refresh-cw" size={18} color={colors.primaryForeground} />
            <Text style={[styles.regenButtonText, { color: colors.primaryForeground }]}>
              Regenerate room
            </Text>
          </Pressable>
        </Animated.View>
      )}

      <Modal
        visible={swapIndex !== null || isAdding}
        animationType="slide"
        transparent
        onRequestClose={closePicker}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View
            style={[
              styles.modalSheet,
              { backgroundColor: colors.background, paddingBottom: insets.bottom || 24 },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                  {isAdding ? "Add a piece" : "Swap this piece"}
                </Text>
                <Text style={[styles.modalSubtitle, { color: colors.mutedForeground }]}>
                  {swapTarget
                    ? `Showing ${(swapRole ? humanizeRole(swapRole) : swapGroup ?? "all").toLowerCase()} options. Pick a category or search.`
                    : "Pick a category or search for a piece."}
                </Text>
              </View>
              <Pressable
                onPress={closePicker}
                style={[styles.modalClose, { backgroundColor: colors.muted }]}
              >
                <Feather name="x" size={20} color={colors.foreground} />
              </Pressable>
            </View>

            <View style={[styles.searchBar, { backgroundColor: colors.muted, borderRadius: colors.radius }]}>
              <Feather name="search" size={16} color={colors.mutedForeground} />
              <TextInput
                value={swapSearch}
                onChangeText={setSwapSearch}
                placeholder="Search pieces"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.searchInput, { color: colors.foreground }]}
                autoCorrect={false}
              />
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
              style={styles.chipScroll}
            >
              <Pressable
                onPress={() => selectSwapGroup(null)}
                style={[
                  styles.chip,
                  { borderRadius: 100 },
                  !swapGroup
                    ? { backgroundColor: colors.primary, borderColor: colors.primary }
                    : { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: !swapGroup ? colors.primaryForeground : colors.foreground },
                  ]}
                >
                  All
                </Text>
              </Pressable>
              {swapGroups.map((group) => (
                <Pressable
                  key={group}
                  onPress={() => selectSwapGroup(group)}
                  style={[
                    styles.chip,
                    { borderRadius: 100 },
                    swapGroup === group
                      ? { backgroundColor: colors.primary, borderColor: colors.primary }
                      : { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: swapGroup === group ? colors.primaryForeground : colors.foreground },
                    ]}
                  >
                    {group}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {swapGroup && swapRoles.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipRow}
                style={styles.subChipScroll}
              >
                <Pressable
                  onPress={() => setSwapRole(null)}
                  style={[
                    styles.subChip,
                    { borderRadius: 100 },
                    !swapRole
                      ? { backgroundColor: colors.secondary, borderColor: colors.secondary }
                      : { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  <Text
                    style={[
                      styles.subChipText,
                      { color: !swapRole ? colors.secondaryForeground : colors.mutedForeground },
                    ]}
                  >
                    All {swapGroup}
                  </Text>
                </Pressable>
                {swapRoles.map((role) => (
                  <Pressable
                    key={role}
                    onPress={() => setSwapRole(role)}
                    style={[
                      styles.subChip,
                      { borderRadius: 100 },
                      swapRole === role
                        ? { backgroundColor: colors.secondary, borderColor: colors.secondary }
                        : { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                  >
                    <Text
                      style={[
                        styles.subChipText,
                        { color: swapRole === role ? colors.secondaryForeground : colors.mutedForeground },
                      ]}
                    >
                      {humanizeRole(role)}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}

            {isLoadingAlternatives ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
            ) : filteredAlternatives.length === 0 ? (
              <Text style={[styles.modalEmpty, { color: colors.mutedForeground }]}>
                No pieces found. Try a different filter or search.
              </Text>
            ) : (
              <FlatList
                data={filteredAlternatives}
                keyExtractor={(item) => item.id}
                keyboardShouldPersistTaps="handled"
                style={{ flex: 1 }}
                renderItem={({ item: product }) => {
                  const isInCollection = workingProducts.some((p) => p.id === product.id);
                  return (
                    <View
                      style={[
                        styles.altRow,
                        { borderColor: colors.border, borderRadius: colors.radius },
                        isInCollection && { borderColor: colors.primary },
                      ]}
                    >
                      <ProductThumb
                        imageUrl={product.imageUrl}
                        size="thumb"
                        style={styles.altImage}
                        colors={colors}
                      />
                      <View style={styles.altInfo}>
                        <Text style={[styles.altName, { color: colors.foreground }]} numberOfLines={1}>
                          {product.name}
                        </Text>
                        <Text style={[styles.altMeta, { color: colors.mutedForeground }]} numberOfLines={1}>
                          {product.category} • {product.color}
                        </Text>
                        <Text style={[styles.altPrice, { color: colors.foreground }]}>
                          {formatPrice(product.price)}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => chooseAlternative(product)}
                        disabled={!isAdding && isInCollection}
                        style={({ pressed }) => [
                          styles.altBadge,
                          {
                            backgroundColor: isInCollection
                              ? colors.secondary
                              : colors.primary,
                          },
                          pressed && { opacity: 0.8 },
                        ]}
                      >
                        <Text
                          style={[
                            styles.altBadgeText,
                            {
                              color: isInCollection
                                ? colors.secondaryForeground
                                : colors.primaryForeground,
                            },
                          ]}
                        >
                          {isInCollection ? "In collection" : isAdding ? "Add" : "Swap"}
                        </Text>
                      </Pressable>
                    </View>
                  );
                }}
              />
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { alignItems: "center", justifyContent: "center" },
  imageSection: { position: "relative" },
  navRow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    zIndex: 10,
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  navActions: { flexDirection: "row", gap: 10 },
  mainImage: { width, height: width * 0.9 },
  toggleContainer: {
    position: "absolute",
    bottom: 16,
    alignSelf: "center",
    flexDirection: "row",
    borderRadius: 100,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  toggleButton: { paddingHorizontal: 20, paddingVertical: 10 },
  toggleText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  contentSection: { padding: 24 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5, marginBottom: 6 },
  date: { fontSize: 14, fontFamily: "Inter_500Medium" },
  divider: { height: 1, marginVertical: 24 },
  sectionTitle: { fontSize: 22, fontFamily: "Inter_700Bold", marginBottom: 8, letterSpacing: -0.4 },
  sectionSubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22, marginBottom: 20 },
  scaleNotice: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, marginBottom: 20 },
  scaleNoticeText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  emptyHint: { fontSize: 14, fontFamily: "Inter_500Medium", marginBottom: 16 },
  addPieceButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1.5,
    borderStyle: "dashed",
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 20,
    justifyContent: "center",
  },
  addPieceText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  productsList: { gap: 16 },
  productCard: { borderWidth: 1, overflow: "hidden" },
  productImage: { width: "100%", height: 200 },
  productInfo: { padding: 16 },
  ikeaBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#0058A3",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginBottom: 10,
  },
  ikeaBadgeText: { color: "#ffffff", fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  productHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 },
  productName: { fontSize: 16, fontFamily: "Inter_600SemiBold", flex: 1, marginRight: 8 },
  productPrice: { fontSize: 16, fontFamily: "Inter_700Bold" },
  productCategory: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 12 },
  buyLink: { flexDirection: "row", alignItems: "center", gap: 4 },
  buyText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  cardActions: { flexDirection: "row", borderTopWidth: 1 },
  cardAction: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14 },
  cardActionText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  actionSeparator: { width: 1 },
  footer: { paddingHorizontal: 24, paddingTop: 16, borderTopWidth: 1 },
  dailyNotice: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  dailyNoticeText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  regenButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    borderRadius: 100,
  },
  regenButtonText: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  modalBackdrop: { flex: 1, justifyContent: "flex-end" },
  modalSheet: { maxHeight: "85%", flex: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 16 },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold", marginBottom: 4 },
  modalSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular" },
  modalClose: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  searchBar: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, height: 44, marginBottom: 12 },
  searchInput: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 15, padding: 0 },
  chipScroll: { marginBottom: 12, flexGrow: 0, flexShrink: 0 },
  chipRow: { gap: 8, paddingRight: 8 },
  chip: { borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
  chipText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  subChipScroll: { marginBottom: 16, flexGrow: 0, flexShrink: 0 },
  subChip: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6 },
  subChipText: { fontFamily: "Inter_500Medium", fontSize: 12 },
  modalEmpty: { textAlign: "center", marginTop: 32, fontFamily: "Inter_400Regular", fontSize: 14 },
  altRow: { flexDirection: "row", alignItems: "center", borderWidth: 1, padding: 12, gap: 14, marginBottom: 12 },
  altImage: { width: 64, height: 64, borderRadius: 10 },
  altInfo: { flex: 1, gap: 2 },
  altName: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  altMeta: { fontSize: 13, fontFamily: "Inter_400Regular" },
  altPrice: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginTop: 2 },
  altBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 100 },
  altBadgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  regenIconWrap: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", marginBottom: 32 },
  regenTitle: { fontSize: 26, fontFamily: "Inter_700Bold", marginBottom: 12, textAlign: "center", letterSpacing: -0.5 },
  regenSubtitle: { fontSize: 16, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 26 },
  errorText: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  backButton: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 100 },
});
