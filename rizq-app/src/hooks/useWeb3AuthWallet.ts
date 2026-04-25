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

async function getWeb3AuthClient() {
  if (web3auth) return web3auth;
  const privateKeyProvider = new SolanaPrivateKeyProvider({
    config: {
      chainConfig,
    },
  });
  web3auth = new Web3Auth(WebBrowser, web3AuthStorage, {
    clientId: WEB3AUTH_CLIENT_ID,
    network: WEB3AUTH_NETWORK.SAPPHIRE_DEVNET,
    redirectUrl: WEB3AUTH_REDIRECT_URL,
    privateKeyProvider,
  });
  await web3auth.init();
  return web3auth;
}

export function useWeb3AuthWallet() {
  const setWalletConnection = useAppStore((s) => s.setWalletConnection);
  const wallet = useAppStore((s) => s.wallet);
  const walletProvider = useAppStore((s) => s.walletProvider);

  const isConfigured = WEB3AUTH_CLIENT_ID.trim().length > 0;

  const connectWeb3AuthWallet = useCallback(async () => {
    if (!isConfigured) {
      throw new Error("Web3Auth is not configured. Add RIZQ_WEB3AUTH_CLIENT_ID in app env.");
    }
    const client = await getWeb3AuthClient();
    const provider = await client.login({
      loginProvider: LOGIN_PROVIDER.GOOGLE,
      redirectUrl: WEB3AUTH_REDIRECT_URL,
      curve: "ed25519",
    });
    if (!provider) throw new Error("Web3Auth login was cancelled.");
    const solanaWallet = new SolanaWallet(provider);
    const accounts = await solanaWallet.requestAccounts();
    const address = accounts[0];
    if (!address) throw new Error("No wallet account received from Web3Auth.");
    setWalletConnection(address, "embedded");
    return address;
  }, [isConfigured, setWalletConnection]);

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
      const client = await getWeb3AuthClient();
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
      const signature = result.signature;
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
    [isConfigured]
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
