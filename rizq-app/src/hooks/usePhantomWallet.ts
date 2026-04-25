import { useCallback, useEffect } from "react";
import { AppState, Linking } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { Connection, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { DAPP_URL, PHANTOM_UNIVERSAL, SOLANA_RPC_URL } from "../config";
import { useAppStore } from "../store/useAppStore";

type PhantomSessionState = {
  phantomEncryptionPublicKey?: Uint8Array;
  session?: string;
  walletPublicKey?: string;
};

const phantomSession: PhantomSessionState = {};
const connection = new Connection(SOLANA_RPC_URL, "confirmed");
const DAPP_SECRET_STORAGE_KEY = "rizq.phantom.dapp.secret.v1";
const PHANTOM_SESSION_STORAGE_KEY = "rizq.phantom.session.v1";
let cachedDappKeyPair: nacl.BoxKeyPair | null = null;

type StoredPhantomSession = {
  phantom_encryption_public_key?: string;
  session?: string;
  wallet_public_key?: string;
};

async function getOrCreateDappKeyPair(): Promise<nacl.BoxKeyPair> {
  if (cachedDappKeyPair) return cachedDappKeyPair;
  try {
    const savedSecret = await AsyncStorage.getItem(DAPP_SECRET_STORAGE_KEY);
    if (savedSecret) {
      const secretKey = bs58.decode(savedSecret);
      if (secretKey.length === 32) {
        cachedDappKeyPair = nacl.box.keyPair.fromSecretKey(secretKey);
        return cachedDappKeyPair;
      }
    }
  } catch {
    // Fall through to keypair generation.
  }
  const generated = nacl.box.keyPair();
  cachedDappKeyPair = generated;
  try {
    await AsyncStorage.setItem(DAPP_SECRET_STORAGE_KEY, bs58.encode(generated.secretKey));
  } catch {
    // Ignore storage errors; in-memory key will still work.
  }
  return generated;
}

function safePhantomAppUrl(): string {
  if (DAPP_URL.startsWith("https://") || DAPP_URL.startsWith("http://")) {
    return DAPP_URL;
  }
  return "https://rizq.app";
}

function decodePayloadData(params: URLSearchParams, sharedSecret: Uint8Array): Record<string, unknown> | null {
  const nonceRaw = params.get("nonce");
  const dataRaw = params.get("data");
  if (!nonceRaw || !dataRaw) return null;
  try {
    const nonce = bs58.decode(nonceRaw);
    const encryptedData = bs58.decode(dataRaw);
    const decrypted = nacl.box.open.after(encryptedData, nonce, sharedSecret);
    if (!decrypted) return null;
    const text = new TextDecoder().decode(decrypted);
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function encodePayloadData(payload: Record<string, unknown>, sharedSecret: Uint8Array): { nonce: string; data: string } {
  const nonce = nacl.randomBytes(24);
  const encoded = new TextEncoder().encode(JSON.stringify(payload));
  const encrypted = nacl.box.after(encoded, nonce, sharedSecret);
  return {
    nonce: bs58.encode(nonce),
    data: bs58.encode(encrypted),
  };
}

function readParamsFromUrl(url: string): URLSearchParams {
  try {
    const parsed = new URL(url);
    const hasSearch = parsed.searchParams && Array.from(parsed.searchParams.keys()).length > 0;
    if (hasSearch) return parsed.searchParams;
    if (parsed.hash && parsed.hash.length > 1) {
      const hash = parsed.hash.startsWith("#") ? parsed.hash.slice(1) : parsed.hash;
      return new URLSearchParams(hash);
    }
    return new URLSearchParams();
  } catch {
    const qIdx = url.indexOf("?");
    if (qIdx >= 0) return new URLSearchParams(url.slice(qIdx + 1));
    return new URLSearchParams();
  }
}

function isRizqDeepLink(url: string | null | undefined): boolean {
  if (!url) return false;
  return /^rizq:/i.test(url);
}

async function restorePhantomSessionFromStorage(
  setWallet: (wallet: string, provider?: "phantom" | "embedded" | null) => void
) {
  try {
    const raw = await AsyncStorage.getItem(PHANTOM_SESSION_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as StoredPhantomSession;
    if (parsed.phantom_encryption_public_key) {
      try {
        phantomSession.phantomEncryptionPublicKey = bs58.decode(parsed.phantom_encryption_public_key);
      } catch {
        phantomSession.phantomEncryptionPublicKey = undefined;
      }
    }
    if (parsed.session && parsed.session.trim().length > 0) {
      phantomSession.session = parsed.session;
    }
    if (parsed.wallet_public_key && parsed.wallet_public_key.trim().length > 30) {
      phantomSession.walletPublicKey = parsed.wallet_public_key;
      setWallet(parsed.wallet_public_key, "phantom");
    }
  } catch {
    // Ignore malformed cached session.
  }
}

async function persistPhantomSessionToStorage() {
  const payload: StoredPhantomSession = {
    phantom_encryption_public_key: phantomSession.phantomEncryptionPublicKey
      ? bs58.encode(phantomSession.phantomEncryptionPublicKey)
      : undefined,
    session: phantomSession.session,
    wallet_public_key: phantomSession.walletPublicKey,
  };
  try {
    await AsyncStorage.setItem(PHANTOM_SESSION_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage issues and keep in-memory session.
  }
}

async function openPhantomDeepLinkWithFallback(nativeUrl: string, universalUrl: string): Promise<void> {
  try {
    // Try Phantom app scheme first; this is more reliable for Android APK installs.
    await Linking.openURL(nativeUrl);
    return;
  } catch {
    await Linking.openURL(universalUrl);
  }
}

function tryHandlePhantomCallback(
  url: string,
  setWallet: (wallet: string, provider?: "phantom" | "embedded" | null) => void,
  dappKeyPair: nacl.BoxKeyPair
): string | null {
  if (!isRizqDeepLink(url)) return null;
  const params = readParamsFromUrl(url);
  const phantomPk = params.get("phantom_encryption_public_key");
  if (phantomPk) {
    try {
      phantomSession.phantomEncryptionPublicKey = bs58.decode(phantomPk);
      const sharedSecret = nacl.box.before(
        phantomSession.phantomEncryptionPublicKey,
        dappKeyPair.secretKey
      );
      const payload = decodePayloadData(params, sharedSecret);
      const walletPk =
        (payload?.public_key as string | undefined) ??
        params.get("public_key") ??
        params.get("wallet");
      const session = payload?.session;
      if (typeof session === "string" && session.trim().length > 0) {
        phantomSession.session = session;
      }
      if (walletPk && walletPk.length > 30) {
        phantomSession.walletPublicKey = walletPk;
        setWallet(walletPk, "phantom");
        persistPhantomSessionToStorage().catch(() => undefined);
        return walletPk;
      }
    } catch {
      // Continue to non-encrypted fallback handling.
    }
  }
  const walletPk = params.get("public_key") ?? params.get("wallet");
  if (walletPk && walletPk.length > 30) {
    phantomSession.walletPublicKey = walletPk;
    setWallet(walletPk, "phantom");
    persistPhantomSessionToStorage().catch(() => undefined);
    return walletPk;
  }
  return null;
}

export function usePhantomWallet() {
  const setWallet = useAppStore((s) => s.setWalletConnection);
  const getSharedSecret = useCallback(async () => {
    const dappKeyPair = await getOrCreateDappKeyPair();
    if (!phantomSession.phantomEncryptionPublicKey) {
      throw new Error("Phantom session not established. Reconnect wallet.");
    }
    return nacl.box.before(phantomSession.phantomEncryptionPublicKey, dappKeyPair.secretKey);
  }, []);

  const handleUrl = useCallback(
    (url: string | null | undefined) => {
      if (!url) return;
      getOrCreateDappKeyPair()
        .then((dappKeyPair) => {
          try {
            const handledWallet = tryHandlePhantomCallback(url, setWallet, dappKeyPair);
            if (handledWallet) return;
            const u = new URL(url);
            const pk = u.searchParams.get("public_key") ?? u.searchParams.get("wallet");
            if (pk && pk.length > 30) setWallet(pk, "phantom");
          } catch {
            // ignore malformed deep links
          }
        })
        .catch(() => undefined);
    },
    [setWallet]
  );

  useEffect(() => {
    restorePhantomSessionFromStorage(setWallet).catch(() => undefined);
    const sub = Linking.addEventListener("url", (e) => handleUrl(e.url));
    Linking.getInitialURL().then(handleUrl);
    const appStateSub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        Linking.getInitialURL().then(handleUrl).catch(() => undefined);
      }
    });
    return () => {
      sub.remove();
      appStateSub.remove();
    };
  }, [handleUrl, setWallet]);

  const connect = useCallback(async (): Promise<string> => {
    const dappKeyPair = await getOrCreateDappKeyPair();
    const redirect = "rizq://onConnect";
    const params = new URLSearchParams({
      app_url: safePhantomAppUrl(),
      redirect_link: redirect,
      dapp_encryption_public_key: bs58.encode(dappKeyPair.publicKey),
      cluster: "devnet",
    });
    const query = params.toString();
    const phantomUniversalUrl = `${PHANTOM_UNIVERSAL}/connect?${query}`;
    const phantomNativeUrl = `phantom://v1/connect?${query}`;

    return await new Promise<string>((resolve, reject) => {
      let settled = false;
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      let pollId: ReturnType<typeof setInterval> | undefined;
      const sub = Linking.addEventListener("url", (event) => {
        processCallbackUrl(event.url);
      });

      const settleSuccess = (value: string) => {
        if (settled) return;
        settled = true;
        if (timeoutId) clearTimeout(timeoutId);
        if (pollId) clearInterval(pollId);
        sub.remove();
        resolve(value);
      };
      const settleError = (message: string) => {
        if (settled) return;
        settled = true;
        if (timeoutId) clearTimeout(timeoutId);
        if (pollId) clearInterval(pollId);
        sub.remove();
        reject(new Error(message));
      };

      const processCallbackUrl = (url: string | null | undefined) => {
        if (!isRizqDeepLink(url)) return;
        const walletPk = tryHandlePhantomCallback(url, setWallet, dappKeyPair);
        if (walletPk) {
          settleSuccess(walletPk);
          return;
        }
        const callbackParams = readParamsFromUrl(url);
        const errorCode = callbackParams.get("errorCode") ?? callbackParams.get("error_code");
        if (errorCode) {
          settleError(`Phantom connection rejected (${errorCode}).`);
        }
      };

      timeoutId = setTimeout(() => {
        settleError("Timed out waiting for Phantom callback. Please return to app after approving.");
      }, 35000);

      // Some Android builds miss the url event after app resume.
      pollId = setInterval(() => {
        Linking.getInitialURL().then(processCallbackUrl).catch(() => undefined);
      }, 1200);

      Linking.getInitialURL().then(processCallbackUrl).catch(() => undefined);

      (async () => {
        try {
          // Prefer Phantom native deep-link on Android; fallback to universal link.
          await openPhantomDeepLinkWithFallback(phantomNativeUrl, phantomUniversalUrl);
          return;
        } catch {
          settleError("Could not open Phantom app on this device.");
        }
      })().catch(() => settleError("Could not start Phantom connection."));
    });
  }, [setWallet]);

  const signAndSendDevnetProofTx = useCallback(
    async (walletAddress: string): Promise<string> => {
      const session = phantomSession.session;
      if (!session) {
        throw new Error("Phantom session missing. Reconnect your wallet in Phantom.");
      }
      const from = new PublicKey(walletAddress);
      const latest = await connection.getLatestBlockhash("confirmed");
      const tx = new Transaction({
        feePayer: from,
        blockhash: latest.blockhash,
        lastValidBlockHeight: latest.lastValidBlockHeight,
      }).add(
        // Devnet proof tx: a tiny self-transfer signed by user wallet.
        SystemProgram.transfer({
          fromPubkey: from,
          toPubkey: from,
          lamports: 1,
        })
      );

      const dappKeyPair = await getOrCreateDappKeyPair();
      const sharedSecret = await getSharedSecret();
      const encodedTx = bs58.encode(
        tx.serialize({ requireAllSignatures: false, verifySignatures: false })
      );
      const encrypted = encodePayloadData(
        {
          session,
          transaction: encodedTx,
        },
        sharedSecret
      );

      const redirect = "rizq://onSignAndSendTransaction";
      const params = new URLSearchParams({
        dapp_encryption_public_key: bs58.encode(dappKeyPair.publicKey),
        nonce: encrypted.nonce,
        redirect_link: redirect,
        payload: encrypted.data,
        cluster: "devnet",
      });
      const query = params.toString();
      const phantomUniversalUrl = `${PHANTOM_UNIVERSAL}/signAndSendTransaction?${query}`;
      const phantomNativeUrl = `phantom://v1/signAndSendTransaction?${query}`;
      await openPhantomDeepLinkWithFallback(phantomNativeUrl, phantomUniversalUrl);

      const signature = await new Promise<string>((resolve, reject) => {
        let settled = false;
        const timeoutId = setTimeout(() => {
          settled = true;
          sub.remove();
          if (pollId) clearInterval(pollId);
          reject(new Error("Timed out waiting for Phantom signature callback"));
        }, 60000);
        let pollId: ReturnType<typeof setInterval> | undefined;
        const sub = Linking.addEventListener("url", (event) => {
          if (settled) return;
          try {
            if (
              !event.url.startsWith("rizq://onSignAndSendTransaction") &&
              !event.url.startsWith("rizq://onSignAndSend") &&
              !event.url.startsWith("rizq:/onSignAndSendTransaction") &&
              !event.url.startsWith("rizq:/onSignAndSend")
            ) {
              return;
            }
            const callbackParams = readParamsFromUrl(event.url);
            const payload = decodePayloadData(callbackParams, sharedSecret);
            const sig = payload?.signature;
            if (typeof sig === "string" && sig.trim().length > 0) {
              settled = true;
              clearTimeout(timeoutId);
              if (pollId) clearInterval(pollId);
              sub.remove();
              resolve(sig);
              return;
            }
            const directSig = callbackParams.get("signature");
            if (directSig && directSig.trim().length > 0) {
              settled = true;
              clearTimeout(timeoutId);
              if (pollId) clearInterval(pollId);
              sub.remove();
              resolve(directSig);
              return;
            }
            const err = callbackParams.get("errorCode") ?? callbackParams.get("error_code");
            if (err) {
              settled = true;
              clearTimeout(timeoutId);
              if (pollId) clearInterval(pollId);
              sub.remove();
              reject(new Error(`Phantom rejected signature (${err})`));
            }
          } catch {
            // keep listening until timeout
          }
        });
        pollId = setInterval(() => {
          if (settled) return;
          Linking.getInitialURL()
            .then((initialUrl) => {
              if (!initialUrl) return;
              if (
                !initialUrl.startsWith("rizq://onSignAndSendTransaction") &&
                !initialUrl.startsWith("rizq://onSignAndSend") &&
                !initialUrl.startsWith("rizq:/onSignAndSendTransaction") &&
                !initialUrl.startsWith("rizq:/onSignAndSend")
              ) {
                return;
              }
              const callbackParams = readParamsFromUrl(initialUrl);
              const payload = decodePayloadData(callbackParams, sharedSecret);
              const sig = payload?.signature;
              const directSig = callbackParams.get("signature");
              if (typeof sig === "string" && sig.trim().length > 0) {
                settled = true;
                clearTimeout(timeoutId);
                if (pollId) clearInterval(pollId);
                sub.remove();
                resolve(sig);
                return;
              }
              if (directSig && directSig.trim().length > 0) {
                settled = true;
                clearTimeout(timeoutId);
                if (pollId) clearInterval(pollId);
                sub.remove();
                resolve(directSig);
              }
            })
            .catch(() => undefined);
        }, 1200);
      });

      return signature;
    },
    [getSharedSecret]
  );

  return {
    connect,
    signAndSendDevnetProofTx,
    dappEncryptionPublicKey: cachedDappKeyPair ? bs58.encode(cachedDappKeyPair.publicKey) : "",
  };
}
