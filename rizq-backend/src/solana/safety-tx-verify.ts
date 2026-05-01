import { Connection, PublicKey } from "@solana/web3.js";
import { config } from "../config";
import { decodeCommitteeStateAccountData, type DecodedCommitteeState } from "./committee-state-decode";

const connection = new Connection(config.solanaRpcUrl, "confirmed");

export async function fetchDecodedCommitteeState(committeePda: string): Promise<DecodedCommitteeState> {
  const info = await connection.getAccountInfo(new PublicKey(committeePda), "confirmed");
  if (!info?.data) {
    throw new Error("committee account missing");
  }
  return decodeCommitteeStateAccountData(Buffer.from(info.data));
}

export async function verifyDevnetTransactionSucceeded(signature: string): Promise<void> {
  const tx = await connection.getParsedTransaction(signature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });
  if (!tx) {
    throw new Error("transaction not found on cluster");
  }
  if (tx.meta?.err) {
    throw new Error("transaction failed on-chain");
  }
}

export async function verifyCommitteeSafetyAccountExists(committeePda: string): Promise<boolean> {
  const pid = config.committeeSafetyProgramId?.trim();
  if (!pid) return false;
  const info = await connection.getAccountInfo(new PublicKey(committeePda), "confirmed");
  if (!info) return false;
  return info.owner.equals(new PublicKey(pid));
}
