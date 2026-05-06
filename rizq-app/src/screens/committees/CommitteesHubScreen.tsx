import React from "react";
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import Clipboard from "@react-native-clipboard/clipboard";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";
import { CheckCircle, PlusCircle } from "phosphor-react-native";
import { GlassCard } from "../../components/GlassCard";
import { ScreenShell } from "../../components/ScreenShell";
import { SectionHeader } from "../../components/SectionHeader";
import { useAppStore } from "../../store/useAppStore";
import { colors, radii, spacing, typography } from "../../theme/tokens";

const FLOATING_TAB_BAR_CLEARANCE = 108;

function CtaButton({
  label,
  onPress,
  primary = false,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <Pressable style={[styles.cta, primary && styles.ctaPrimary]} onPress={onPress}>
      <Text style={[styles.ctaText, primary && styles.ctaTextPrimary]}>{label}</Text>
    </Pressable>
  );
}

function dueLabel(daysLeft: number) {
  if (daysLeft <= 0) return "Due today";
  if (daysLeft === 1) return "Due tomorrow";
  return `${daysLeft} days left`;
}

export function CommitteesHubScreen() {
  const nav = useNavigation<NavigationProp<ParamListBase>>();
  const committees = useAppStore((s) => s.committees);
  const managedCommittees = committees;
  const joinedCommittees = committees;

  return (
    <ScreenShell>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: spacing.section,
            paddingHorizontal: spacing.screenX,
            paddingBottom: FLOATING_TAB_BAR_CLEARANCE,
            gap: 14,
          }}
        >
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>Committees Hub</Text>
              <Text style={styles.subtitle}>Manage, join, and track your active committees</Text>
            </View>
            <View style={styles.iconWrap}>
              <Text style={styles.iconEmoji}>👥</Text>
            </View>
          </View>

          <View style={styles.actionRow}>
            <CtaButton label="Create Committee" onPress={() => nav.navigate("CreateCommittee")} primary />
            <CtaButton label="Join by Invite" onPress={() => nav.navigate("JoinCommittee")} />
          </View>

          <SectionHeader title="Committees I Manage" />
          {managedCommittees.map((item) => (
            <GlassCard key={item.id} style={styles.card}>
              {Math.max(0, item.daysLeft) <= 2 ? (
                <Text style={Math.max(0, item.daysLeft) === 0 ? styles.alertDanger : styles.alertWarning}>
                  {Math.max(0, item.daysLeft) === 0
                    ? "Action required: cycle payment due today"
                    : `Upcoming due: ${dueLabel(Math.max(0, item.daysLeft))}`}
                </Text>
              ) : null}
              <View style={styles.cardTopRow}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text
                  style={[
                    styles.badge,
                    (item.status ?? "").toLowerCase() === "paused" ? styles.badgeWarning : styles.badgeSuccess,
                  ]}
                >
                  {item.status ?? "active"}
                </Text>
              </View>
              <Text style={styles.cardMeta}>{`${item.memberCount ?? 0}/${item.maxMembers ?? 0} members`}</Text>
              <Text style={styles.cardSub}>
                {`Next cycle: ${item.nextCycleDate ? new Date(item.nextCycleDate).toLocaleDateString() : "TBD"} • ${dueLabel(Math.max(0, item.daysLeft))}`}
              </Text>
              {item.inviteCode ? (
                <Pressable
                  style={styles.codeChip}
                  onPress={() => {
                    Clipboard.setString(item.inviteCode as string);
                    Alert.alert("Copied", "Join code copied. Share with members.");
                  }}
                >
                  <Text style={styles.codeChipText}>{`Code: ${item.inviteCode} · Tap to copy`}</Text>
                </Pressable>
              ) : null}
              <Pressable
                style={styles.linkBtn}
                onPress={() =>
                  nav.navigate("CommitteesTab", {
                    screen: "ManagerDashboard",
                    params: { committeeId: item.id },
                  })
                }
              >
                <Text style={styles.linkText}>Open manager dashboard</Text>
              </Pressable>
            </GlassCard>
          ))}

          <SectionHeader title="Committees I Joined" />
          {joinedCommittees.map((item) => (
            <GlassCard key={item.id} style={styles.card}>
              {Math.max(0, item.daysLeft) <= 2 ? (
                <Text style={Math.max(0, item.daysLeft) === 0 ? styles.alertDanger : styles.alertWarning}>
                  {Math.max(0, item.daysLeft) === 0
                    ? "Your contribution is due today"
                    : `Your due date is near (${dueLabel(Math.max(0, item.daysLeft))})`}
                </Text>
              ) : null}
              <View style={styles.cardTopRow}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <CheckCircle color={colors.info} size={18} />
              </View>
              <Text style={styles.cardMeta}>{`Cycle ${item.currentCycle ?? 1}/${item.totalCycles ?? 1}`}</Text>
              <Text style={styles.cardSub}>
                {`${item.status ?? "active"} • ${item.nextCycleDate ? new Date(item.nextCycleDate).toLocaleDateString() : "TBD"} • ${dueLabel(Math.max(0, item.daysLeft))}`}
              </Text>
              <Pressable
                style={styles.linkBtn}
                onPress={() =>
                  nav.navigate("CommitteesTab", {
                    screen: "MemberDashboard",
                    params: { committeeId: item.id },
                  })
                }
              >
                <Text style={styles.linkText}>Open member dashboard</Text>
              </Pressable>
            </GlassCard>
          ))}

          <Pressable style={styles.plusInline} onPress={() => nav.navigate("CreateCommittee")}>
            <PlusCircle color={colors.textInverse} size={16} weight="fill" />
            <Text style={styles.plusInlineText}>Start another committee</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  title: { color: colors.textPrimary, fontSize: typography.h1, fontWeight: "800" },
  subtitle: { color: colors.textSecondary, fontSize: typography.bodySmall, marginTop: 2 },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(0,230,118,0.12)",
    borderWidth: 1,
    borderColor: "rgba(0,230,118,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconEmoji: { fontSize: 20 },
  actionRow: { flexDirection: "row", gap: 8 },
  cta: {
    flex: 1,
    minHeight: 46,
    borderRadius: radii.button,
    borderWidth: 1,
    borderColor: "rgba(10,51,40,0.22)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(10,51,40,0.04)",
  },
  ctaPrimary: {
    backgroundColor: colors.brandGreen,
    borderColor: colors.brandGreen,
  },
  ctaText: { color: colors.textPrimary, fontSize: typography.bodySmall, fontWeight: "700" },
  ctaTextPrimary: { color: colors.textInverse },
  card: { padding: 12, gap: 6 },
  cardTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  cardTitle: { color: colors.textPrimary, fontSize: typography.body, fontWeight: "700", flex: 1 },
  cardMeta: { color: colors.textSecondary, fontSize: typography.caption },
  cardSub: { color: colors.textPrimary, fontSize: typography.bodySmall },
  codeChip: {
    marginTop: 2,
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(0,230,118,0.35)",
    backgroundColor: "rgba(0,230,118,0.12)",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  codeChipText: { color: colors.brandGreen, fontSize: typography.caption, fontWeight: "700" },
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    overflow: "hidden",
    fontSize: typography.caption,
    fontWeight: "700",
  },
  badgeSuccess: { color: colors.success, borderColor: "rgba(0,230,118,0.45)", backgroundColor: "rgba(0,230,118,0.12)" },
  badgeWarning: { color: colors.warning, borderColor: "rgba(255,179,0,0.45)", backgroundColor: "rgba(255,179,0,0.12)" },
  alertWarning: {
    color: colors.warning,
    fontSize: typography.caption,
    fontWeight: "700",
  },
  alertDanger: {
    color: colors.danger,
    fontSize: typography.caption,
    fontWeight: "700",
  },
  linkBtn: { marginTop: 3, alignSelf: "flex-start" },
  linkText: { color: colors.info, fontSize: typography.caption, textDecorationLine: "underline" },
  plusInline: {
    marginTop: 2,
    minHeight: 44,
    borderRadius: radii.button,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
    backgroundColor: "rgba(0,230,118,0.9)",
  },
  plusInlineText: { color: colors.textInverse, fontSize: typography.bodySmall, fontWeight: "700" },
});
