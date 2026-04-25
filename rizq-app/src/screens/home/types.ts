export type BalanceData = {
  totalUsdc: number;
  pkrEquivalent: number;
  availableUsdc: number;
  inCommitteesUsdc: number;
  pendingPayoutsUsdc: number;
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
