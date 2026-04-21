import React from "react";
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  StyleProp,
} from "react-native";
import { colors, radii, typography } from "../theme/tokens";

type Props = {
  label: string;
  loading?: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

export function PhantomButton({ label, loading, onPress, style }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      style={[styles.btn, style]}
      onPress={onPress}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color={colors.deepNavy} />
      ) : (
        <Text style={styles.text}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: colors.primaryGreen,
    paddingVertical: 14,
    borderRadius: radii.button,
    alignItems: "center",
    minHeight: 48,
    justifyContent: "center",
  },
  text: { color: colors.deepNavy, fontWeight: "700", fontSize: typography.body },
});
