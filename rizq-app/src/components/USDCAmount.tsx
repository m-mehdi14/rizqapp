import React from "react";
import { Text, StyleSheet, View } from "react-native";
import { colors, typography } from "../theme/tokens";

type Size = "sm" | "md" | "lg";

const sizeMap: Record<Size, number> = {
  sm: typography.bodySmall,
  md: typography.body,
  lg: typography.h1,
};

type Props = {
  lamports: number;
  showPKR?: boolean;
  pkrRate?: number;
  size?: Size;
};

export function USDCAmount({
  lamports,
  showPKR,
  pkrRate = 280,
  size = "md",
}: Props) {
  const usd = lamports / 1_000_000;
  const pkr = usd * pkrRate;
  return (
    <View>
      <Text style={[styles.usd, { fontSize: sizeMap[size] }]}>
        ${usd.toFixed(2)} USDC
      </Text>
      {showPKR && (
        <Text style={styles.pkr}>≈ PKR {pkr.toLocaleString(undefined, { maximumFractionDigits: 0 })}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  usd: {
    fontWeight: "700",
    color: colors.brandGreen,
    textShadowColor: colors.usdcGreenGlow,
    textShadowRadius: 12,
    textShadowOffset: { width: 0, height: 0 },
  },
  pkr: { color: colors.textSecondary, fontSize: typography.caption, marginTop: 2 },
});
