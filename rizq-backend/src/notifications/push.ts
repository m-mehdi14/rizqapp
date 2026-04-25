/** Send push — wire FCM/APNs provider in production. */
export async function sendPush(
  token: string | null | undefined,
  title: string,
  body: string
): Promise<void> {
  if (!token) {
    console.warn("[push] no token, skipping");
    return;
  }
  console.log("[push] token present; configure provider for production:", {
    title,
    bodyPreview: body.slice(0, 80),
    tokenPreview: `${token.slice(0, 6)}...${token.slice(-4)}`,
  });
}

export function getPushTokenFromUser(row: { device_push_token?: string | null }): string | undefined {
  return row.device_push_token ?? undefined;
}
