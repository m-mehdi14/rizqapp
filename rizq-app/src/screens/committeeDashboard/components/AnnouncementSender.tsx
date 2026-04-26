import React from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radii, typography } from "../../../theme/tokens";

type Props = {
  value: string;
  onChange: (text: string) => void;
  onSend: () => void;
  sending?: boolean;
  hideComposer?: boolean;
  recent?: Array<{ id: string; title: string; message: string; created_at: string }>;
};

export function AnnouncementSender({ value, onChange, onSend, sending, recent, hideComposer }: Props) {
  return (
    <View style={styles.wrap}>
      {!hideComposer ? (
        <>
          <Text style={styles.heading}>Send Announcement</Text>
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={onChange}
            placeholder="Type message for all members..."
            placeholderTextColor={colors.textMuted}
            multiline
          />
          <Pressable
            style={styles.button}
            onPress={onSend}
            disabled={sending}
          >
            <Text style={styles.buttonText}>{sending ? "Sending..." : "Send to All"}</Text>
          </Pressable>
        </>
      ) : null}
      {recent && recent.length > 0 ? (
        <View style={styles.recentWrap}>
          <Text style={styles.recentHeading}>Recent announcements</Text>
          {recent.slice(0, 3).map((item) => (
            <Text key={item.id} style={styles.recentItem}>
              {`${item.created_at.slice(0, 10)} • ${item.title}: ${item.message}`}
            </Text>
          ))}
        </View>
      ) : (
        <Text style={styles.recentItem}>No announcements yet.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  heading: { color: colors.textSecondary, fontSize: typography.caption, textTransform: "uppercase", letterSpacing: 0.8, fontWeight: "700" },
  input: {
    minHeight: 88,
    borderRadius: radii.input,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.04)",
    color: colors.textPrimary,
    paddingHorizontal: 12,
    paddingTop: 12,
    textAlignVertical: "top",
    fontSize: typography.bodySmall,
  },
  button: {
    minHeight: 44,
    borderRadius: radii.button,
    backgroundColor: "rgba(64,196,255,0.22)",
    borderWidth: 1,
    borderColor: "rgba(64,196,255,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { color: colors.textPrimary, fontSize: typography.bodySmall, fontWeight: "700" },
  recentWrap: { gap: 4 },
  recentHeading: { color: colors.textSecondary, fontSize: typography.caption, fontWeight: "700" },
  recentItem: { color: colors.textPrimary, fontSize: typography.caption },
});
