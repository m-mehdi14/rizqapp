import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { colors, radii, spacing, typography } from "../../theme/tokens";
import type { CommitteesStackParamList } from "../../navigation/RootNavigator";

export function JoinKametiSuccessScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<CommitteesStackParamList>>();
  const route = useRoute<RouteProp<CommitteesStackParamList, "JoinCommitteeSuccess">>();
  const committeeId = route.params?.committeeId;

  return (
    <View style={styles.container}>
      <Text style={styles.badge}>Joined Successfully</Text>
      <Text style={styles.title}>You are now a committee member.</Text>
      <Text style={styles.subtitle}>
        Your manager has been notified. Track your contribution cycle from dashboard.
      </Text>

      <Pressable
        style={styles.button}
        accessibilityRole="button"
        onPress={() => {
          if (committeeId) {
            navigation.navigate("MemberDashboard", { committeeId });
            return;
          }
          navigation.navigate("CommitteesHub");
        }}
      >
        <Text style={styles.buttonText}>Return to Home Dashboard</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: colors.bgBase,
    paddingHorizontal: spacing.screenX,
    gap: 12,
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
    lineHeight: 22,
  },
  button: {
    marginTop: 8,
    minHeight: 50,
    borderRadius: radii.button,
    backgroundColor: colors.brandGreen,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: colors.textInverse,
    fontWeight: "700",
    fontSize: typography.body,
  },
});
