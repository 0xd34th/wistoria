import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Linking,
  LayoutAnimation,
} from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { useColors } from "@/hooks/useColors";

const INDIA_STORES = [
  { city: "Hyderabad", area: "HITEC City, Telangana" },
  { city: "Navi Mumbai", area: "Turbhe, Maharashtra" },
  { city: "Mumbai", area: "Worli, Maharashtra" },
  { city: "Pune", area: "Kharadi, Maharashtra" },
  { city: "Bengaluru", area: "Nagasandra, Karnataka" },
];

const IKEA_INDIA_URL = "https://www.ikea.com/in/en/stores/";

export function IkeaIndiaStoreBanner() {
  const [expanded, setExpanded] = useState(false);
  const colors = useColors();

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((v) => !v);
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Pressable style={styles.header} onPress={toggle}>
        <View style={styles.headerLeft}>
          <Text style={styles.flag}>🇮🇳</Text>
          <View>
            <Text style={[styles.title, { color: colors.foreground }]}>
              IKEA India
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Prices shown in ₹ for India
            </Text>
          </View>
        </View>
        <Feather
          name={expanded ? "chevron-up" : "chevron-down"}
          size={18}
          color={colors.mutedForeground}
        />
      </Pressable>

      {expanded && (
        <View
          style={[styles.body, { borderTopColor: colors.border }]}
        >
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
            Stores near you
          </Text>
          {INDIA_STORES.map((store) => (
            <View key={store.city} style={styles.storeRow}>
              <Feather
                name="map-pin"
                size={14}
                color={colors.mutedForeground}
                style={styles.pin}
              />
              <View>
                <Text style={[styles.city, { color: colors.foreground }]}>
                  {store.city}
                </Text>
                <Text style={[styles.area, { color: colors.mutedForeground }]}>
                  {store.area}
                </Text>
              </View>
            </View>
          ))}
          <Pressable
            style={[
              styles.linkButton,
              { backgroundColor: colors.secondary },
            ]}
            onPress={() => Linking.openURL(IKEA_INDIA_URL)}
          >
            <Text style={[styles.linkText, { color: colors.primary }]}>
              Find stores &amp; hours
            </Text>
            <Feather name="external-link" size={13} color={colors.primary} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  flag: {
    fontSize: 20,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
  },
  subtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  body: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 12,
  },
  storeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  pin: {
    marginTop: 2,
    marginRight: 8,
  },
  city: {
    fontSize: 14,
    fontWeight: "500",
  },
  area: {
    fontSize: 12,
    marginTop: 1,
  },
  linkButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  linkText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
