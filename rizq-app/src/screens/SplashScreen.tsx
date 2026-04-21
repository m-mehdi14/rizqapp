import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { colors, spacing, typography } from "../theme/tokens";
import type { AuthStackParamList } from "../navigation/RootNavigator";

type Nav = NativeStackNavigationProp<AuthStackParamList, "Splash">;

export function SplashScreen() {
  const navigation = useNavigation<Nav>();

  useEffect(() => {
    const t = setTimeout(() => navigation.replace("Welcome"), 1500);
    return () => clearTimeout(t);
  }, [navigation]);

  return (
    <View style={styles.root}>
      <Text style={styles.logo}>Rizq</Text>
      <Text style={styles.tag}>Save Together. Win Together.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.deepNavy,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.screenX,
  },
  logo: {
    color: colors.textPrimary,
    fontSize: typography.hero,
    fontWeight: "700",
  },
  tag: {
    marginTop: spacing.unit,
    color: colors.textSecondary,
    fontSize: typography.body,
  },
});
