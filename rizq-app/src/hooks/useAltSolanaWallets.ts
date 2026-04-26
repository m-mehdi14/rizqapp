import { useCallback } from "react";
import { AppState, Linking } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { Connection, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { API_URL, DAPP_URL, SOLANA_RPC_URL } from "../config";
import { useAppStore, type WalletProvider } from "../store/useAppStore";

const SOLFLARE_UNIVERSAL = "https://solflare.com/ul/v1";
const BACKPACK_UNIVERSAL = "https://backpack.app/ul/v1";
const ALT_DAPP_SECRET_STORAGE_KEY = "rizq.altwallet.dapp.secret.v1";
const connection = new Connection(SOLANA_RPC_URL, "confirmed");
let cachedDappKeyPair: nacl.BoxKeyPair | null = null;

type AltSession = {
  walletPublicKey?: string;
  walletEncryptionPublicKey?: Uint8Array;
  session?: string;
};
const altSessions: Record<WalletProvider, AltSession> = {
  phantom: {},
  embedded: {},
  solflare: {},
  backpack: {},
};

function safeDappUrl(): string {
  if (DAPP_URL.startsWith("https://") || DAPP_URL.startsWith("http://")) return DAPP_URL;
  if (API_URL.startsWith("https://") || API_URL.startsWith("http://")) return API_URL;
  return "https://rizq.app";
}

function isRizqDeepLink(url: string | null | undefined): boolean {
  if (!url) return false;
  return /^rizq:/i.test(url);
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
    const hIdx = url.indexOf("#");
    if (hIdx >= 0) return new URLSearchParams(url.slice(hIdx + 1));
    return new URLSearchParams();
  }
}

