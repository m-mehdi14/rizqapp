import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radii, typography } from "../../../theme/tokens";

type Props = {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
};

export function AccordionSection({ title, children, defaultOpen = true }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View style={styles.wrap}>
      <Pressable style={styles.header} onPress={() => setOpen((prev) => !prev)}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.chev}>{open ? "−" : "+"}</Text>
      </Pressable>
      {open ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
    backgroundColor: "rgba(255,255,255,0.02)",
    overflow: "hidden",
  },
  header: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  title: { color: colors.textPrimary, fontSize: typography.body, fontWeight: "700" },
  chev: { color: colors.textSecondary, fontSize: typography.h3, fontWeight: "700" },
  body: { padding: 12 },
});
