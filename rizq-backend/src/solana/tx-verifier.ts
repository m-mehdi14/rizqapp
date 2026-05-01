import { Connection, PublicKey } from "@solana/web3.js";
import { config } from "../config";

const connection = new Connection(config.solanaRpcUrl, "confirmed");

type VerifyTxInput = {
  txSignature: string;
  requiredWallet?: string;
  committeePda?: string | null;
  committeeVault?: string | null;
  /** Extra PDAs (member_state, escrow, collateral, safety committee, …) — tx must reference at least one scope key when non-empty */
  additionalScopeKeys?: string[] | null;
};

function normalizeKeySet(keys: string[]): Set<string> {
  return new Set(keys.map((key) => key.trim()));
}

export async function verifyConfirmedCommitteeTx(input: VerifyTxInput): Promise<void> {
  const tx = await connection.getParsedTransaction(input.txSignature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });

  if (!tx) {
    throw new Error("Transaction not found on devnet");
  }
  if (tx.meta?.err) {
    throw new Error("Transaction failed on-chain");
  }

  const accountKeys = tx.transaction.message.accountKeys.map((k: any) => {
    if (typeof k === "string") return k;
    if ("pubkey" in k) {
      return typeof k.pubkey === "string" ? k.pubkey : k.pubkey.toBase58();
    }
    return String(k);
  });
  const keySet = normalizeKeySet(accountKeys);

  if (input.requiredWallet) {
    let walletKey: string;
    try {
      walletKey = new PublicKey(input.requiredWallet).toBase58();
    } catch {
      throw new Error("Invalid wallet address");
    }
    if (!keySet.has(walletKey)) {
      throw new Error("Wallet address not present in transaction accounts");
    }
  }

  const scopeKeys = [
    ...[input.committeePda, input.committeeVault].filter(
      (v): v is string => typeof v === "string" && v.trim().length > 0
    ),
    ...(input.additionalScopeKeys ?? []).filter((v) => typeof v === "string" && v.trim().length > 0),
  ].map((k) => new PublicKey(k).toBase58());

  if (scopeKeys.length > 0) {
    const touchesCommitteeScope = scopeKeys.some((key) => keySet.has(key));
    if (!touchesCommitteeScope) {
      throw new Error("Transaction does not reference committee / vault / safety PDAs");
    }
  }
}
