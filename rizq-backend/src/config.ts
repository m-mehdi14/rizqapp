import "dotenv/config";

export const config = {
  port: Number(process.env.PORT) || 3000,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  solanaRpcUrl: process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com",
  solanaNetwork: process.env.SOLANA_NETWORK ?? "devnet",
  savingsGoalProgramId: process.env.SAVINGS_GOAL_PROGRAM_ID ?? "",
  predictionPoolProgramId: process.env.PREDICTION_POOL_PROGRAM_ID ?? "",
  payoutProgramId: process.env.PAYOUT_PROGRAM_ID ?? "",
  treasuryWallet: process.env.TREASURY_WALLET ?? "",
  coingeckoApiKey: process.env.COINGECKO_API_KEY ?? "",
};
