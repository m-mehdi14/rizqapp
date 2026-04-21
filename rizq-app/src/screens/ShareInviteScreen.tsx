import React from "react";
import { View, Text, StyleSheet, Pressable, Share } from "react-native";
import { useRoute } from "@react-navigation/native";
import { colors, radii, spacing, typography } from "../theme/tokens";

export function ShareInviteScreen() {
  const route = useRoute();
  const { goalId } = route.params as { goalId: string };
  const link = `https://rizq.app/goal/${goalId}`;

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Invite friends</Text>
      <View style={styles.card}>
        <Text style={styles.link}>{link}</Text>
        <Pressable
          style={styles.btn}
          onPress={() => Share.share({ message: `Stake on my Rizq goal: ${link}` })}
        >
          <Text style={styles.btnText}>Share</Text>
        </Pressable>
      </View>
      <Text style={styles.previewLabel}>Preview</Text>
      <View style={styles.preview}>
        <Text style={styles.previewText}>
          Stake USDC on whether I&apos;ll hit my savings goal on Rizq.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.deepNavy,
    padding: spacing.screenX,
    paddingTop: spacing.section,
  },
  title: { color: colors.textPrimary, fontSize: typography.h1, fontWeight: "600" },
  card: {
    marginTop: spacing.section,
    backgroundColor: colors.surfaceCard,
    borderRadius: radii.card,
    padding: spacing.card,
  },
  link: { color: colors.textPrimary, marginBottom: spacing.unit * 2 },
  btn: {
    backgroundColor: colors.primaryGreen,
    paddingVertical: 12,
    borderRadius: radii.button,
    alignItems: "center",
  },
  btnText: { color: colors.deepNavy, fontWeight: "700" },
  previewLabel: {
    marginTop: spacing.section,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  preview: {
    marginTop: spacing.unit,
    backgroundColor: colors.elevatedSurface,
    borderRadius: radii.card,
    padding: spacing.card,
  },
  previewText: { color: colors.textPrimary },
});
