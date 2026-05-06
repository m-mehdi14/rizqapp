import React, { useState } from "react";
import { Pressable, Text, StyleSheet, Clipboard } from "react-native";
import { a11y, colors, typography } from "../theme/tokens";

type Props = { address: string; onCopy?: () => void };

export function WalletAddressChip({ address, onCopy }: Props) {
  const [copied, setCopied] = useState(false);
  const short =
    address.length > 10
      ? `${address.slice(0, 4)}…${address.slice(-4)}`
      : address;

  const copy = () => {
    Clipboard.setString(address);
    setCopied(true);
    onCopy?.();
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Wallet address ${address}`}
      onPress={copy}
      style={styles.row}
    >
      <Text style={styles.mono}>{short}</Text>
      <Text style={styles.action}>{copied ? "Copied" : "Copy"}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: a11y.minTapTarget, paddingHorizontal: 4 },
  mono: {
    fontFamily: "monospace",
    color: colors.textPrimary,
    fontSize: typography.bodySmall,
  },
  action: { color: colors.brandGreen, fontSize: typography.caption, fontWeight: "700" },
});
