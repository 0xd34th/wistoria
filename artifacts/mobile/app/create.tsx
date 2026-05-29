import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, Image, ScrollView, Dimensions, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn, FadeOut, SlideInUp } from "react-native-reanimated";

import { useColors } from "@/hooks/useColors";
import { useSavedRedesigns } from "@/hooks/useSavedRedesigns";
import { getAssetUrl } from "@/lib/utils";
import { useListStyles, useCreateRedesign, StylePreset } from "@workspace/api-client-react";

const { width } = Dimensions.get("window");

export default function CreateScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { saveRedesign } = useSavedRedesigns();

  const { data: stylesList, isLoading: isLoadingStyles } = useListStyles();
  const { mutateAsync: createRedesign, isPending: isGenerating, error } = useCreateRedesign();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
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
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setImageUri(result.assets[0].uri);
      setImageBase64(result.assets[0].base64);
    }
  };

  const pickImage = async () => {
    if (!mediaPermission?.granted) {
      const result = await requestMediaPermission();
      if (!result.granted) return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setImageUri(result.assets[0].uri);
      setImageBase64(result.assets[0].base64);
    }
  };

  const handleGenerate = async () => {
    if (!imageBase64 || !selectedStyleId || !stylesList) return;

    try {
      const style = stylesList.find((s) => s.id === selectedStyleId);
      if (!style) return;

      const result = await createRedesign({
        data: {
          image: imageBase64,
          styleId: selectedStyleId,
        },
      });

      const newId = Date.now().toString() + Math.random().toString(36).substring(2, 9);

      await saveRedesign({
        id: newId,
        createdAt: Date.now(),
        styleId: style.id,
        styleName: style.name,
        originalImage: imageBase64,
        redesignedImage: result.redesignedImage,
        products: result.products,
      });

      router.replace(`/redesign/${newId}`);
    } catch (e) {
      console.error("Failed to generate redesign", e);
    }
  };

  if (isGenerating) {
    return (
      <View style={[styles.generatingContainer, { backgroundColor: colors.background }]}>
        <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.generatingContent}>
          <ActivityIndicator size="large" color={colors.primary} style={styles.generatingSpinner} />
          <Text style={[styles.generatingTitle, { color: colors.foreground }]}>Designing your room...</Text>
          <Text style={[styles.generatingSubtitle, { color: colors.mutedForeground }]}>
            This usually takes 20-40 seconds. We're analyzing your space and picking the perfect IKEA pieces.
          </Text>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Feather name="x" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>New Design</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>1. Add a photo of your room</Text>
        
        {imageUri ? (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: imageUri }} style={[styles.imagePreview, { borderRadius: colors.radius }]} />
            <Pressable 
              style={[styles.repickButton, { backgroundColor: colors.card }]} 
              onPress={() => setImageUri(null)}
            >
              <Feather name="refresh-cw" size={20} color={colors.foreground} />
              <Text style={[styles.repickText, { color: colors.foreground }]}>Change Photo</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.photoActions}>
            <Pressable 
              style={[styles.photoActionCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]} 
              onPress={takePhoto}
            >
              <Feather name="camera" size={32} color={colors.primary} />
              <Text style={[styles.photoActionText, { color: colors.foreground }]}>Take Photo</Text>
            </Pressable>
            
            <Pressable 
              style={[styles.photoActionCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]} 
              onPress={pickImage}
            >
              <Feather name="image" size={32} color={colors.primary} />
              <Text style={[styles.photoActionText, { color: colors.foreground }]}>Upload Photo</Text>
            </Pressable>
          </View>
        )}

        <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 32 }]}>2. Choose a style</Text>
        
        {isLoadingStyles ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 24 }} />
        ) : (
          <View style={styles.stylesGrid}>
            {stylesList?.map((style: StylePreset) => (
              <Pressable
                key={style.id}
                style={[
                  styles.styleCard,
                  { borderRadius: colors.radius },
                  selectedStyleId === style.id && { borderColor: colors.primary, borderWidth: 2 }
                ]}
                onPress={() => setSelectedStyleId(style.id)}
              >
                <Image 
                  source={{ uri: getAssetUrl(style.previewImage) }} 
                  style={[styles.styleImage, { borderRadius: colors.radius - 2 }]} 
                />
                <View style={[StyleSheet.absoluteFill, styles.styleOverlay, { borderRadius: colors.radius - 2 }]} />
                <View style={styles.styleInfo}>
                  <Text style={styles.styleName}>{style.name}</Text>
                  <Text style={styles.styleTagline}>{style.tagline}</Text>
                </View>
                {selectedStyleId === style.id && (
                  <View style={[styles.selectedBadge, { backgroundColor: colors.primary }]}>
                    <Feather name="check" size={16} color={colors.primaryForeground} />
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        )}

        {error && (
          <Animated.View entering={SlideInUp} style={[styles.errorContainer, { backgroundColor: colors.destructive + '20' }]}>
            <Feather name="alert-circle" size={20} color={colors.destructive} />
            <Text style={[styles.errorText, { color: colors.destructive }]}>Failed to redesign room. Please try again.</Text>
          </Animated.View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom || 24, borderTopColor: colors.border, backgroundColor: colors.background }]}>
        <Pressable
          style={[
            styles.generateButton,
            { backgroundColor: colors.primary },
            (!imageUri || !selectedStyleId) && { opacity: 0.5 }
          ]}
          disabled={!imageUri || !selectedStyleId || isGenerating}
          onPress={handleGenerate}
        >
          <Text style={[styles.generateButtonText, { color: colors.primaryForeground }]}>
            Redesign My Room
          </Text>
        </Pressable>
      </View>
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
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 16,
  },
  photoActions: {
    flexDirection: "row",
    gap: 16,
  },
  photoActionCard: {
    flex: 1,
    height: 120,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  photoActionText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  imagePreviewContainer: {
    width: "100%",
    height: 240,
    position: "relative",
  },
  imagePreview: {
    width: "100%",
    height: "100%",
  },
  repickButton: {
    position: "absolute",
    bottom: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 100,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  repickText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  stylesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  styleCard: {
    width: (width - 48 - 16) / 2, // padding 24 on each side = 48, gap 16
    height: 160,
    position: "relative",
    borderWidth: 2,
    borderColor: "transparent",
  },
  styleImage: {
    width: "100%",
    height: "100%",
  },
  styleOverlay: {
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  styleInfo: {
    position: "absolute",
    bottom: 12,
    left: 12,
    right: 12,
  },
  styleName: {
    color: "#ffffff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 2,
  },
  styleTagline: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  selectedBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  generateButton: {
    width: "100%",
    paddingVertical: 18,
    borderRadius: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  generateButtonText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  generatingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  generatingContent: {
    alignItems: "center",
  },
  generatingSpinner: {
    marginBottom: 32,
    transform: [{ scale: 1.5 }],
  },
  generatingTitle: {
    fontSize: 24,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 12,
    textAlign: "center",
  },
  generatingSubtitle: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 24,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
    gap: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
});
