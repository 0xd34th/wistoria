import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Image, Dimensions } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import Animated, { FadeIn, FadeInDown, Layout } from "react-native-reanimated";

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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom || 40 }} showsVerticalScrollIndicator={false}>
        
        <View style={styles.imageSection}>
          <View style={[styles.navRow, { paddingTop: insets.top + 16 }]}>
            <Pressable onPress={() => router.replace("/")} style={styles.navButton}>
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
              {new Date(redesign.createdAt).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>
          </Animated.View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <Animated.View entering={FadeInDown.delay(200)}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>The Collection</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>
              Curated pieces perfectly suited for your new space.
            </Text>

            <View style={styles.productsList}>
              {redesign.products.map((product, index) => (
                <Animated.View key={product.id} entering={FadeInDown.delay(300 + index * 100).springify()}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.productCard, 
                      { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius },
                      pressed && { transform: [{ scale: 0.98 }] }
                    ]}
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
                        <Feather name="arrow-up-right" size={14} color={colors.primary} />
                      </View>
                    </View>
                  </Pressable>
                </Animated.View>
              ))}
            </View>
          </Animated.View>
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
  productsList: {
    gap: 20,
  },
  productCard: {
    borderWidth: 1,
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
