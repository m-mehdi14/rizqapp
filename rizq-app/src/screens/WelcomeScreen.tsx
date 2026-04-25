import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  useWindowDimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { colors, radii, spacing, typography } from "../theme/tokens";
import type { AuthStackParamList } from "../navigation/RootNavigator";
import LinearGradient from "react-native-linear-gradient";

const SLIDES = [
  {
    title: "Your committee, on-chain.",
    body: "No more lost money. No more trust issues. Smart contracts hold it all.",
    glow: ["#2B1B00", colors.bgBase],
    visual: '💬 "Kameti ka paisay kahan hain?"',
  },
  {
    title: "Your members contribute together.",
    body: "Every cycle stays transparent in USDC, with fixed payout order and no middleman risk.",
    glow: ["#0F2E1F", colors.bgBase],
    visual: "👥 10 members · $50 USDC each cycle",
  },
  {
    title: "Your personal savings coach.",
    body: "Bilingual. Weekly. Reads your on-chain data. Knows your squad.",
    glow: ["#1A0D40", colors.bgBase],
    visual: '✨ "Bhai, Eid aa rahi hai — coffee skip karo."',
  },
];

type Nav = NativeStackNavigationProp<AuthStackParamList, "Welcome">;

export function WelcomeScreen() {
  const navigation = useNavigation<Nav>();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);

  return (
    <View style={styles.root}>
      <FlatList
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => String(i)}
        onMomentumScrollEnd={(e) => {
          const x = e.nativeEvent.contentOffset.x;
          setIndex(Math.round(x / width));
        }}
        renderItem={({ item }) => (
          <LinearGradient colors={item.glow} style={[styles.slide, { width }]}>
            <View style={styles.visualCard}>
              <Text style={styles.visualText}>{item.visual}</Text>
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>
          </LinearGradient>
        )}
      />
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === index && styles.dotActive]}
          />
        ))}
      </View>
      <Pressable
        style={styles.cta}
        onPress={() => navigation.navigate("ConnectWallet")}
      >
        <Text style={styles.ctaText}>Connect Phantom</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.deepNavy, paddingVertical: spacing.section },
  slide: { paddingHorizontal: spacing.screenX, justifyContent: "center" },
  visualCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: spacing.card,
    marginBottom: spacing.section,
  },
  visualText: { color: colors.textPrimary, fontSize: 15, lineHeight: 24 },
  title: {
    color: colors.textPrimary,
    fontSize: typography.h1,
    fontWeight: "600",
    marginBottom: spacing.unit * 2,
  },
  body: { color: colors.textSecondary, fontSize: typography.body },
  dots: { flexDirection: "row", justifyContent: "center", gap: 8 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textMuted,
  },
  dotActive: { backgroundColor: colors.primaryGreen },
  cta: {
    marginHorizontal: spacing.screenX,
    marginTop: spacing.section,
    backgroundColor: colors.primaryGreen,
    paddingVertical: 14,
    borderRadius: radii.button,
    alignItems: "center",
  },
  ctaText: { color: colors.deepNavy, fontWeight: "700", fontSize: typography.body },
});
