import { useCallback, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import bs58 from "bs58";
import { Connection, Keypair, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { SOLANA_RPC_URL } from "../config";
import { useAppStore } from "../store/useAppStore";

const EMBEDDED_WALLET_SECRET_KEY = "rizq.embedded_wallet.secret.v1";
const connection = new Connection(SOLANA_RPC_URL, "confirmed");

async function loadEmbeddedKeypair(): Promise<Keypair | null> {
  try {
    const raw = await AsyncStorage.getItem(EMBEDDED_WALLET_SECRET_KEY);
    if (!raw) return null;
    const decoded = bs58.decode(raw);
    if (decoded.length !== 64) return null;
    return Keypair.fromSecretKey(decoded);
  } catch {
    return null;
  }
}

export function useEmbeddedWallet() {
  const setWalletConnection = useAppStore((s) => s.setWalletConnection);
  const walletProvider = useAppStore((s) => s.walletProvider);
  const wallet = useAppStore((s) => s.wallet);
  const [keypair, setKeypair] = useState<Keypair | null>(null);

  useEffect(() => {
    loadEmbeddedKeypair()
      .then((existing) => {
        if (!existing) return;
        setKeypair(existing);
        if (walletProvider === "embedded") {
          setWalletConnection(existing.publicKey.toBase58(), "embedded");
        }
      })
      .catch(() => undefined);
  }, [setWalletConnection, walletProvider]);

  const createEmbeddedWallet = useCallback(async () => {
    const kp = Keypair.generate();
    await AsyncStorage.setItem(EMBEDDED_WALLET_SECRET_KEY, bs58.encode(kp.secretKey));
    setKeypair(kp);
    setWalletConnection(kp.publicKey.toBase58(), "embedded");
    return kp.publicKey.toBase58();
  }, [setWalletConnection]);

  const connectEmbeddedWallet = useCallback(async () => {
    const existing = await loadEmbeddedKeypair();
    if (existing) {
      setKeypair(existing);
      const address = existing.publicKey.toBase58();
      setWalletConnection(address, "embedded");
      return address;
    }
    return await createEmbeddedWallet();
  }, [createEmbeddedWallet, setWalletConnection]);

  const disconnectEmbeddedWallet = useCallback(async () => {
    await AsyncStorage.removeItem(EMBEDDED_WALLET_SECRET_KEY);
    setKeypair(null);
    if (walletProvider === "embedded") {
      setWalletConnection(null, null);
    }
  }, [setWalletConnection, walletProvider]);

  const signAndSendDevnetProofTx = useCallback(
    async (walletAddress: string): Promise<string> => {
      const active = keypair ?? (await loadEmbeddedKeypair());
      if (!active) {
        throw new Error("Embedded wallet missing. Create wallet first.");
      }
      const owner = active.publicKey.toBase58();
      if (owner !== walletAddress) {
        throw new Error("Embedded wallet mismatch. Reconnect embedded wallet.");
      }
      const latest = await connection.getLatestBlockhash("confirmed");
      const tx = new Transaction({
        feePayer: active.publicKey,
        blockhash: latest.blockhash,
        lastValidBlockHeight: latest.lastValidBlockHeight,
      }).add(
        SystemProgram.transfer({
          fromPubkey: active.publicKey,
          toPubkey: new PublicKey(walletAddress),
          lamports: 1,
        })
      );
      tx.sign(active);
      const signature = await connection.sendRawTransaction(tx.serialize(), {
        preflightCommitment: "confirmed",
        skipPreflight: false,
      });
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
    [keypair]
  );

  return useMemo(
    () => ({
      hasEmbeddedWallet: Boolean(keypair),
      isActiveEmbeddedWallet: walletProvider === "embedded" && Boolean(wallet),
      connectEmbeddedWallet,
      createEmbeddedWallet,
      disconnectEmbeddedWallet,
      signAndSendDevnetProofTx,
    }),
    [
      connectEmbeddedWallet,
      createEmbeddedWallet,
      disconnectEmbeddedWallet,
      keypair,
      signAndSendDevnetProofTx,
      wallet,
      walletProvider,
    ]
  );
}
