import React from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { colors } from "../theme/tokens";

type Props = {
  children: React.ReactNode;
  variant?: "default" | "ai" | "celebration";
  contentStyle?: ViewStyle;
};

const variantGradient: Record<NonNullable<Props["variant"]>, string[]> = {
  default: ["#EDE4D6", colors.bgBase],
  ai: ["#E4EEE9", colors.bgBase],
  celebration: ["#EFE7DA", colors.bgBase],
};

export function ScreenShell({ children, variant = "default", contentStyle }: Props) {
  return (
    <LinearGradient
      colors={variantGradient[variant]}
      style={styles.bg}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.85, y: 1 }}
    >
      <View style={[styles.overlay, contentStyle]}>{children}</View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  overlay: { flex: 1, backgroundColor: "rgba(245,240,232,0.72)" },
});
