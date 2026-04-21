/** Environment-backed app config with local defaults. */
const env =
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};

export const API_URL = env.RIZQ_API_URL ?? "http://10.0.2.2:3000";
export const SOLANA_RPC_URL = env.RIZQ_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
export const DAPP_URL = env.RIZQ_DAPP_URL ?? "https://rizq.app";

// Backward-compatible exports for existing imports.
export const SUPABASE_URL = "";
export const SUPABASE_ANON_KEY = "";
export const HELIUS_RPC = SOLANA_RPC_URL;
export const PHANTOM_UNIVERSAL = "https://phantom.app/ul/v1";
