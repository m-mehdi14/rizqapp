import { PublicKey } from "@solana/web3.js";

const PROGRAM_DERIVE_FALLBACK = "11111111111111111111111111111111";

function normalizeToPublicKey(input: string): PublicKey {
  return new PublicKey(input.trim());
}

export function deriveCommitteeSafetyPdas(input: {
  programId: string;
  managerWallet: string;
  memberWallet: string;
}): {
  committeePda: string;
  memberStatePda: string;
  collateralVaultPda: string;
  deferredEscrowPda: string;
} {
  const programId = normalizeToPublicKey(
    input.programId && input.programId.trim().length > 0
      ? input.programId
      : PROGRAM_DERIVE_FALLBACK
  );
  const manager = normalizeToPublicKey(input.managerWallet);
  const member = normalizeToPublicKey(input.memberWallet);

  const [committeePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("committee"), manager.toBuffer()],
    programId
  );
  const [memberStatePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("member"), committeePda.toBuffer(), member.toBuffer()],
    programId
  );
  const [collateralVaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("collateral"), committeePda.toBuffer(), member.toBuffer()],
    programId
  );
  const [deferredEscrowPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), committeePda.toBuffer(), member.toBuffer()],
    programId
  );

  return {
    committeePda: committeePda.toBase58(),
    memberStatePda: memberStatePda.toBase58(),
    collateralVaultPda: collateralVaultPda.toBase58(),
    deferredEscrowPda: deferredEscrowPda.toBase58(),
  };
}
