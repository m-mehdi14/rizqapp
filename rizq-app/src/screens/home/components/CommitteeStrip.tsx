import React from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Plus, UsersThree } from "phosphor-react-native";
import { GlassCard } from "../../../components/GlassCard";
import { colors, spacing, typography } from "../../../theme/tokens";
import type { CommitteeItem } from "../types";

type Props = {
  committees: CommitteeItem[];
  onPressCommittee: (committeeId: string) => void;
  onPressCreate: () => void;
  onPressInviteCode: () => void;
};

type ListItem = CommitteeItem | { id: "plus-card"; isPlus: true };

export function CommitteeStrip({
  committees,
  onPressCommittee,
  onPressCreate,
  onPressInviteCode,
}: Props) {
  if (committees.length === 0) {
    return (
      <EmptyStateCard onPressCreate={onPressCreate} onPressInviteCode={onPressInviteCode} />
    );
  }

  const items: ListItem[] = [...committees, { id: "plus-card", isPlus: true }];

  return (
    <FlatList
      horizontal
      data={items}
      keyExtractor={(item) => item.id}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.listContent}
      renderItem={({ item }) =>
        "isPlus" in item ? (
          <PlusCard onPress={onPressCreate} />
        ) : (
          <CommitteeCard committee={item} onPress={() => onPressCommittee(item.id)} />
        )
      }
    />
  );
}

function CommitteeCard({
  committee,
  onPress,
}: {
  committee: CommitteeItem;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      <GlassCard style={styles.committeeCard}>
        <View style={styles.committeeTop}>
          <UsersThree color={colors.brandGreen} size={16} weight="fill" />
          <Text style={styles.committeeType}>{committee.typeLabel}</Text>
        </View>
        <Text style={styles.committeeName}>{committee.name}</Text>
        <Text style={styles.meta}>{committee.currentCycleLabel}</Text>
        <Text style={styles.meta}>{committee.nextPaymentDueLabel}</Text>
      </GlassCard>
    </Pressable>
  );
}

function PlusCard({ onPress }: { onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Create or join committee" onPress={onPress}>
      <View style={styles.plusCard}>
        <Plus color={colors.textPrimary} size={24} weight="bold" />
      </View>
    </Pressable>
  );
}

function EmptyStateCard({
  onPressCreate,
  onPressInviteCode,
}: {
  onPressCreate: () => void;
  onPressInviteCode: () => void;
}) {
  return (
    <GlassCard style={styles.emptyCard}>
      <Text style={styles.emptyTitle}>You have no active committees yet.</Text>
      <Text style={styles.emptyBody}>
        Start your first kameti or enter an invite code from a friend.
      </Text>
      <View style={styles.emptyButtons}>
        <Pressable style={styles.emptyButtonPrimary} onPress={onPressCreate}>
          <Text style={styles.emptyButtonPrimaryText}>Create</Text>
        </Pressable>
        <Pressable style={styles.emptyButtonSecondary} onPress={onPressInviteCode}>
          <Text style={styles.emptyButtonSecondaryText}>Enter invite code</Text>
        </Pressable>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  listContent: {
    gap: 10,
    paddingRight: 6,
  },
  committeeCard: {
    width: 188,
    padding: 14,
    minHeight: 132,
  },
  committeeTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  committeeType: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    fontWeight: "600",
  },
  committeeName: {
    color: colors.textPrimary,
    fontSize: typography.h3,
    fontWeight: "700",
    marginBottom: 6,
  },
  meta: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    lineHeight: 18,
  },
  plusCard: {
    width: 92,
    minHeight: 132,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCard: {
    padding: spacing.card,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: typography.h3,
    fontWeight: "700",
    marginBottom: 6,
  },
  emptyBody: {
    color: colors.textSecondary,
    fontSize: typography.bodySmall,
    lineHeight: 20,
    marginBottom: 12,
  },
  emptyButtons: {
    flexDirection: "row",
    gap: 10,
  },
  emptyButtonPrimary: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: colors.brandGreen,
    paddingVertical: 10,
    alignItems: "center",
  },
  emptyButtonPrimaryText: {
    color: colors.textInverse,
    fontWeight: "700",
  },
  emptyButtonSecondary: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: colors.bgSurface,
    paddingVertical: 10,
    alignItems: "center",
  },
  emptyButtonSecondaryText: {
    color: colors.textPrimary,
    fontWeight: "600",
  },
});
