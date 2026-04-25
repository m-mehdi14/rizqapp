import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Sparkle } from "phosphor-react-native";
import { GlassCard } from "../../../components/GlassCard";
import { colors, spacing, typography } from "../../../theme/tokens";

type Props = {
  message: string;
  onPress: () => void;
};

export function AICoachWidget({ message, onPress }: Props) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      <GlassCard style={styles.card}>
        <View style={styles.row}>
          <Sparkle color={colors.brandPurple} size={16} weight="fill" />
          <Text style={styles.eyebrow}>Rizq AI This Week</Text>
        </View>
        <Text numberOfLines={2} ellipsizeMode="tail" style={styles.message}>
          {message}
        </Text>
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.card,
    borderColor: "rgba(167,139,250,0.4)",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  eyebrow: {
    color: colors.brandPurple,
    fontSize: typography.caption,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    fontWeight: "700",
  },
  message: {
    color: colors.textPrimary,
    fontSize: typography.body,
    lineHeight: 22,
  },
});
