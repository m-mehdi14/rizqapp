import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { registerDevicePushToken } from "../api/rizqApi";
import { useAppStore } from "../store/useAppStore";

const PUSH_TOKEN_KEY = "rizq.device.pushToken";

export function usePushNotifications() {
  const wallet = useAppStore((s) => s.wallet);
  const username = useAppStore((s) => s.username);
  const displayName = useAppStore((s) => s.displayName);
  const [devicePushToken, setDevicePushTokenState] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(PUSH_TOKEN_KEY)
      .then((token) => {
        if (token) setDevicePushTokenState(token);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!wallet || !devicePushToken) return;
    registerDevicePushToken({
      wallet,
      devicePushToken,
      username: username || undefined,
      displayName: displayName || undefined,
    }).catch(() => undefined);
  }, [devicePushToken, displayName, username, wallet]);

  const saveDevicePushToken = async (token: string) => {
    const trimmed = token.trim();
    if (!trimmed) return;
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, trimmed);
    setDevicePushTokenState(trimmed);
  };

  return { devicePushToken, saveDevicePushToken };
}
