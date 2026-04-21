export const colors = {
  bgBase: "#080E1A",
  bgSurface: "#0D1B2E",
  bgElevated: "#132640",
  bgOverlay: "rgba(8,14,26,0.85)",
  brandGreen: "#00E676",
  brandGreenDim: "#00C853",
  brandGold: "#FFD740",
  brandPurple: "#A78BFA",
  success: "#00E676",
  warning: "#FFB300",
  danger: "#FF5252",
  info: "#40C4FF",
  textPrimary: "#F0F4FF",
  textSecondary: "#7A8FA6",
  textMuted: "#3D5068",
  textInverse: "#080E1A",
  usdcGreenGlow: "rgba(0,230,118,0.4)",

  // Backward-compatible aliases for existing imports.
  primaryGreen: "#00E676",
  deepNavy: "#080E1A",
  surfaceCard: "#0D1B2E",
  elevatedSurface: "#132640",
  accentGold: "#FFD740",
  accentCoral: "#FF5252",
  accentPurple: "#A78BFA",
  usdcBlue: "#00E676",
} as const;

export const goalTypeGradients = {
  Eid: ["#FFD740", "#FF8F00"],
  Wedding: ["#F48FB1", "#E91E8C"],
  Hajj: ["#80DEEA", "#00838F"],
  Education: ["#80CBC4", "#00796B"],
  Emergency: ["#CE93D8", "#7B1FA2"],
  Custom: ["#82B1FF", "#1565C0"],
} as const;

export type GoalType = keyof typeof goalTypeGradients;

export const spacing = {
  screenX: 20,
  card: 16,
  section: 24,
  unit: 8,
} as const;

export const radii = {
  card: 20,
  button: 14,
  chip: 20,
  input: 12,
} as const;

export const typography = {
  hero: 48,
  display: 36,
  h1: 26,
  h2: 20,
  h3: 16,
  body: 15,
  bodyCoaching: 17,
  bodySmall: 14,
  caption: 12,
  mono: 12,
} as const;
