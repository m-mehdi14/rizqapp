import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  CurrencyCircleDollar,
  Gift,
  UserPlus,
  UsersThree,
} from "phosphor-react-native";
import { colors, radii, typography } from "../../../theme/tokens";

type Props = {
  isPayNowDisabled: boolean;
  onPressPayNow: () => void;
  onPressNewCommittee: () => void;
  onPressJoinCommittee: () => void;
  onPressInviteFriend: () => void;
};

export function QuickActions({
  isPayNowDisabled,
  onPressPayNow,
  onPressNewCommittee,
  onPressJoinCommittee,
  onPressInviteFriend,
}: Props) {
  return (
    <View style={styles.grid}>
      <ActionButton
        icon={<CurrencyCircleDollar color={isPayNowDisabled ? colors.textMuted : colors.brandGreen} size={20} />}
        label="Pay Now"
        disabled={isPayNowDisabled}
        onPress={onPressPayNow}
      />
      <ActionButton
        icon={<UsersThree color={colors.brandGreen} size={20} />}
        label="New Committee"
        onPress={onPressNewCommittee}
      />
      <ActionButton
        icon={<UserPlus color={colors.brandGreen} size={20} />}
        label="Join Committee"
        onPress={onPressJoinCommittee}
      />
      <ActionButton
        icon={<Gift color={colors.brandGreen} size={20} />}
        label="Invite Friend"
        onPress={onPressInviteFriend}
      />
    </View>
  );
}

function ActionButton({
  icon,
  label,
  onPress,
  disabled = false,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, disabled && styles.buttonDisabled]}
    >
      {icon}
      <Text style={[styles.label, disabled && styles.labelDisabled]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  button: {
    width: "48.5%",
    minHeight: 64,
    borderRadius: radii.button,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  buttonDisabled: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderColor: "rgba(255,255,255,0.08)",
  },
  label: {
    color: colors.textPrimary,
    fontSize: typography.bodySmall,
    fontWeight: "600",
    flexShrink: 1,
  },
  labelDisabled: {
    color: colors.textMuted,
  },
});
