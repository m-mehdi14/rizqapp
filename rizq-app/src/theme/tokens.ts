const colorPresets = {
  rizqDefault: {
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
  },
  rizqWarmTrust: {
    // Core brand direction: community warmth + financial trust.
    bgBase: "#F5F0E8",
    bgSurface: "#FFFFFF",
    bgElevated: "#EFE8DD",
    bgOverlay: "rgba(10,51,40,0.82)",
    brandGreen: "#1D9E75",
    brandGreenDim: "#157A5A",
    brandGold: "#1D9E75",
    brandPurple: "#0A3328",
    success: "#1D9E75",
    warning: "#A15C1A",
    danger: "#9E2A2B",
    info: "#0A3328",
    textPrimary: "#1A1A1A",
    textSecondary: "#3E3A34",
    textMuted: "#6A645C",
    textInverse: "#FFFFFF",
    usdcGreenGlow: "rgba(29,158,117,0.35)",
  },
} as const;

// Swap this to another preset key to transform the whole app palette.
const ACTIVE_COLOR_PRESET: keyof typeof colorPresets = "rizqWarmTrust";
const baseColors = colorPresets[ACTIVE_COLOR_PRESET];

export const colors = {
  ...baseColors,

  // Backward-compatible aliases for existing imports.
  primaryGreen: baseColors.brandGreen,
  deepNavy: baseColors.bgBase,
  surfaceCard: baseColors.bgSurface,
  elevatedSurface: baseColors.bgElevated,
  accentGold: baseColors.brandGold,
  accentCoral: baseColors.danger,
  accentPurple: baseColors.brandPurple,
  usdcBlue: baseColors.brandGreen,
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

export const a11y = {
  minTapTarget: 44,
  smallTapTarget: 40,
  highContrastBorder: "rgba(10,51,40,0.22)",
  mediumContrastBorder: "rgba(10,51,40,0.16)",
  subtleContrastBorder: "rgba(10,51,40,0.1)",
  focusRing: "rgba(29,158,117,0.45)",
} as const;
