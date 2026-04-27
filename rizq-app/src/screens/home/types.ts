export type BalanceData = {
  totalSol: number;
  totalUsdcEquivalent: number;
  pkrEquivalent: number;
  availableSol: number;
  inCommitteesSol: number;
  pendingPayoutsSol: number;
};

export type UrgentActionSeverity = "danger" | "warning";

export type UrgentAction = {
  id: string;
  title: string;
  subtitle: string;
  severity: UrgentActionSeverity;
  targetCommitteeId: string;
};

export type CommitteeItem = {
  id: string;
  name: string;
  typeLabel: string;
  currentCycleLabel: string;
  nextPaymentDueLabel: string;
};
