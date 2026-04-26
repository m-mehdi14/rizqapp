import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useWeb3AuthWallet } from "../hooks/useWeb3AuthWallet";
import { colors, radii, spacing, typography } from "../theme/tokens";

export function ConnectWalletScreen() {
  const { connectWeb3AuthWallet } = useWeb3AuthWallet();

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Connect In-App Wallet</Text>
      <Text style={styles.note}>
        Rizq never holds your private keys. All funds are secured by Solana smart
        contracts.
      </Text>
      <Pressable style={styles.btn} onPress={connectWeb3AuthWallet}>
        <Text style={styles.btnText}>Continue with In-App Wallet</Text>
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
});
