import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Image, Dimensions, Modal, ActivityIndicator, TextInput, FlatList } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useQueryClient } from "@tanstack/react-query";

import { useColors } from "@/hooks/useColors";
import { useSavedRedesigns } from "@/hooks/useSavedRedesigns";
import { ikeaImageUrl } from "@/lib/utils";
import {
  useListProducts,
  getListProductsQueryKey,
  useRegenerateRedesign,
  getListRedesignsQueryKey,
  type Product,
  type Redesign,
} from "@workspace/api-client-react";

const { width } = Dimensions.get("window");

const TAG_POSITIONS = [
  { top: "10%", left: "4%" },
  { top: "20%", right: "4%" },
  { top: "40%", right: "4%" },
  { bottom: "28%", left: "4%" },
  { bottom: "16%", right: "4%" },
] as const;

const formatPrice = (price: number) => `$${price.toFixed(2)}`;

// Turns an internal role id (e.g. "floor-lamp") into a human label ("Floor lamp")
// for the swap category chips.
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
  const { mutateAsync: regenerate, isPending: isRegenerating } = useRegenerateRedesign();

  const redesign = getRedesign(id);

  const [showOriginal, setShowOriginal] = useState(false);
  const [showTags, setShowTags] = useState(false);
  const [workingProducts, setWorkingProducts] = useState<Product[]>(() => redesign?.products ?? []);
  const [swapIndex, setSwapIndex] = useState<number | null>(null);
  // Swap modal filters: a broad bucket (group, e.g. Lighting) with the option to
  // narrow to a specific category (role, e.g. Table Lamp). Defaults to the
  // swapped piece's own bucket so a lamp swap shows lamps, then lets the user
  // browse other buckets or drill down.
  const [swapGroup, setSwapGroup] = useState<string | null>(null);
  const [swapRole, setSwapRole] = useState<string | null>(null);
  const [swapSearch, setSwapSearch] = useState("");

  const roomTypeId = redesign?.roomTypeId ?? "";
  const productsParams = { roomTypeId };
  const { data: eligibleProducts, isLoading: isLoadingAlternatives } = useListProducts(productsParams, {
    query: { enabled: !!roomTypeId, queryKey: getListProductsQueryKey(productsParams) },
  });

  const swapTarget = swapIndex !== null ? workingProducts[swapIndex] : null;

  // Broad buckets available in this room's eligible pool, with the swapped
  // piece's own bucket surfaced first.
  const swapGroups = useMemo(() => {
    const groups = Array.from(new Set((eligibleProducts ?? []).map((p) => p.group)));
    groups.sort((a, b) => a.localeCompare(b));
    if (swapTarget && groups.includes(swapTarget.group)) {
      return [swapTarget.group, ...groups.filter((g) => g !== swapTarget.group)];
    }
    return groups;
  }, [eligibleProducts, swapTarget]);

  // Narrow categories (roles) within the selected broad bucket, swapped piece's
  // own role first when it belongs to the active bucket.
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
      const matchesGroup = !swapGroup || p.group === swapGroup;
      const matchesRole = !swapRole || p.role === swapRole;
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q);
      return matchesGroup && matchesRole && matchesSearch;
    });
  }, [eligibleProducts, swapGroup, swapRole, swapSearch]);

  // Open the swap sheet for a given piece, defaulting the broad bucket to that
  // piece's group so the user sees like-for-like options first (e.g. a lamp
  // swap shows the Lighting bucket), with the option to narrow further.
  const openSwap = (index: number) => {
    setSwapGroup(workingProducts[index]?.group ?? null);
    setSwapRole(null);
    setSwapSearch("");
    setSwapIndex(index);
  };

  // Switching broad bucket clears any narrow category drill-down.
  const selectSwapGroup = (group: string | null) => {
    setSwapGroup(group);
    setSwapRole(null);
  };

  // Resync the editable working set whenever the saved design first loads or its
  // image changes (i.e. after a regeneration). User edits in between are kept.
  useEffect(() => {
    if (redesign) setWorkingProducts(redesign.products);
  }, [id, redesign?.redesignedImage]);

  if (!redesign) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.mutedForeground }]}>Design not found.</Text>
        <Pressable style={[styles.backButton, { marginTop: 24, backgroundColor: colors.card }]} onPress={() => router.replace("/")}>
          <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold" }}>Back to Studio</Text>
        </Pressable>
      </View>
    );
  }

  const openBuyLink = async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch (e) {
      console.error("Failed to open link", e);
    }
  };

  const removeProduct = (productId: string) => {
    setWorkingProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  const chooseAlternative = (product: Product) => {
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
    setSwapIndex(null);
  };

  const savedIds = redesign.products.map((p) => p.id).join(",");
  const workingIds = workingProducts.map((p) => p.id).join(",");
  const isDirty = savedIds !== workingIds;
  const canRegenerate = isDirty && workingProducts.length > 0 && !!deviceId && !isRegenerating;

  const handleRegenerate = async () => {
    if (!deviceId || workingProducts.length === 0) return;
    try {
      const updated = await regenerate({
        id,
        data: { deviceId, productIds: workingProducts.map((p) => p.id) },
      });
      const listKey = getListRedesignsQueryKey({ deviceId });
      queryClient.setQueryData<Redesign[]>(listKey, (prev) =>
        prev ? prev.map((r) => (r.id === updated.id ? updated : r)) : [updated],
      );
      queryClient.invalidateQueries({ queryKey: listKey });
      setShowOriginal(false);
    } catch (e) {
      console.error("Failed to regenerate redesign", e);
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: (insets.bottom || 24) + (isDirty ? 110 : 24) }} showsVerticalScrollIndicator={false}>

        <View style={styles.imageSection}>
          <View style={[styles.navRow, { paddingTop: insets.top + 16 }]}>
            <Pressable onPress={() => router.replace("/")} style={styles.navButton}>
              <Feather name="arrow-left" size={24} color="#ffffff" />
            </Pressable>
            {!showOriginal && (
              <Pressable
                onPress={() => setShowTags((v) => !v)}
                style={[
                  styles.tagsToggle,
                  showTags ? { backgroundColor: colors.primary } : { backgroundColor: "rgba(0,0,0,0.45)" },
                ]}
              >
                <Feather name="tag" size={16} color="#ffffff" />
                <Text style={styles.tagsToggleText}>{showTags ? "Hide tags" : "Shop the look"}</Text>
              </Pressable>
            )}
          </View>

          <Image
            source={{ uri: `data:image/png;base64,${showOriginal ? redesign.originalImage : redesign.redesignedImage}` }}
            style={styles.mainImage}
            resizeMode="cover"
          />

          {!showOriginal && showTags && (
            <View style={styles.tagsLayer} pointerEvents="box-none">
              {redesign.products.slice(0, TAG_POSITIONS.length).map((product, i) => (
                <Pressable
                  key={product.id}
                  style={[styles.tag, TAG_POSITIONS[i], { backgroundColor: colors.card }]}
                  onPress={() => openBuyLink(product.buyUrl)}
                >
                  <View style={styles.ikeaBadge}>
                    <Text style={styles.ikeaBadgeText}>IKEA</Text>
                  </View>
                  <Text style={[styles.tagName, { color: colors.foreground }]} numberOfLines={1}>
                    {product.name}
                  </Text>
                  <Text style={[styles.tagPrice, { color: colors.foreground }]}>{formatPrice(product.price)}</Text>
                </Pressable>
              ))}
            </View>
          )}

          <View style={styles.toggleContainer}>
            <Pressable
              style={[
                styles.toggleButton,
                showOriginal ? { backgroundColor: colors.primary } : { backgroundColor: "rgba(0,0,0,0.5)" }
              ]}
              onPress={() => setShowOriginal(true)}
            >
              <Text style={[styles.toggleText, showOriginal ? { color: colors.primaryForeground } : { color: "#ffffff" }]}>Canvas</Text>
            </Pressable>
            <Pressable
              style={[
                styles.toggleButton,
                !showOriginal ? { backgroundColor: colors.primary } : { backgroundColor: "rgba(0,0,0,0.5)" }
              ]}
              onPress={() => setShowOriginal(false)}
            >
              <Text style={[styles.toggleText, !showOriginal ? { color: colors.primaryForeground } : { color: "#ffffff" }]}>Curated</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.contentSection}>
          <Animated.View entering={FadeInDown.delay(100)}>
            <Text style={[styles.title, { color: colors.foreground }]}>{redesign.styleName} Studio</Text>
            <Text style={[styles.date, { color: colors.mutedForeground }]}>
              {redesign.roomName ? `${redesign.roomName} · ` : ""}
              {new Date(redesign.createdAt).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>
          </Animated.View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <Animated.View entering={FadeInDown.delay(200)}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>The Collection</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>
              These are the pieces the AI placed in your room. Remove any you don't want, or swap one for an alternative, then regenerate.
            </Text>

            {workingProducts.length === 0 && (
              <Text style={[styles.emptyHint, { color: colors.destructive }]}>
                Add at least one piece back to regenerate your room.
              </Text>
            )}

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
                    onPress={() => openBuyLink(product.buyUrl)}
                  >
                    <ExpoImage
                      source={{ uri: ikeaImageUrl(product.imageUrl) }}
                      style={[styles.productImage, { borderTopLeftRadius: colors.radius, borderTopRightRadius: colors.radius }]}
                      contentFit="cover"
                      transition={150}
                    />
                    <View style={styles.productInfo}>
                      <View style={styles.ikeaBadge}>
                        <Text style={styles.ikeaBadgeText}>IKEA</Text>
                      </View>
                      <View style={styles.productHeader}>
                        <Text style={[styles.productName, { color: colors.foreground }]} numberOfLines={1}>{product.name}</Text>
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
          style={[styles.footer, { paddingBottom: insets.bottom || 24, borderTopColor: colors.border, backgroundColor: colors.card }]}
        >
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
            <Text style={[styles.regenButtonText, { color: colors.primaryForeground }]}>Regenerate room</Text>
          </Pressable>
        </Animated.View>
      )}

      <Modal
        visible={swapIndex !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setSwapIndex(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: colors.background, paddingBottom: insets.bottom || 24 }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>Swap this piece</Text>
                <Text style={[styles.modalSubtitle, { color: colors.mutedForeground }]}>
                  {swapTarget
                    ? `Showing ${(swapRole ? humanizeRole(swapRole) : swapGroup ?? "all").toLowerCase()} options. Pick a category or search.`
                    : "Pick a category or search for a piece."}
                </Text>
              </View>
              <Pressable onPress={() => setSwapIndex(null)} style={[styles.modalClose, { backgroundColor: colors.muted }]}>
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
              {swapSearch.length > 0 && (
                <Pressable onPress={() => setSwapSearch("")} hitSlop={8}>
                  <Feather name="x-circle" size={16} color={colors.mutedForeground} />
                </Pressable>
              )}
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
                  { borderColor: colors.border, borderRadius: colors.radius },
                  swapGroup === null && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: swapGroup === null ? colors.primaryForeground : colors.foreground },
                  ]}
                >
                  All
                </Text>
              </Pressable>
              {swapGroups.map((group) => {
                const active = swapGroup === group;
                return (
                  <Pressable
                    key={group}
                    onPress={() => selectSwapGroup(group)}
                    style={[
                      styles.chip,
                      { borderColor: colors.border, borderRadius: colors.radius },
                      active && { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: active ? colors.primaryForeground : colors.foreground },
                      ]}
                    >
                      {group}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {swapGroup && swapRoles.length > 1 && (
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
                    { borderColor: colors.border, borderRadius: colors.radius },
                    swapRole === null && { backgroundColor: colors.secondary, borderColor: colors.secondary },
                  ]}
                >
                  <Text
                    style={[
                      styles.subChipText,
                      { color: swapRole === null ? colors.secondaryForeground : colors.mutedForeground },
                    ]}
                  >
                    All {swapGroup}
                  </Text>
                </Pressable>
                {swapRoles.map((role) => {
                  const active = swapRole === role;
                  return (
                    <Pressable
                      key={role}
                      onPress={() => setSwapRole(role)}
                      style={[
                        styles.subChip,
                        { borderColor: colors.border, borderRadius: colors.radius },
                        active && { backgroundColor: colors.secondary, borderColor: colors.secondary },
                      ]}
                    >
                      <Text
                        style={[
                          styles.subChipText,
                          { color: active ? colors.secondaryForeground : colors.mutedForeground },
                        ]}
                      >
                        {humanizeRole(role)}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}

            {isLoadingAlternatives ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 32 }} />
            ) : filteredAlternatives.length === 0 ? (
              <Text style={[styles.modalEmpty, { color: colors.mutedForeground }]}>
                No pieces match. Try another category or search.
              </Text>
            ) : (
              <FlatList
                data={filteredAlternatives}
                keyExtractor={(product) => product.id}
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 16 }}
                initialNumToRender={8}
                windowSize={5}
                removeClippedSubviews
                keyboardShouldPersistTaps="handled"
                renderItem={({ item: product }) => {
                  const inRoom = workingProducts.some((p) => p.id === product.id);
                  return (
                    <Pressable
                      style={({ pressed }) => [
                        styles.altRow,
                        { borderColor: colors.border, borderRadius: colors.radius, backgroundColor: colors.card },
                        pressed && { opacity: 0.85 },
                      ]}
                      onPress={() => chooseAlternative(product)}
                    >
                      <ExpoImage source={{ uri: ikeaImageUrl(product.imageUrl) }} style={[styles.altImage, { backgroundColor: colors.muted }]} contentFit="cover" transition={150} />
                      <View style={styles.altInfo}>
                        <Text style={[styles.altName, { color: colors.foreground }]} numberOfLines={1}>{product.name}</Text>
                        <Text style={[styles.altMeta, { color: colors.mutedForeground }]} numberOfLines={1}>{product.category}</Text>
                        <Text style={[styles.altPrice, { color: colors.foreground }]}>{formatPrice(product.price)}</Text>
                      </View>
                      {inRoom ? (
                        <View style={[styles.altBadge, { backgroundColor: colors.muted }]}>
                          <Text style={[styles.altBadgeText, { color: colors.mutedForeground }]}>In room</Text>
                        </View>
                      ) : (
                        <Feather name="plus-circle" size={22} color={colors.primary} />
                      )}
                    </Pressable>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
  },
  imageSection: {
    position: "relative",
    width: width,
    height: width * 1.25,
  },
  mainImage: {
    width: "100%",
    height: "100%",
  },
  navRow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tagsToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  tagsToggleText: {
    color: "#ffffff",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  tagsLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 5,
  },
  tag: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    maxWidth: 175,
    paddingVertical: 5,
    paddingLeft: 5,
    paddingRight: 9,
    borderRadius: 999,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  ikeaBadge: {
    backgroundColor: "#0058A3",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
  },
  ikeaBadgeText: {
    color: "#FFDB00",
    fontSize: 8,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.3,
  },
  tagName: {
    flexShrink: 1,
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: -0.2,
  },
  tagPrice: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  navButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  toggleContainer: {
    position: "absolute",
    bottom: 24,
    alignSelf: "center",
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 100,
    padding: 6,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  toggleButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 100,
  },
  toggleText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  contentSection: {
    padding: 24,
    paddingTop: 32,
  },
  title: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    marginBottom: 8,
    letterSpacing: -1,
  },
  date: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  divider: {
    height: 1,
    width: "100%",
    marginVertical: 32,
  },
  sectionTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  sectionSubtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    marginBottom: 24,
    lineHeight: 22,
  },
  emptyHint: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    marginBottom: 16,
  },
  productsList: {
    gap: 20,
  },
  productCard: {
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  productImage: {
    width: "100%",
    height: 220,
    backgroundColor: "#f5f5f5",
  },
  productInfo: {
    padding: 20,
  },
  productHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  productName: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    flex: 1,
    marginRight: 16,
    letterSpacing: -0.5,
  },
  productPrice: {
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
  },
  productCategory: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    marginBottom: 20,
  },
  buyLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  buyText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  cardActions: {
    flexDirection: "row",
    borderTopWidth: 1,
  },
  cardAction: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  cardActionText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  actionSeparator: {
    width: 1,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 10,
  },
  regenButton: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    borderRadius: 100,
  },
  regenButtonText: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
  },
  regenIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
  },
  regenTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    marginBottom: 12,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  regenSubtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    maxHeight: "85%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
  },
  modalClose: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    padding: 0,
  },
  chipScroll: {
    marginBottom: 12,
    flexGrow: 0,
    flexShrink: 0,
  },
  chipRow: {
    gap: 8,
    paddingRight: 8,
  },
  chip: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  subChipScroll: {
    marginBottom: 16,
    flexGrow: 0,
    flexShrink: 0,
  },
  subChip: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  subChipText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  modalEmpty: {
    textAlign: "center",
    marginTop: 32,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
  altRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    padding: 12,
    gap: 14,
    marginBottom: 12,
  },
  altImage: {
    width: 64,
    height: 64,
    borderRadius: 10,
  },
  altInfo: {
    flex: 1,
    gap: 2,
  },
  altName: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  altMeta: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  altPrice: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    marginTop: 2,
  },
  altBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 100,
  },
  altBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  errorText: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
  },
  backButton: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 100,
  },
});
