import { useCallback, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Connection, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import * as WebBrowser from "@toruslabs/react-native-web-browser";
import Web3Auth, { LOGIN_PROVIDER, WEB3AUTH_NETWORK } from "@web3auth/react-native-sdk";
import { SolanaPrivateKeyProvider, SolanaWallet } from "@web3auth/solana-provider";
import { SOLANA_RPC_URL, WEB3AUTH_CLIENT_ID, WEB3AUTH_REDIRECT_URL } from "../config";
import { useAppStore } from "../store/useAppStore";

const connection = new Connection(SOLANA_RPC_URL, "confirmed");

const chainConfig = {
  chainNamespace: "solana" as const,
  chainId: "0x3",
  rpcTarget: SOLANA_RPC_URL,
  displayName: "Solana Devnet",
  ticker: "SOL",
  tickerName: "Solana",
};

let web3auth: Web3Auth | null = null;
let web3authRedirectUrl: string | null = null;
const web3AuthStorage = {
  setItem: async (key: string, value: string) => {
    await AsyncStorage.setItem(key, value);
  },
  getItem: async (key: string) => await AsyncStorage.getItem(key),
  removeItem: async (key: string) => {
    await AsyncStorage.removeItem(key);
  },
  clear: async () => {
    // Avoid clearing unrelated app/session keys.
    return;
  },
};

async function getWeb3AuthClient(redirectUrl: string) {
  if (web3auth && web3authRedirectUrl === redirectUrl) return web3auth;
  const privateKeyProvider = new SolanaPrivateKeyProvider({
    config: {
      chainConfig,
    },
  });
  web3auth = new Web3Auth(WebBrowser, web3AuthStorage, {
    clientId: WEB3AUTH_CLIENT_ID,
    network: WEB3AUTH_NETWORK.SAPPHIRE_DEVNET,
    redirectUrl,
    privateKeyProvider,
  });
  await web3auth.init();
  web3authRedirectUrl = redirectUrl;
  return web3auth;
}

export function useWeb3AuthWallet() {
  const setWalletConnection = useAppStore((s) => s.setWalletConnection);
  const wallet = useAppStore((s) => s.wallet);
  const walletProvider = useAppStore((s) => s.walletProvider);

  const isConfigured = WEB3AUTH_CLIENT_ID.trim().length > 0;
  const hasValidRedirect = WEB3AUTH_REDIRECT_URL.includes("://");

  const getRedirectCandidates = useCallback((): string[] => {
    const configured = WEB3AUTH_REDIRECT_URL.trim();
    const candidates: string[] = [];
    if (configured.includes("://")) {
      candidates.push(configured);
    }
    // Keep compatibility with both configured schemes across APK builds.
    const defaults = ["com.rizqapp://auth", "rizq://auth"];
    defaults.forEach((value) => {
      if (!candidates.includes(value)) {
        candidates.push(value);
      }
    });
    return candidates;
  }, []);

  const connectWeb3AuthWallet = useCallback(async () => {
    if (!isConfigured) {
      throw new Error("Web3Auth is not configured. Add RIZQ_WEB3AUTH_CLIENT_ID in app env.");
    }
    if (!hasValidRedirect) {
      throw new Error("Web3Auth redirect URL is invalid. Set RIZQ_WEB3AUTH_REDIRECT_URL like com.rizqapp://auth.");
    }
    const redirectCandidates = getRedirectCandidates();
    let lastError = "unknown";
    for (const redirectUrl of redirectCandidates) {
      try {
        const client = await getWeb3AuthClient(redirectUrl);
        const provider = await client.login({
          loginProvider: LOGIN_PROVIDER.GOOGLE,
          redirectUrl,
          curve: "ed25519",
        });
        if (!provider) continue;
        const solanaWallet = new SolanaWallet(provider);
        const accounts = await solanaWallet.requestAccounts();
        const address = accounts[0];
        if (!address) throw new Error("No wallet account received from Web3Auth.");
        setWalletConnection(address, "embedded");
        return address;
      } catch (error) {
        lastError = error instanceof Error ? error.message : "unknown";
        // Force client re-init on next redirect candidate / retry.
        web3auth = null;
        web3authRedirectUrl = null;
      }
    }
    if (lastError.toLowerCase().includes("digest")) {
      throw new Error(
        "Web3Auth dashboard setup is incomplete. Set Product and Platform=React Native, and add redirect URIs com.rizqapp://auth and rizq://auth."
      );
    }
    throw new Error(
      `Web3Auth login failed (${lastError}). Add these redirect URLs in Web3Auth dashboard: com.rizqapp://auth and rizq://auth`
    );
  }, [getRedirectCandidates, hasValidRedirect, isConfigured, setWalletConnection]);

  const logoutWeb3AuthWallet = useCallback(async () => {
    if (web3auth) {
      await web3auth.logout();
    }
    if (walletProvider === "embedded") {
      setWalletConnection(null, null);
    }
  }, [setWalletConnection, walletProvider]);

  const signAndSendDevnetProofTx = useCallback(
    async (walletAddress: string): Promise<string> => {
      if (!isConfigured) {
        throw new Error("Web3Auth is not configured.");
      }
      if (!hasValidRedirect) {
        throw new Error("Web3Auth redirect URL is invalid.");
      }
      const client = await getWeb3AuthClient(getRedirectCandidates()[0] ?? "com.rizqapp://auth");
      if (!client.provider) {
        throw new Error("Web3Auth wallet session expired. Please reconnect.");
      }
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
      const solanaWallet = new SolanaWallet(client.provider);
      const result = await solanaWallet.signAndSendTransaction(tx);
      const signature =
        typeof result === "string"
          ? result
          : typeof (result as { signature?: unknown })?.signature === "string"
            ? ((result as { signature: string }).signature)
            : null;
      if (!signature) throw new Error("No signature returned from Web3Auth wallet.");
      await connection.confirmTransaction(
        {
          signature,
          blockhash: latest.blockhash,
          lastValidBlockHeight: latest.lastValidBlockHeight,
        },
        "confirmed"
      );
      return signature;
    },
    [getRedirectCandidates, hasValidRedirect, isConfigured]
  );

  return useMemo(
    () => ({
      isConfigured,
      isActive: walletProvider === "embedded" && Boolean(wallet),
      connectWeb3AuthWallet,
      logoutWeb3AuthWallet,
      signAndSendDevnetProofTx,
    }),
    [
      connectWeb3AuthWallet,
      isConfigured,
      logoutWeb3AuthWallet,
      signAndSendDevnetProofTx,
      wallet,
      walletProvider,
    ]
  );
}
