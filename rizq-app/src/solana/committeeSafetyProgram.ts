import { BN, Program, AnchorProvider, type Idl } from "@coral-xyz/anchor";
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  type TransactionSignature,
} from "@solana/web3.js";
import idlJson from "./idl/committee_safety.json";
import { COMMITTEE_SAFETY_PROGRAM_ID, SOLANA_RPC_URL } from "../config";

const idl = idlJson as Idl;

export type SignAndSendPrepared = (tx: Transaction) => Promise<TransactionSignature>;

function programFor(connection: Connection): Program {
  const noop = {
    publicKey: PublicKey.default,
    async signTransaction<T extends Transaction>(tx: T): Promise<T> {
      return tx;
    },
    async signAllTransactions<T extends Transaction>(txs: T[]): Promise<T[]> {
      return txs;
    },
  };
  const provider = new AnchorProvider(connection, noop as never, {
    commitment: "confirmed",
    preflightCommitment: "confirmed",
  });
  return new Program(idl, provider);
}

function deriveCommitteePda(programId: PublicKey, manager: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("committee"), manager.toBuffer()],
    programId
  );
  return pda;
}

function deriveCollateralPda(programId: PublicKey, committee: PublicKey, member: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("collateral"), committee.toBuffer(), member.toBuffer()],
    programId
  );
  return pda;
}

function deriveMemberStatePda(programId: PublicKey, committee: PublicKey, member: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("member"), committee.toBuffer(), member.toBuffer()],
    programId
  );
  return pda;
}

function deriveDeferredEscrowPda(programId: PublicKey, committee: PublicKey, member: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), committee.toBuffer(), member.toBuffer()],
    programId
  );
  return pda;
}

async function finalizeTx(
  connection: Connection,
  feePayer: PublicKey,
  tx: Transaction,
  signAndSend: SignAndSendPrepared
): Promise<TransactionSignature> {
  const latest = await connection.getLatestBlockhash("confirmed");
  tx.feePayer = feePayer;
  tx.recentBlockhash = latest.blockhash;
  tx.lastValidBlockHeight = latest.lastValidBlockHeight;
  return signAndSend(tx);
}

/** Manager-only: initialize committee state + collateral vault + member record (position 1). */
export async function bootstrapManagerOnChainSafety(input: {
  managerWalletAddress: string;
  contributionAmountMicro: number;
  totalCycles: number;
  gracePeriodDays: number;
  signAndSendPrepared: SignAndSendPrepared;
  rpcUrl?: string;
}): Promise<{
  initializeSig: TransactionSignature;
  depositSig: TransactionSignature;
  joinSig: TransactionSignature;
}> {
  const pidStr = COMMITTEE_SAFETY_PROGRAM_ID.trim();
  if (!pidStr) {
    throw new Error("RIZQ_COMMITTEE_SAFETY_PROGRAM_ID is not set in app env.");
  }
  const programId = new PublicKey(pidStr);
  const connection = new Connection(input.rpcUrl ?? SOLANA_RPC_URL, "confirmed");
  const program = programFor(connection);
  const manager = new PublicKey(input.managerWalletAddress.trim());

  const cyclesU8 = Math.min(255, Math.max(1, Math.floor(input.totalCycles)));
  const graceSeconds = Math.max(0, Math.floor(input.gracePeriodDays)) * 86_400;
  const contributionBn = new BN(Math.max(1, Math.floor(input.contributionAmountMicro)));

  const committeePda = deriveCommitteePda(programId, manager);

  const initTx = await program.methods
    .initializeCommittee(contributionBn, cyclesU8, new BN(graceSeconds))
    .accounts({
      committee: committeePda,
      manager,
      systemProgram: SystemProgram.programId,
    })
    .transaction();

  const initializeSig = await finalizeTx(connection, manager, initTx, input.signAndSendPrepared);

  const depositTx = await program.methods
    .depositCollateral()
    .accounts({
      committee: committeePda,
      collateralVault: deriveCollateralPda(programId, committeePda, manager),
      member: manager,
      systemProgram: SystemProgram.programId,
    })
    .transaction();

  const depositSig = await finalizeTx(connection, manager, depositTx, input.signAndSendPrepared);

  const joinTx = await program.methods
    .joinCommittee(1)
    .accounts({
      committee: committeePda,
      collateralVault: deriveCollateralPda(programId, committeePda, manager),
      memberState: deriveMemberStatePda(programId, committeePda, manager),
      member: manager,
      systemProgram: SystemProgram.programId,
    })
    .transaction();

  const joinSig = await finalizeTx(connection, manager, joinTx, input.signAndSendPrepared);

  return { initializeSig, depositSig, joinSig };
}

