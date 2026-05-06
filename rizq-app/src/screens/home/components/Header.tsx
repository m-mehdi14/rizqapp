import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Bell } from "phosphor-react-native";
import { a11y, colors, radii, typography } from "../../../theme/tokens";

type Props = {
  unreadCount: number;
  onPressNotifications: () => void;
};

export function Header({ unreadCount, onPressNotifications }: Props) {
  return (
    <View style={styles.row}>
      <Text style={styles.logo}>Rizq</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Notifications, ${unreadCount} unread`}
        hitSlop={12}
        onPress={onPressNotifications}
        style={styles.bellButton}
      >
        <Bell color={colors.textPrimary} size={20} weight="regular" />
        {unreadCount > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{Math.min(unreadCount, 99)}</Text>
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logo: {
    color: colors.textPrimary,
    fontSize: typography.h1,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  bellButton: {
    width: a11y.minTapTarget,
    height: a11y.minTapTarget,
    borderRadius: radii.chip,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(10,51,40,0.05)",
    borderWidth: 1,
    borderColor: "rgba(10,51,40,0.18)",
  },
  badge: {
    position: "absolute",
    top: 5,
    right: 5,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    color: colors.textPrimary,
    fontSize: 10,
    fontWeight: "700",
  },
});
