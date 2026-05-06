import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radii, typography } from "../../../theme/tokens";
import type { Member } from "../store/useCommitteeDashboardStore";

type Props = {
  visible: boolean;
  member: Member | null;
  isManager: boolean;
  onClose: () => void;
  onViewPaymentHistory?: (member: Member) => void;
  onSendReminder?: (member: Member) => void;
  onAction?: (action: "suspend" | "activate" | "remove" | "deceased", member: Member) => void;
};

export function MemberActionModal({
  visible,
  member,
  isManager,
  onClose,
  onViewPaymentHistory,
  onSendReminder,
  onAction,
}: Props) {
  if (!member) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{member.name}</Text>
          <Text style={styles.subtitle}>Past payment history</Text>
          <View style={styles.historyWrap}>
            {member.history.map((h, idx) => (
              <Text key={`${h.cycle}-${idx}`} style={styles.historyRow}>
                {`Cycle ${h.cycle}: ${h.status} • ${h.amount} USDC • ${h.date}`}
              </Text>
            ))}
          </View>

          {isManager ? (
            <View style={styles.managerActions}>
              <ActionButton text="View Payment History" onPress={() => onViewPaymentHistory?.(member)} />
              <ActionButton text="Send Reminder" onPress={() => onSendReminder?.(member)} />
              <ActionButton
                text="Suspend member"
                onPress={() => onAction?.("suspend", member)}
              />
              <ActionButton
                text="Re-activate member"
                onPress={() => onAction?.("activate", member)}
              />
              <ActionButton
                text="Remove from committee"
                danger
                onPress={() => onAction?.("remove", member)}
              />
              <ActionButton
                text="Mark as deceased (nominee flow)"
                danger
                onPress={() => onAction?.("deceased", member)}
              />
            </View>
          ) : null}

          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function ActionButton({
  text,
  onPress,
  danger = false,
}: {
  text: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      style={[styles.actionBtn, danger && styles.actionBtnDanger]}
      onPress={onPress}
    >
      <Text style={[styles.actionText, danger && styles.actionTextDanger]}>{text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(10,51,40,0.45)",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: "rgba(10,51,40,0.18)",
    padding: 16,
    gap: 10,
  },
  title: { color: colors.textPrimary, fontSize: typography.h3, fontWeight: "700" },
  subtitle: { color: colors.textSecondary, fontSize: typography.caption, textTransform: "uppercase", letterSpacing: 0.6 },
  historyWrap: {
    borderRadius: radii.input,
    borderWidth: 1,
    borderColor: "rgba(10,51,40,0.16)",
    backgroundColor: "rgba(10,51,40,0.04)",
    padding: 10,
    gap: 6,
  },
  historyRow: { color: colors.textPrimary, fontSize: typography.caption },
  managerActions: { gap: 7, marginTop: 4 },
  actionBtn: {
    minHeight: 40,
    borderRadius: radii.button,
    borderWidth: 1,
    borderColor: "rgba(10,51,40,0.22)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(10,51,40,0.03)",
  },
  actionBtnDanger: {
    borderColor: "rgba(255,82,82,0.5)",
    backgroundColor: "rgba(255,82,82,0.12)",
  },
  actionText: { color: colors.textPrimary, fontSize: typography.bodySmall, fontWeight: "600" },
  actionTextDanger: { color: colors.danger },
  closeBtn: {
    marginTop: 4,
    minHeight: 42,
    borderRadius: radii.button,
    backgroundColor: colors.brandGreen,
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: { color: colors.textInverse, fontWeight: "700", fontSize: typography.body },
});