/** Member: deposit collateral account + join with backend-assigned payout slot. */
export async function memberDepositAndJoinOnChain(input: {
  managerWalletAddress: string;
  memberWalletAddress: string;
  payoutPosition: number;
  signAndSendPrepared: SignAndSendPrepared;
  rpcUrl?: string;
}): Promise<{ depositSig: TransactionSignature; joinSig: TransactionSignature }> {
  const pidStr = COMMITTEE_SAFETY_PROGRAM_ID.trim();
  if (!pidStr) {
    throw new Error("RIZQ_COMMITTEE_SAFETY_PROGRAM_ID is not set in app env.");
  }
  const programId = new PublicKey(pidStr);
  const connection = new Connection(input.rpcUrl ?? SOLANA_RPC_URL, "confirmed");
  const program = programFor(connection);

  const managerPk = new PublicKey(input.managerWalletAddress.trim());
  const memberPk = new PublicKey(input.memberWalletAddress.trim());
  const committeePda = deriveCommitteePda(programId, managerPk);

  const pos = Math.min(255, Math.max(1, Math.floor(input.payoutPosition)));

  const depositTx = await program.methods
    .depositCollateral()
    .accounts({
      committee: committeePda,
      collateralVault: deriveCollateralPda(programId, committeePda, memberPk),
      member: memberPk,
      systemProgram: SystemProgram.programId,
    })
    .transaction();

  const depositSig = await finalizeTx(connection, memberPk, depositTx, input.signAndSendPrepared);

  const joinTx = await program.methods
    .joinCommittee(pos)
    .accounts({
      committee: committeePda,
      collateralVault: deriveCollateralPda(programId, committeePda, memberPk),
      memberState: deriveMemberStatePda(programId, committeePda, memberPk),
      member: memberPk,
      systemProgram: SystemProgram.programId,
    })
    .transaction();

  const joinSig = await finalizeTx(connection, memberPk, joinTx, input.signAndSendPrepared);

  return { depositSig, joinSig };
}

/** Paying member signs — matches `release_payout_with_deferral` (creates deferred escrow PDA). */
export async function releasePayoutWithDeferralTx(input: {
  managerWalletAddress: string;
  memberWalletAddress: string;
  signAndSendPrepared: SignAndSendPrepared;
  rpcUrl?: string;
}): Promise<TransactionSignature> {
  const pidStr = COMMITTEE_SAFETY_PROGRAM_ID.trim();
  if (!pidStr) {
    throw new Error("RIZQ_COMMITTEE_SAFETY_PROGRAM_ID is not set in app env.");
  }
  const programId = new PublicKey(pidStr);
  const connection = new Connection(input.rpcUrl ?? SOLANA_RPC_URL, "confirmed");
  const program = programFor(connection);

  const managerPk = new PublicKey(input.managerWalletAddress.trim());
  const memberPk = new PublicKey(input.memberWalletAddress.trim());
  const committeePda = deriveCommitteePda(programId, managerPk);
  const memberState = deriveMemberStatePda(programId, committeePda, memberPk);
  const deferredEscrow = deriveDeferredEscrowPda(programId, committeePda, memberPk);

  const tx = await program.methods
    .releasePayoutWithDeferral()
    .accounts({
      committee: committeePda,
      memberState: memberState,
      deferredEscrow: deferredEscrow,
      memberWallet: memberPk,
      systemProgram: SystemProgram.programId,
    })
    .transaction();

  return finalizeTx(connection, memberPk, tx, input.signAndSendPrepared);
}

/** Post–first-payout cycles only (`has_received_payout` on-chain). Amount must equal committee contribution. */
export async function contributeAndReleaseDeferredTx(input: {
  managerWalletAddress: string;
  memberWalletAddress: string;
  contributionAmountMicro: number;
  signAndSendPrepared: SignAndSendPrepared;
  rpcUrl?: string;
}): Promise<TransactionSignature> {
  const pidStr = COMMITTEE_SAFETY_PROGRAM_ID.trim();
  if (!pidStr) {
    throw new Error("RIZQ_COMMITTEE_SAFETY_PROGRAM_ID is not set in app env.");
  }
  const programId = new PublicKey(pidStr);
  const connection = new Connection(input.rpcUrl ?? SOLANA_RPC_URL, "confirmed");
  const program = programFor(connection);

  const managerPk = new PublicKey(input.managerWalletAddress.trim());
  const memberPk = new PublicKey(input.memberWalletAddress.trim());
  const committeePda = deriveCommitteePda(programId, managerPk);
  const memberState = deriveMemberStatePda(programId, committeePda, memberPk);
  const deferredEscrow = deriveDeferredEscrowPda(programId, committeePda, memberPk);
  const amountBn = new BN(Math.max(1, Math.floor(input.contributionAmountMicro)));

  const tx = await program.methods
    .contributeAndReleaseDeferred(amountBn)
    .accounts({
      committee: committeePda,
      memberState: memberState,
      deferredEscrow: deferredEscrow,
    })
    .transaction();

  return finalizeTx(connection, memberPk, tx, input.signAndSendPrepared);
}

/** Permissionless except fee payer — manager signs with Web3Auth as fee payer. */
export async function processMissedPaymentTx(input: {
  managerWalletAddress: string;
  targetMemberWalletAddress: string;
  feePayerWalletAddress: string;
  signAndSendPrepared: SignAndSendPrepared;
  rpcUrl?: string;
}): Promise<TransactionSignature> {
  const pidStr = COMMITTEE_SAFETY_PROGRAM_ID.trim();
  if (!pidStr) {
    throw new Error("RIZQ_COMMITTEE_SAFETY_PROGRAM_ID is not set in app env.");
  }
  const programId = new PublicKey(pidStr);
  const connection = new Connection(input.rpcUrl ?? SOLANA_RPC_URL, "confirmed");
  const program = programFor(connection);

  const managerPk = new PublicKey(input.managerWalletAddress.trim());
  const targetPk = new PublicKey(input.targetMemberWalletAddress.trim());
  const feePayerPk = new PublicKey(input.feePayerWalletAddress.trim());

  const committeePda = deriveCommitteePda(programId, managerPk);
  const memberState = deriveMemberStatePda(programId, committeePda, targetPk);
  const collateralVault = deriveCollateralPda(programId, committeePda, targetPk);

  const tx = await program.methods
    .processMissedPayment()
    .accounts({
      committee: committeePda,
      memberState: memberState,
      collateralVault: collateralVault,
    })
    .transaction();

  return finalizeTx(connection, feePayerPk, tx, input.signAndSendPrepared);
}
