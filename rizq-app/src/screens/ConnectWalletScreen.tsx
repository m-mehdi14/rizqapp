import React from "react";
import { View, Text, StyleSheet, Pressable, Linking } from "react-native";
import { usePhantomWallet } from "../hooks/usePhantomWallet";
import { colors, radii, spacing, typography } from "../theme/tokens";

export function ConnectWalletScreen() {
  const { connect } = usePhantomWallet();

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Connect with Phantom</Text>
      <Text style={styles.note}>
        Rizq never holds your private keys. All funds are secured by Solana smart
        contracts.
      </Text>
      <Pressable style={styles.btn} onPress={connect}>
        <Text style={styles.btnText}>Open Phantom</Text>
      </Pressable>
      <Pressable
        onPress={() => Linking.openURL("https://phantom.app/download")}
      >
        <Text style={styles.link}>Don&apos;t have Phantom? Download it</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.deepNavy,
    padding: spacing.screenX,
    justifyContent: "center",
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.h1,
    fontWeight: "600",
    marginBottom: spacing.unit * 2,
  },
  note: { color: colors.textSecondary, fontSize: typography.bodySmall, marginBottom: spacing.section },
  btn: {
    backgroundColor: colors.primaryGreen,
    paddingVertical: 14,
    borderRadius: radii.button,
    alignItems: "center",
  },
  btnText: { color: colors.deepNavy, fontWeight: "700" },
  link: {
    marginTop: spacing.section,
    color: colors.accentPurple,
    textAlign: "center",
  },
});
