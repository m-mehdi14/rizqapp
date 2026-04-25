import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { WarningCircle } from "phosphor-react-native";
import { GlassCard } from "../../../components/GlassCard";
import { colors, spacing, typography } from "../../../theme/tokens";
import type { UrgentAction } from "../types";

type Props = {
  action: UrgentAction;
  onPress: () => void;
};

export function UrgentActionCard({ action, onPress }: Props) {
  const toneColor = action.severity === "danger" ? colors.danger : colors.warning;

  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      <GlassCard style={[styles.card, { borderColor: `${toneColor}80` }]}>
        <View style={styles.row}>
          <WarningCircle color={toneColor} size={18} weight="fill" />
          <Text style={[styles.badge, { color: toneColor }]}>Urgent action</Text>
        </View>
        <Text style={styles.title}>{action.title}</Text>
        <Text style={styles.subtitle}>{action.subtitle}</Text>
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.card,
    borderWidth: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  badge: {
    fontSize: typography.caption,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontWeight: "700",
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.h3,
    fontWeight: "700",
    marginBottom: 4,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.bodySmall,
    lineHeight: 20,
  },
});
