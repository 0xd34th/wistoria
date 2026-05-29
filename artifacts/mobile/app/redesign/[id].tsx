import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Image, Dimensions } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";

import { useColors } from "@/hooks/useColors";
import { useSavedRedesigns } from "@/hooks/useSavedRedesigns";
import { getAssetUrl } from "@/lib/utils";

const { width } = Dimensions.get("window");

export default function RedesignResultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { getRedesign } = useSavedRedesigns();

  const [showOriginal, setShowOriginal] = useState(false);

  const redesign = getRedesign(id);

  if (!redesign) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.mutedForeground }]}>Redesign not found</Text>
        <Pressable style={[styles.backButton, { marginTop: 24, backgroundColor: colors.card }]} onPress={() => router.back()}>
          <Text style={{ color: colors.foreground }}>Go Back</Text>
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom || 24 }} showsVerticalScrollIndicator={false}>
        
        {/* Header / Before-After Toggle */}
        <View style={[styles.imageSection, { paddingTop: insets.top }]}>
          <View style={styles.navRow}>
            <Pressable onPress={() => router.replace("/")} style={[styles.navButton, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
              <Feather name="arrow-left" size={24} color="#ffffff" />
            </Pressable>
          </View>

          <Image 
            source={{ uri: `data:image/png;base64,${showOriginal ? redesign.originalImage : redesign.redesignedImage}` }}
            style={styles.mainImage}
            resizeMode="cover"
          />

          <View style={styles.toggleContainer}>
            <Pressable
              style={[
                styles.toggleButton,
                showOriginal ? { backgroundColor: colors.primary } : { backgroundColor: "rgba(0,0,0,0.5)" }
              ]}
              onPress={() => setShowOriginal(true)}
            >
              <Text style={[styles.toggleText, showOriginal ? { color: colors.primaryForeground } : { color: "#ffffff" }]}>Before</Text>
            </Pressable>
            <Pressable
              style={[
                styles.toggleButton,
                !showOriginal ? { backgroundColor: colors.primary } : { backgroundColor: "rgba(0,0,0,0.5)" }
              ]}
              onPress={() => setShowOriginal(false)}
            >
              <Text style={[styles.toggleText, !showOriginal ? { color: colors.primaryForeground } : { color: "#ffffff" }]}>After</Text>
            </Pressable>
          </View>
        </View>

        {/* Content Section */}
        <View style={styles.contentSection}>
          <Text style={[styles.title, { color: colors.foreground }]}>{redesign.styleName} Room</Text>
          <Text style={[styles.date, { color: colors.mutedForeground }]}>
            Designed on {new Date(redesign.createdAt).toLocaleDateString()}
          </Text>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Shop the look</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>
            Everything you see is a real IKEA product you can buy today.
          </Text>

          <View style={styles.productsList}>
            {redesign.products.map((product) => (
              <Pressable
                key={product.id}
                style={[styles.productCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}
                onPress={() => openBuyLink(product.buyUrl)}
              >
                <Image 
                  source={{ uri: getAssetUrl(product.imageUrl) }} 
                  style={[styles.productImage, { borderTopLeftRadius: colors.radius, borderTopRightRadius: colors.radius }]} 
                />
                <View style={styles.productInfo}>
                  <View style={styles.productHeader}>
                    <Text style={[styles.productName, { color: colors.foreground }]} numberOfLines={1}>{product.name}</Text>
                    <Text style={[styles.productPrice, { color: colors.foreground }]}>
                      {product.currency}{product.price}
                    </Text>
                  </View>
                  <Text style={[styles.productCategory, { color: colors.mutedForeground }]}>
                    {product.category} • {product.color}
                  </Text>
                  <View style={styles.buyLink}>
                    <Text style={[styles.buyText, { color: colors.primary }]}>View on IKEA</Text>
                    <Feather name="external-link" size={14} color={colors.primary} />
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
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
    height: width * 1.2,
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
    paddingTop: 16, // Insets added via style array
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleContainer: {
    position: "absolute",
    bottom: 24,
    alignSelf: "center",
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 100,
    padding: 4,
    gap: 4,
  },
  toggleButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 100,
  },
  toggleText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  contentSection: {
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    marginBottom: 8,
  },
  date: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  divider: {
    height: 1,
    width: "100%",
    marginVertical: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginBottom: 24,
  },
  productsList: {
    gap: 16,
  },
  productCard: {
    borderWidth: 1,
  },
  productImage: {
    width: "100%",
    height: 200,
    backgroundColor: "#f5f5f5",
  },
  productInfo: {
    padding: 16,
  },
  productHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  productName: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
    marginRight: 16,
  },
  productPrice: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
  },
  productCategory: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginBottom: 16,
  },
  buyLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  buyText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  errorText: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
});
