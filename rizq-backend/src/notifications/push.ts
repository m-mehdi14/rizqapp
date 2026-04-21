import { config } from "../config";

/** Send push — wire FCM HTTP v1 or Expo when tokens are present */
export async function sendPush(
  token: string | null | undefined,
  title: string,
  body: string
): Promise<void> {
  if (!token) {
    console.warn("[push] no token, skipping");
    return;
  }
  if (token.startsWith("ExponentPushToken")) {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: token,
        title,
        body,
        sound: "default",
      }),
    });
    return;
  }
  console.log("[push] FCM token present; configure Firebase Admin for production:", {
    title,
    bodyPreview: body.slice(0, 80),
  });
}

export function getPushTokenFromUser(row: {
  fcm_token?: string | null;
  expo_push_token?: string | null;
}): string | undefined {
  return row.fcm_token ?? row.expo_push_token ?? undefined;
}
