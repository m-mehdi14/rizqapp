import type { Committee } from "../store/useAppStore";
import { CommitteeCard } from "./CommitteeCard";

type Props = {
  goal: Committee;
  onDeposit?: () => void;
  onPress?: () => void;
  variant?: "active" | "behind" | "critical" | "resolved";
};

// Backward-compatible wrapper while old imports are migrated.
export function GoalCard({ goal, onDeposit, onPress, variant = "active" }: Props) {
  return (
    <CommitteeCard
      committee={goal}
      onDeposit={onDeposit}
      onPress={onPress}
      variant={variant}
    />
  );
}