async function getOrCreateDappKeyPair(): Promise<nacl.BoxKeyPair> {
  if (cachedDappKeyPair) return cachedDappKeyPair;
  try {
    const savedSecret = await AsyncStorage.getItem(ALT_DAPP_SECRET_STORAGE_KEY);
    if (savedSecret) {
      const secretKey = bs58.decode(savedSecret);
      if (secretKey.length === 32) {
        cachedDappKeyPair = nacl.box.keyPair.fromSecretKey(secretKey);
        return cachedDappKeyPair;
      }
    }
  } catch {
    // Fall through.
  }
  const generated = nacl.box.keyPair();
  cachedDappKeyPair = generated;
  try {
    await AsyncStorage.setItem(ALT_DAPP_SECRET_STORAGE_KEY, bs58.encode(generated.secretKey));
  } catch {
    // ignore storage failures
  }
  return generated;
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

function tryDecodeWalletFromParams(
  provider: WalletProvider,
  params: URLSearchParams,
  dappKeyPair: nacl.BoxKeyPair
): string | null {
  const walletPk = params.get("public_key") ?? params.get("wallet");
  if (walletPk && walletPk.length > 30) {
    altSessions[provider].walletPublicKey = walletPk;
    return walletPk;
  }

  const walletEncryptionPk =
    params.get("solflare_encryption_public_key") ??
    params.get("backpack_encryption_public_key") ??
    params.get("phantom_encryption_public_key");
  const nonceRaw = params.get("nonce");
  const dataRaw = params.get("data");
  if (!walletEncryptionPk || !nonceRaw || !dataRaw) return null;
  try {
    const walletPkBytes = bs58.decode(walletEncryptionPk);
    altSessions[provider].walletEncryptionPublicKey = walletPkBytes;
    const sharedSecret = nacl.box.before(walletPkBytes, dappKeyPair.secretKey);
    const payload = decodePayloadData(params, sharedSecret);
    const decodedWallet = payload?.public_key as string | undefined;
    const session = payload?.session;
    if (typeof session === "string" && session.trim().length > 0) {
      altSessions[provider].session = session;
    }
    if (decodedWallet && decodedWallet.length > 30) {
      altSessions[provider].walletPublicKey = decodedWallet;
      return decodedWallet;
    }
  } catch {
    return null;
  }
  return null;
}

async function connectViaUniversal(
  provider: WalletProvider,
  universalBase: string,
  setWallet: (wallet: string | null, provider?: WalletProvider | null) => void
): Promise<string> {
  const dappKeyPair = await getOrCreateDappKeyPair();
  const redirect = "rizq://onConnect";
  const params = new URLSearchParams({
    app_url: safeDappUrl(),
    redirect_link: redirect,
    dapp_encryption_public_key: bs58.encode(dappKeyPair.publicKey),
    cluster: "devnet",
  });
  const connectUrl = `${universalBase}/connect?${params.toString()}`;

  return await new Promise<string>((resolve, reject) => {
    let settled = false;
    const settleSuccess = (value: string) => {
      if (settled) return;
      settled = true;
      sub.remove();
      appSub.remove();
      clearTimeout(timeoutId);
      clearInterval(pollId);
      resolve(value);
    };
    const settleError = (message: string) => {
      if (settled) return;
      settled = true;
      sub.remove();
      appSub.remove();
      clearTimeout(timeoutId);
      clearInterval(pollId);
      reject(new Error(message));
    };
    const processUrl = (url: string | null | undefined) => {
      if (!isRizqDeepLink(url)) return;
      const params = readParamsFromUrl(url);
      const errorCode = params.get("errorCode") ?? params.get("error_code");
      if (errorCode) {
        settleError(`${provider} connection rejected (${errorCode}).`);
        return;
      }
      const wallet = tryDecodeWalletFromParams(provider, params, dappKeyPair);
      if (wallet) {
        setWallet(wallet, provider);
        settleSuccess(wallet);
        return;
      }
      const store = useAppStore.getState();
      if (store.walletProvider === provider && store.wallet && store.wallet.length > 30) {
        settleSuccess(store.wallet);
      }
    };
    const timeoutId = setTimeout(() => {
      settleError(`Timed out waiting for ${provider} callback.`);
    }, 35000);
    const sub = Linking.addEventListener("url", (e) => processUrl(e.url));
    const appSub = AppState.addEventListener("change", (state) => {
      if (state === "active") Linking.getInitialURL().then(processUrl).catch(() => undefined);
    });
    const pollId = setInterval(() => {
      Linking.getInitialURL().then(processUrl).catch(() => undefined);
      const store = useAppStore.getState();
      if (store.walletProvider === provider && store.wallet && store.wallet.length > 30) {
        settleSuccess(store.wallet);
      }
    }, 1200);

    Linking.openURL(connectUrl)
      .then(() => Linking.getInitialURL().then(processUrl).catch(() => undefined))
      .catch(() => settleError(`Could not open ${provider} app.`));
  });
}

async function signAndSendViaUniversal(
  provider: "solflare" | "backpack",
  universalBase: string,
  walletAddress: string
): Promise<string> {
  const dappKeyPair = await getOrCreateDappKeyPair();
  const providerSession = altSessions[provider];
  if (!providerSession.session || !providerSession.walletEncryptionPublicKey) {
    throw new Error(`${provider} session missing. Reconnect ${provider} wallet first.`);
  }
  const sharedSecret = nacl.box.before(providerSession.walletEncryptionPublicKey, dappKeyPair.secretKey);
  const from = new PublicKey(walletAddress);
  const latest = await connection.getLatestBlockhash("confirmed");
  const tx = new Transaction({
    feePayer: from,
    blockhash: latest.blockhash,
    lastValidBlockHeight: latest.lastValidBlockHeight,
  }).add(
    SystemProgram.transfer({
      fromPubkey: from,
      toPubkey: from,
      lamports: 1,
    })
  );

  const encodedTx = bs58.encode(
    tx.serialize({ requireAllSignatures: false, verifySignatures: false })
  );
  const encrypted = encodePayloadData(
    {
      session: providerSession.session,
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
  const url = `${universalBase}/signAndSendTransaction?${params.toString()}`;
  await Linking.openURL(url);

  return await new Promise<string>((resolve, reject) => {
    let settled = false;
    const settleSuccess = (value: string) => {
      if (settled) return;
      settled = true;
      sub.remove();
      clearTimeout(timeoutId);
      clearInterval(pollId);
      resolve(value);
    };
    const settleError = (message: string) => {
      if (settled) return;
      settled = true;
      sub.remove();
      clearTimeout(timeoutId);
      clearInterval(pollId);
      reject(new Error(message));
    };
    const processUrl = (url: string | null | undefined) => {
      if (!isRizqDeepLink(url)) return;
      const params = readParamsFromUrl(url);
      const err = params.get("errorCode") ?? params.get("error_code");
      if (err) {
        settleError(`${provider} rejected signature (${err}).`);
        return;
      }
      const payload = decodePayloadData(params, sharedSecret);
      const sig = payload?.signature;
      if (typeof sig === "string" && sig.trim().length > 0) {
        settleSuccess(sig);
        return;
      }
      const directSig = params.get("signature");
      if (directSig && directSig.trim().length > 0) {
        settleSuccess(directSig);
      }
    };
    const timeoutId = setTimeout(() => {
      settleError(`Timed out waiting for ${provider} signature callback.`);
    }, 60000);
    const sub = Linking.addEventListener("url", (e) => processUrl(e.url));
    const pollId = setInterval(() => {
      Linking.getInitialURL().then(processUrl).catch(() => undefined);
    }, 1200);
    Linking.getInitialURL().then(processUrl).catch(() => undefined);
  });
}

export function useAltSolanaWallets() {
  const setWalletConnection = useAppStore((s) => s.setWalletConnection);

  const connectSolflare = useCallback(async () => {
    return await connectViaUniversal("solflare", SOLFLARE_UNIVERSAL, setWalletConnection);
  }, [setWalletConnection]);

  const connectBackpack = useCallback(async () => {
    return await connectViaUniversal("backpack", BACKPACK_UNIVERSAL, setWalletConnection);
  }, [setWalletConnection]);

  const signAndSendWithSolflare = useCallback(
    async (walletAddress: string) => {
      return await signAndSendViaUniversal("solflare", SOLFLARE_UNIVERSAL, walletAddress);
    },
    []
  );

  const signAndSendWithBackpack = useCallback(
    async (walletAddress: string) => {
      return await signAndSendViaUniversal("backpack", BACKPACK_UNIVERSAL, walletAddress);
    },
    []
  );

  return {
    connectSolflare,
    connectBackpack,
    signAndSendWithSolflare,
    signAndSendWithBackpack,
  };
}

