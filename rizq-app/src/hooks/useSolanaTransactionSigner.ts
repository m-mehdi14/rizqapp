import { useCallback, useMemo } from "react";
import { Transaction } from "@solana/web3.js";
import { useAppStore } from "../store/useAppStore";
import { useEmbeddedWallet } from "./useEmbeddedWallet";
import { useWeb3AuthWallet } from "./useWeb3AuthWallet";

/**
 * Signs and sends a prepared Solana transaction using Web3Auth (preferred) or local embedded keypair.
 */
export function useSolanaTransactionSigner() {
  const wallet = useAppStore((s) => s.wallet);
  const web3 = useWeb3AuthWallet();
  const embedded = useEmbeddedWallet();

  const signAndSendPrepared = useCallback(
    async (tx: Transaction): Promise<string> => {
      if (!wallet) {
        throw new Error("Connect a wallet first.");
      }
      if (web3.isConfigured && web3.isActive) {
        return await web3.signAndSendPreparedTransaction(tx);
      }
      if (embedded.hasEmbeddedWallet) {
        return await embedded.signAndSendPreparedTransaction(wallet, tx);
      }
      if (web3.isConfigured) {
        return await web3.signAndSendPreparedTransaction(tx);
      }
      throw new Error(
        "No compatible signer. Connect Web3Auth (Google) or use the in-app embedded wallet."
      );
    },
    [embedded, wallet, web3]
  );

  return useMemo(
    () => ({
      signAndSendPrepared,
      canSignPrepared: Boolean(wallet) && (web3.isConfigured || embedded.hasEmbeddedWallet),
    }),
    [embedded.hasEmbeddedWallet, signAndSendPrepared, wallet, web3.isConfigured]
  );
}
