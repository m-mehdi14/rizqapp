export function calculateDeferredAmount(params: {
  netPayout: number;
  payoutPosition: number;
  totalCycles: number;
}): { immediateAmount: number; deferredAmount: number; cyclesRemaining: number } {
  const netPayout = Math.max(0, Math.floor(params.netPayout));
  const totalCycles = Math.max(1, Math.floor(params.totalCycles));
  const payoutPosition = Math.min(totalCycles, Math.max(1, Math.floor(params.payoutPosition)));
  const cyclesRemaining = Math.max(0, totalCycles - payoutPosition);
  const deferredAmount = Math.floor((netPayout * cyclesRemaining) / totalCycles);
  const immediateAmount = Math.max(0, netPayout - deferredAmount);
  return { immediateAmount, deferredAmount, cyclesRemaining };
}

export function calculateReleasePerCycle(params: {
  totalDeferred: number;
  releasedSoFar: number;
  cyclesCompleted: number;
  cyclesRemaining: number;
}): number {
  const totalDeferred = Math.max(0, Math.floor(params.totalDeferred));
  const releasedSoFar = Math.max(0, Math.floor(params.releasedSoFar));
  const cyclesCompleted = Math.max(0, Math.floor(params.cyclesCompleted));
  const cyclesRemaining = Math.max(0, Math.floor(params.cyclesRemaining));
  const remainingToRelease = Math.max(0, totalDeferred - releasedSoFar);
  const remainingCycles = Math.max(0, cyclesRemaining - cyclesCompleted);
  if (remainingCycles <= 0) return remainingToRelease;
  return Math.floor(remainingToRelease / remainingCycles);
}
