import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Image } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";

import { useColors } from "@/hooks/useColors";
import { useSavedRedesigns } from "@/hooks/useSavedRedesigns";
import { useSubscription } from "@/lib/revenuecat";
import { Paywall } from "@/components/Paywall";

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { redesigns, isLoading } = useSavedRedesigns();
  const { isSubscribed } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Paywall visible={showPaywall} onClose={() => setShowPaywall(false)} />
      <View style={[styles.header, { paddingTop: insets.top + 16, paddingBottom: 16 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Wistoria</Text>
        <View style={styles.headerActions}>
          <Pressable
            style={({ pressed }) => [
              styles.proButton,
              {
                backgroundColor: isSubscribed ? colors.secondary : colors.accent,
              },
              pressed && { opacity: 0.8 },
            ]}
            onPress={() => setShowPaywall(true)}
          >
            <Feather
              name={isSubscribed ? "check-circle" : "zap"}
              size={15}
              color={isSubscribed ? colors.secondaryForeground : colors.primary}
            />
            <Text
              style={[
                styles.proButtonText,
                { color: isSubscribed ? colors.secondaryForeground : colors.primary },
              ]}
            >
              {isSubscribed ? "Pro" : "Go Pro"}
            </Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.addButton,
              { backgroundColor: colors.primary },
              pressed && { opacity: 0.8 }
            ]}
            onPress={() => router.push("/create")}
          >
            <Feather name="plus" size={24} color={colors.primaryForeground} />
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <Animated.View entering={FadeIn}>
            <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium" }}>Loading...</Text>
          </Animated.View>
        </View>
      ) : redesigns.length === 0 ? (
        <Animated.View entering={FadeInDown.delay(100)} style={styles.centerContainer}>
          <View style={[styles.emptyIconContainer, { backgroundColor: colors.accent }]}>
            <Feather name="home" size={40} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Your studio is empty</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Transform your first space with the help of our AI interior designer.
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.createButton,
              { backgroundColor: colors.primary },
              pressed && { transform: [{ scale: 0.98 }] }
            ]}
            onPress={() => router.push("/create")}
          >
            <Text style={[styles.createButtonText, { color: colors.primaryForeground }]}>
              Design a Room
            </Text>
          </Pressable>
        </Animated.View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {redesigns.map((room, index) => (
            <Animated.View key={room.id} entering={FadeInDown.delay(index * 100).springify()}>
              <Pressable
                style={({ pressed }) => [
                  styles.card,
                  { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius },
                  pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }
                ]}
                onPress={() => router.push(`/redesign/${room.id}`)}
              >
                <Image
                  source={{ uri: `data:image/png;base64,${room.redesignedImage}` }}
                  style={[styles.cardImage, { borderTopLeftRadius: colors.radius, borderTopRightRadius: colors.radius }]}
                />
                <View style={[styles.cardInfo, { borderBottomLeftRadius: colors.radius, borderBottomRightRadius: colors.radius }]}>
                  <Text style={[styles.cardTitle, { color: colors.foreground }]}>{room.styleName}</Text>
                  <Text style={[styles.cardDate, { color: colors.mutedForeground }]}>
                    {new Date(room.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                </View>
              </Pressable>
            </Animated.View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 34,
    fontFamily: "Inter_700Bold",
    letterSpacing: -1.2,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  proButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 20,
  },
  proButtonText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
  },
  emptyTitle: {
    fontSize: 26,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 12,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginBottom: 40,
    lineHeight: 24,
  },
  createButton: {
    paddingHorizontal: 36,
    paddingVertical: 18,
    borderRadius: 100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  createButtonText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  scrollContent: {
    padding: 24,
    gap: 24,
    paddingBottom: 48,
  },
  card: {
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
  },
  cardImage: {
    width: "100%",
    height: 220,
  },
  cardInfo: {
    padding: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  cardDate: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
});
