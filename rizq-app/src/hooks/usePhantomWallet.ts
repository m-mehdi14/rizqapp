import { useCallback, useEffect, useMemo } from "react";
import { Linking } from "react-native";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { DAPP_URL, PHANTOM_UNIVERSAL } from "../config";
import { useAppStore } from "../store/useAppStore";

/**
 * Phantom Mobile Universal Link connect (partial).
 * Production flow must decrypt Phantom payload per Phantom docs.
 */
export function usePhantomWallet() {
  const setWallet = useAppStore((s) => s.setWallet);
  const dappKeyPair = useMemo(() => nacl.box.keyPair(), []);

  const handleUrl = useCallback(
    (url: string | null | undefined) => {
      if (!url) return;
      try {
        if (url.startsWith("rizq://")) {
          const rest = url.slice("rizq://".length);
          const qIdx = rest.indexOf("?");
          const query = qIdx >= 0 ? rest.slice(qIdx + 1) : "";
          const params = new URLSearchParams(query);
          const pk =
            params.get("public_key") ??
            params.get("wallet") ??
            params.get("phantom_encryption_public_key");
          if (pk && pk.length > 30) {
            setWallet(pk);
          }
          return;
        }
        const u = new URL(url);
        const pk =
          u.searchParams.get("phantom_encryption_public_key") ??
          u.searchParams.get("public_key") ??
          u.searchParams.get("wallet");
        if (pk && pk.length > 30) {
          setWallet(pk);
        }
      } catch {
        // ignore malformed deep links
      }
    },
    [setWallet]
  );

  useEffect(() => {
    const sub = Linking.addEventListener("url", (e) => handleUrl(e.url));
    Linking.getInitialURL().then(handleUrl);
    return () => sub.remove();
  }, [handleUrl]);

  const connect = useCallback(async () => {
    const redirect = "rizq://onConnect";
    const params = new URLSearchParams({
      app_url: DAPP_URL,
      redirect_link: redirect,
      dapp_encryption_public_key: bs58.encode(dappKeyPair.publicKey),
    });
    const url = `${PHANTOM_UNIVERSAL}/connect?${params.toString()}`;
    await Linking.openURL(url);
  }, [dappKeyPair.publicKey]);

  return {
    connect,
    dappEncryptionPublicKey: bs58.encode(dappKeyPair.publicKey),
  };
}
