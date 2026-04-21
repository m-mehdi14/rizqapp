import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { config } from "../config";

let client: PrismaClient | null = null;

export function getPrisma(): PrismaClient {
  if (!config.databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }
  if (!client) {
    neonConfig.webSocketConstructor = ws;
    const adapter = new PrismaNeon({ connectionString: config.databaseUrl });
    client = new PrismaClient({ adapter });
  }
  return client;
}
