import { View, Text, StyleSheet, Pressable, ScrollView, Image } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useSavedRedesigns } from "@/hooks/useSavedRedesigns";

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { redesigns, isLoading } = useSavedRedesigns();

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>RoomLab</Text>
        <Pressable
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/create")}
        >
          <Feather name="plus" size={24} color={colors.primaryForeground} />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <Text style={{ color: colors.mutedForeground }}>Loading...</Text>
        </View>
      ) : redesigns.length === 0 ? (
        <View style={styles.centerContainer}>
          <View style={[styles.iconCircle, { backgroundColor: colors.muted }]}>
            <Feather name="image" size={32} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No rooms yet</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Tap the + button to transform your first room.
          </Text>
          <Pressable
            style={[styles.createButton, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/create")}
          >
            <Text style={[styles.createButtonText, { color: colors.primaryForeground }]}>
              Design a Room
            </Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {redesigns.map((room) => (
            <Pressable
              key={room.id}
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}
              onPress={() => router.push(`/redesign/${room.id}`)}
            >
              <Image
                source={{ uri: `data:image/png;base64,${room.redesignedImage}` }}
                style={[styles.cardImage, { borderTopLeftRadius: colors.radius, borderTopRightRadius: colors.radius }]}
              />
              <View style={styles.cardInfo}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>{room.styleName}</Text>
                <Text style={[styles.cardDate, { color: colors.mutedForeground }]}>
                  {new Date(room.createdAt).toLocaleDateString()}
                </Text>
              </View>
            </Pressable>
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
    paddingBottom: 16,
    paddingTop: 16,
  },
  title: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    letterSpacing: -1,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginBottom: 32,
    maxWidth: "80%",
    lineHeight: 24,
  },
  createButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 100,
  },
  createButtonText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  scrollContent: {
    padding: 24,
    gap: 24,
  },
  card: {
    borderWidth: 1,
    overflow: "hidden",
  },
  cardImage: {
    width: "100%",
    height: 200,
  },
  cardInfo: {
    padding: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 4,
  },
  cardDate: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
});
