import React from "react";
import { View, StyleSheet, LayoutChangeEvent, Text, Animated } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { colors, radii } from "../theme/tokens";
import { goalGradient } from "../theme/goalTheme";

type Variant = "success" | "warning" | "danger";

const variantColor: Record<Variant, string> = {
  success: colors.primaryGreen,
  warning: colors.accentGold,
  danger: colors.accentCoral,
};

type Props = {
  value: number;
  variant?: Variant;
  goalType?: string;
};

export function ProgressBar({ value, variant = "success", goalType }: Props) {
  const [w, setW] = React.useState(0);
  const widthAnim = React.useRef(new Animated.Value(0)).current;
  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);
  const clamped = Math.max(0, Math.min(1, value));

  React.useEffect(() => {
    Animated.spring(widthAnim, {
      toValue: clamped,
      damping: 18,
      stiffness: 120,
      mass: 0.8,
      useNativeDriver: false,
    }).start();
  }, [clamped, widthAnim]);

  const fillWidth = widthAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, w],
  });
  const fillColors =
    variant === "success"
      ? goalGradient(goalType)
      : variant === "warning"
      ? [colors.warning, "#FF8F00"]
      : [colors.danger, "#D50000"];

  return (
    <View style={styles.track} onLayout={onLayout}>
      {[0.25, 0.5, 0.75].map((m) => (
        <View
          key={m}
          style={[
            styles.dot,
            {
              left: w * m - 3,
              backgroundColor: clamped >= m ? "rgba(255,215,64,0.95)" : "rgba(255,255,255,0.4)",
            },
          ]}
        />
      ))}
      <Animated.View style={[styles.fillWrap, { width: fillWidth }]}>
        <LinearGradient colors={fillColors as string[]} style={styles.fill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
      </Animated.View>
      <Text style={[styles.percent, { color: variantColor[variant] }]}>{Math.round(clamped * 100)}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 10,
    borderRadius: 5,
    backgroundColor: "rgba(10,51,40,0.08)",
    borderWidth: 1,
    borderColor: "rgba(10,51,40,0.12)",
    overflow: "hidden",
    justifyContent: "center",
  },
  fillWrap: { height: "100%", borderRadius: radii.chip },
  fill: { height: "100%", borderRadius: radii.chip },
  dot: {
    position: "absolute",
    top: 2,
    width: 6,
    height: 6,
    borderRadius: 3,
    zIndex: 2,
  },
  percent: {
    position: "absolute",
    right: 8,
    top: -20,
    fontWeight: "700",
    fontSize: 13,
  },
});
