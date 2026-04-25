import React from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import Clipboard from "@react-native-clipboard/clipboard";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import { colors, radii, spacing, typography } from "../../theme/tokens";
import type { CommitteesStackParamList } from "../../navigation/RootNavigator";

type SuccessRoute = RouteProp<CommitteesStackParamList, "CreateCommitteeSuccess">;
type Navigation = NavigationProp<ParamListBase>;

export function CreateKametiSuccessScreen() {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<SuccessRoute>();

  return (
    <View style={styles.container}>
      <Text style={styles.badge}>Launched Successfully</Text>
      <Text style={styles.title}>Your committee is ready.</Text>
      <Text style={styles.subtitle}>
        Share this invite link with members to start onboarding.
      </Text>

      <View style={styles.linkCard}>
        <Text style={styles.linkText}>{route.params.inviteLink}</Text>
        {route.params.inviteCode ? (
          <Text style={styles.codeText}>{`Invite code: ${route.params.inviteCode}`}</Text>
        ) : null}
        <View style={styles.actionRow}>
          <Pressable
            style={styles.actionButton}
            onPress={() => {
              Clipboard.setString(route.params.inviteLink);
              Alert.alert("Copied", "Invite link copied.");
            }}
          >
            <Text style={styles.actionButtonText}>Copy Link</Text>
          </Pressable>
          {route.params.inviteCode ? (
            <Pressable
              style={styles.actionButton}
              onPress={() => {
                Clipboard.setString(route.params.inviteCode as string);
                Alert.alert("Copied", "Invite code copied.");
              }}
            >
              <Text style={styles.actionButtonText}>Copy Code</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <Pressable
        onPress={() => {
          const parent = navigation.getParent();
          if (route.params.committeeId) {
            parent?.navigate("CommitteesTab", {
              screen: "ManagerDashboard",
              params: { committeeId: route.params.committeeId },
            });
            return;
          }
          parent?.navigate("CommitteesTab", {
            screen: "CommitteesHub",
          });
        }}
        style={styles.button}
        accessibilityRole="button"
      >
        <Text style={styles.buttonText}>Open Committee Dashboard</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgBase,
    paddingHorizontal: spacing.screenX,
    justifyContent: "center",
    gap: 14,
  },
  badge: {
    color: colors.brandGreen,
    fontSize: typography.caption,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: "700",
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.h1,
    fontWeight: "800",
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.body,
  },
  linkCard: {
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: "rgba(0,230,118,0.35)",
    backgroundColor: "rgba(0,230,118,0.08)",
    padding: 14,
  },
  linkText: {
    color: colors.textPrimary,
    fontSize: typography.bodySmall,
    fontWeight: "600",
  },
  codeText: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    marginTop: 8,
  },
  actionRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  actionButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(0,230,118,0.4)",
    backgroundColor: "rgba(0,230,118,0.12)",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  actionButtonText: { color: colors.brandGreen, fontSize: typography.caption, fontWeight: "700" },
  button: {
    marginTop: 8,
    borderRadius: radii.button,
    backgroundColor: colors.brandGreen,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: colors.textInverse,
    fontWeight: "700",
    fontSize: typography.body,
  },
});
