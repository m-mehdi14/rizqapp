import { PublicKey } from "@solana/web3.js";

export type DecodedCommitteeState = {
  manager: string;
  contributionAmountMicro: bigint;
  totalCycles: number;
  currentCycle: number;
  currentMembers: number;
  gracePeriodSeconds: bigint;
  nextCycleDueTs: bigint;
  bump: number;
};

/** Anchor account: 8-byte discriminator + borsh CommitteeState */
export function decodeCommitteeStateAccountData(data: Buffer): DecodedCommitteeState {
  if (data.length < 8 + 32 + 8 + 1 + 1 + 1 + 8 + 8 + 1) {
    throw new Error("committee account data too short");
  }
  let o = 8;
  const manager = new PublicKey(data.subarray(o, o + 32)).toBase58();
  o += 32;
  const contributionAmountMicro = data.readBigUInt64LE(o);
  o += 8;
  const totalCycles = data.readUInt8(o);
  o += 1;
  const currentCycle = data.readUInt8(o);
  o += 1;
  const currentMembers = data.readUInt8(o);
  o += 1;
  const gracePeriodSeconds = data.readBigInt64LE(o);
  o += 8;
  const nextCycleDueTs = data.readBigInt64LE(o);
  o += 8;
  const bump = data.readUInt8(o);

  return {
    manager,
    contributionAmountMicro,
    totalCycles,
    currentCycle,
    currentMembers,
    gracePeriodSeconds,
    nextCycleDueTs,
    bump,
  };
}
