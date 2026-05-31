import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, Pressable, Image, ScrollView, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";
import Animated, { FadeIn, FadeOut, SlideInUp, FadeInDown, ZoomIn } from "react-native-reanimated";
import { useQueryClient } from "@tanstack/react-query";

import { useColors } from "@/hooks/useColors";
import { useSavedRedesigns } from "@/hooks/useSavedRedesigns";
import { useFreeUsage } from "@/hooks/useFreeUsage";
import { useDailyUsage, PRO_DAILY_LIMIT } from "@/hooks/useDailyUsage";
import { useSubscription } from "@/lib/revenuecat";
import { Paywall } from "@/components/Paywall";
import { getAssetUrl } from "@/lib/utils";
import { useJobPoller } from "@/hooks/useJobPoller";
import {
  useListStyles,
  useListRooms,
  getListRedesignsQueryKey,
  useCreateRedesign,
  type StylePreset,
  type RoomType,
  type Redesign,
} from "@workspace/api-client-react";

const ROOM_ICONS: Record<string, React.ComponentProps<typeof Feather>["name"]> = {
  "living-room": "tv",
  bedroom: "moon",
  kitchen: "coffee",
  "dining-room": "users",
  "home-office": "briefcase",
};

export default function CreateScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { deviceId } = useSavedRedesigns();
  const queryClient = useQueryClient();
  const { isSubscribed, isCustomerInfoLoading } = useSubscription();
  const { hasFreeRedesign, incrementFreeUsed, isLoaded: isFreeUsageLoaded } = useFreeUsage();
  const { hasProRedesignToday, incrementProDaily, isLoaded: isDailyLoaded } = useDailyUsage();

  const isAccessReady = !isCustomerInfoLoading && isFreeUsageLoaded && isDailyLoaded;

  const { data: stylesList, isLoading: isLoadingStyles } = useListStyles();
  const { data: roomsList, isLoading: isLoadingRooms } = useListRooms();
  const { mutateAsync: createRedesign, isPending: isMutating } = useCreateRedesign();

  const onJobDone = useCallback(
    async (redesign: Redesign) => {
      if (isSubscribed) {
        await incrementProDaily();
      } else {
        await incrementFreeUsed();
      }
      if (deviceId) {
        const listKey = getListRedesignsQueryKey({ deviceId });
        queryClient.setQueryData<Redesign[]>(listKey, (prev) =>
          prev ? [redesign, ...prev] : [redesign],
        );
        queryClient.invalidateQueries({ queryKey: listKey });
      }
      router.replace(`/redesign/${redesign.id}`);
    },
    [isSubscribed, incrementProDaily, incrementFreeUsed, deviceId, queryClient, router],
  );

  const onJobError = useCallback((message: string) => {
    console.error("Redesign failed:", message);
  }, []);

  const { startJob, isPolling } = useJobPoller({
    storageKey: "@wistoria_pending_create_job",
    onDone: onJobDone,
    onError: onJobError,
  });

  const isGenerating = isMutating || isPolling;

  const [showPaywall, setShowPaywall] = useState(false);
  const [dailyLimitHit, setDailyLimitHit] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<string | null>(null);
  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(null);

  const [cameraPermission, requestCameraPermission] = ImagePicker.useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = ImagePicker.useMediaLibraryPermissions();

  const takePhoto = async () => {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0]?.base64) {
      setImageUri(result.assets[0].uri);
      setImageBase64(result.assets[0].base64.replace(/^data:image\/\w+;base64,/, ""));
    }
  };

  const pickImage = async () => {
    if (!mediaPermission?.granted) {
      const result = await requestMediaPermission();
      if (!result.granted) return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0]?.base64) {
      setImageUri(result.assets[0].uri);
      setImageBase64(result.assets[0].base64.replace(/^data:image\/\w+;base64,/, ""));
    }
  };

  const handleGenerate = async () => {
    if (!imageBase64 || !selectedStyleId || !selectedRoomTypeId || !deviceId) return;
    if (!isAccessReady) return;

    try {
      const { jobId } = await createRedesign({
        data: {
          image: imageBase64,
          styleId: selectedStyleId,
          roomTypeId: selectedRoomTypeId,
          deviceId,
          isSubscribed,
        },
      });
      await startJob(jobId);
    } catch (e) {
      console.error("Failed to start redesign", e);
    }
  };

  if (isGenerating) {
    return (
      <View style={[styles.generatingContainer, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <Animated.View entering={FadeIn.duration(600)} exiting={FadeOut} style={styles.generatingContent}>
          <View style={[styles.generatingIconWrap, { backgroundColor: colors.accent }]}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
          <Text style={[styles.generatingTitle, { color: colors.foreground }]}>Curating your space...</Text>
          <Text style={[styles.generatingSubtitle, { color: colors.mutedForeground }]}>
            Our AI interior designer is carefully selecting IKEA pieces that fit perfectly into your room.
          </Text>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Paywall
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        onPurchased={() => setShowPaywall(false)}
      />
      <View style={[styles.header, { paddingTop: insets.top + 16, paddingBottom: 16 }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Feather name="chevron-down" size={28} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Design Studio</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>The Canvas</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>Start with a clear photo of the room.</Text>

          {imageUri ? (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: imageUri }} style={[styles.imagePreview, { borderRadius: colors.radius }]} />
              <Pressable
                style={({ pressed }) => [
                  styles.repickButton,
                  { backgroundColor: colors.card },
                  pressed && { opacity: 0.9 }
                ]}
                onPress={() => setImageUri(null)}
              >
                <Feather name="refresh-ccw" size={18} color={colors.foreground} />
                <Text style={[styles.repickText, { color: colors.foreground }]}>Change Canvas</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.photoActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.photoActionCard,
                  { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius },
                  pressed && { backgroundColor: colors.muted }
                ]}
                onPress={takePhoto}
              >
                <View style={[styles.iconWrap, { backgroundColor: colors.muted }]}>
                  <Feather name="camera" size={24} color={colors.primary} />
                </View>
                <Text style={[styles.photoActionText, { color: colors.foreground }]}>Take Photo</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.photoActionCard,
                  { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius },
                  pressed && { backgroundColor: colors.muted }
                ]}
                onPress={pickImage}
              >
                <View style={[styles.iconWrap, { backgroundColor: colors.muted }]}>
                  <Feather name="image" size={24} color={colors.primary} />
                </View>
                <Text style={[styles.photoActionText, { color: colors.foreground }]}>Gallery</Text>
              </Pressable>
            </View>
          )}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(150).springify()}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 40 }]}>The Space</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>Tell us the room so we curate the right pieces.</Text>

          {isLoadingRooms ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 16 }} />
          ) : (
            <View style={styles.roomsRow}>
              {roomsList?.map((room: RoomType) => {
                const isSelected = selectedRoomTypeId === room.id;
                return (
                  <Pressable
                    key={room.id}
                    style={({ pressed }) => [
                      styles.roomCard,
                      { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius },
                      isSelected && { borderColor: colors.primary, borderWidth: 2 },
                      pressed && { transform: [{ scale: 0.98 }] },
                    ]}
                    onPress={() => setSelectedRoomTypeId(room.id)}
                  >
                    <View style={[styles.roomIconWrap, { backgroundColor: isSelected ? colors.primary : colors.muted }]}>
                      <Feather
                        name={ROOM_ICONS[room.id] ?? "home"}
                        size={22}
                        color={isSelected ? colors.primaryForeground : colors.primary}
                      />
                    </View>
                    <Text style={[styles.roomName, { color: colors.foreground }]}>{room.name}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 40 }]}>The Vision</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>Select a style to direct the curation.</Text>

          {isLoadingStyles ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 32 }} />
          ) : (
            <View style={styles.stylesGrid}>
              {stylesList?.map((style: StylePreset) => {
                const isSelected = selectedStyleId === style.id;
                return (
                  <Pressable
                    key={style.id}
                    style={({ pressed }) => [
                      styles.styleCard,
                      { borderRadius: colors.radius },
                      isSelected && { borderColor: colors.primary, borderWidth: 2, padding: 2 },
                      pressed && { transform: [{ scale: 0.98 }] }
                    ]}
                    onPress={() => setSelectedStyleId(style.id)}
                  >
                    <Image
                      source={{ uri: getAssetUrl(style.previewImage) }}
                      style={[styles.styleImage, { borderRadius: colors.radius - (isSelected ? 4 : 2) }]}
                    />
                    <View style={[StyleSheet.absoluteFill, styles.styleOverlay, { borderRadius: colors.radius - (isSelected ? 4 : 2) }]} />
                    <View style={styles.styleInfo}>
                      <Text style={styles.styleName}>{style.name}</Text>
                      <Text style={styles.styleTagline}>{style.tagline}</Text>
                    </View>
                    {isSelected && (
                      <Animated.View entering={ZoomIn.duration(200)} style={[styles.selectedBadge, { backgroundColor: colors.primary }]}>
                        <Feather name="check" size={16} color={colors.primaryForeground} />
                      </Animated.View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}
        </Animated.View>

        {dailyLimitHit && (
          <Animated.View entering={SlideInUp} style={[styles.errorContainer, { backgroundColor: colors.primary + "15" }]}>
            <Feather name="clock" size={20} color={colors.primary} />
            <Text style={[styles.errorText, { color: colors.primary }]}>
              You've used all {PRO_DAILY_LIMIT} Pro redesigns for today. Your limit resets tomorrow.
            </Text>
          </Animated.View>
        )}

      </ScrollView>

      <Animated.View
        entering={SlideInUp.delay(300)}
        style={[styles.footer, { paddingBottom: insets.bottom || 24, borderTopColor: colors.border, backgroundColor: colors.card }]}
      >
        <Pressable
          style={({ pressed }) => [
            styles.generateButton,
            { backgroundColor: colors.primary },
            (!imageUri || !selectedRoomTypeId || !selectedStyleId || !deviceId || !isAccessReady) && { opacity: 0.4 },
            pressed && imageUri && selectedRoomTypeId && selectedStyleId && deviceId && isAccessReady && { transform: [{ scale: 0.98 }] }
          ]}
          disabled={!imageUri || !selectedRoomTypeId || !selectedStyleId || !deviceId || isGenerating || !isAccessReady}
          onPress={handleGenerate}
        >
          <Text style={[styles.generateButtonText, { color: colors.primaryForeground }]}>
            Curate Design
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  scrollContent: { padding: 24, paddingBottom: 40 },
  sectionTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  sectionSubtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    marginBottom: 20,
  },
  photoActions: { flexDirection: "row", gap: 16 },
  photoActionCard: {
    flex: 1,
    height: 140,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  photoActionText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  imagePreviewContainer: {
    width: "100%",
    height: 280,
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  imagePreview: { width: "100%", height: "100%" },
  repickButton: {
    position: "absolute",
    bottom: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 100,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  repickText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  roomsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 16,
  },
  roomCard: {
    width: "48%",
    borderWidth: 1,
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  roomIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  roomName: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  stylesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 16,
  },
  styleCard: {
    width: "48%",
    height: 180,
    position: "relative",
    borderWidth: 2,
    borderColor: "transparent",
  },
  styleImage: { width: "100%", height: "100%" },
  styleOverlay: { backgroundColor: "rgba(0,0,0,0.35)" },
  styleInfo: { position: "absolute", bottom: 16, left: 16, right: 16 },
  styleName: {
    color: "#ffffff",
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  styleTagline: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  selectedBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 10,
  },
  generateButton: {
    width: "100%",
    paddingVertical: 18,
    borderRadius: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  generateButtonText: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  generatingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  generatingContent: { alignItems: "center" },
  generatingIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
  },
  generatingTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    marginBottom: 16,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  generatingSubtitle: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 26,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
    gap: 12,
  },
  errorText: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
});
