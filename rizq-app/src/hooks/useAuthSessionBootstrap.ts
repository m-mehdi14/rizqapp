import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authSessionMe } from "../api/rizqApi";
import { useAppStore } from "../store/useAppStore";

const TOKEN_KEY = "rizq.auth.token";
let inMemoryToken: string | null = null;

async function safeGetToken(): Promise<string | null> {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (token) inMemoryToken = token;
    return token ?? inMemoryToken;
  } catch {
    return inMemoryToken;
  }
}

async function safeRemoveToken(): Promise<void> {
  inMemoryToken = null;
  try {
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch {
    // Ignore when native storage module isn't available yet.
  }
}

async function safeSetToken(token: string): Promise<void> {
  inMemoryToken = token;
  try {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Ignore when native storage module isn't available yet.
  }
}

export function useAuthSessionBootstrap() {
  const [ready, setReady] = useState(false);
  const setAuthSession = useAppStore((s) => s.setAuthSession);
  const setProfileIdentity = useAppStore((s) => s.setProfileIdentity);
  const setWallet = useAppStore((s) => s.setWallet);
  const setKycStatus = useAppStore((s) => s.setKycStatus);
  const setHasCompletedOnboarding = useAppStore((s) => s.setHasCompletedOnboarding);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const token = await safeGetToken();
        if (!token) {
          if (mounted) setReady(true);
          return;
        }
        const user = await authSessionMe(token);
        if (!mounted) return;
        setAuthSession({ token, email: user.email, userId: user.id });
        setProfileIdentity({
          displayName: user.display_name ?? undefined,
          username: user.username ?? undefined,
        });
        if (user.wallet_address && !user.wallet_address.startsWith("pending-")) {
          setWallet(user.wallet_address);
        }
        setKycStatus(user.kyc_status === "verified" ? "verified" : "unverified");
        setHasCompletedOnboarding(Boolean(user.onboarding_completed));
      } catch {
        await safeRemoveToken();
      } finally {
        if (mounted) setReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [setAuthSession, setHasCompletedOnboarding, setKycStatus, setProfileIdentity, setWallet]);

  return { ready };
}

export async function persistAuthToken(token: string | null): Promise<void> {
  if (!token) {
    await safeRemoveToken();
    return;
  }
  await safeSetToken(token);
}
