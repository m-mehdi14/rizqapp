import { goalTypeGradients, type GoalType } from "./tokens";

export function normalizeGoalType(input?: string): GoalType {
  if (!input) return "Custom";
  const val = input.trim().toLowerCase();
  if (val === "eid") return "Eid";
  if (val === "wedding") return "Wedding";
  if (val === "hajj") return "Hajj";
  if (val === "education") return "Education";
  if (val === "emergency") return "Emergency";
  return "Custom";
}

export function goalGradient(input?: string): readonly [string, string] {
  const goalType = normalizeGoalType(input);
  return goalTypeGradients[goalType];
}

export function goalEmoji(input?: string): string {
  const goalType = normalizeGoalType(input);
  if (goalType === "Eid") return "🌙";
  if (goalType === "Wedding") return "💍";
  if (goalType === "Hajj") return "🕋";
  if (goalType === "Education") return "📚";
  if (goalType === "Emergency") return "🚨";
  return "🎯";
}
