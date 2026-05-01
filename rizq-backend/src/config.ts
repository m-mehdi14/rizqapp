import "dotenv/config";

export const config = {
  port: Number(process.env.PORT) || 3000,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  // Prefer a stable, widely-enabled model name by default.
  geminiModel: process.env.GEMINI_MODEL ?? "gemini-1.5-flash",
  databaseUrl:
    process.env.NEON_DATABASE_URL ??
    process.env.DATABASE_URL ??
    process.env.NEONDB_DATABASE_URL ??
    "",
  solanaRpcUrl:
    process.env.HELIUS_RPC_URL ??
    process.env.SOLANA_RPC_URL ??
    "https://api.devnet.solana.com",
  solanaNetwork: process.env.SOLANA_NETWORK ?? "devnet",
  savingsGoalProgramId: process.env.SAVINGS_GOAL_PROGRAM_ID ?? "",
  committeeProgramId:
    process.env.COMMITTEE_PROGRAM_ID ?? process.env.PREDICTION_POOL_PROGRAM_ID ?? "",
  payoutProgramId: process.env.PAYOUT_PROGRAM_ID ?? "",
  committeeSafetyProgramId: process.env.COMMITTEE_SAFETY_PROGRAM_ID ?? "",
  safetyOnchainEnabled: String(process.env.SAFETY_ONCHAIN_ENABLED ?? "false").toLowerCase() === "true",
  treasuryWallet: process.env.TREASURY_WALLET ?? "",
  coingeckoApiKey: process.env.COINGECKO_API_KEY ?? "",
  authJwtSecret: process.env.AUTH_JWT_SECRET ?? "dev-rizq-jwt-secret-change-me",
};
