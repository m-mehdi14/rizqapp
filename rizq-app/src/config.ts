/** Environment-backed app config with local defaults. */
import {
  RIZQ_API_URL,
  RIZQ_DAPP_URL,
  RIZQ_SOLANA_RPC_URL,
  RIZQ_USDC_MINT,
  RIZQ_WEB3AUTH_CLIENT_ID,
  RIZQ_WEB3AUTH_REDIRECT_URL,
} from "@env";

export const API_URL = RIZQ_API_URL ?? "http://10.0.2.2:3000";
export const SOLANA_RPC_URL = RIZQ_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
export const USDC_MINT = RIZQ_USDC_MINT ?? "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
export const DAPP_URL = RIZQ_DAPP_URL ?? "https://rizq.app";
export const WEB3AUTH_CLIENT_ID = RIZQ_WEB3AUTH_CLIENT_ID ?? "";
export const WEB3AUTH_REDIRECT_URL = RIZQ_WEB3AUTH_REDIRECT_URL ?? "rizq://auth";

// Backward-compatible exports for existing imports.
export const SUPABASE_URL = "";
export const SUPABASE_ANON_KEY = "";
export const HELIUS_RPC = SOLANA_RPC_URL;
export const PHANTOM_UNIVERSAL = "https://phantom.app/ul/v1";
