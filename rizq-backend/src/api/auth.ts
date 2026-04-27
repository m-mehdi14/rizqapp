import { Router } from "express";
import { getPrisma } from "../db/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { randomUUID } from "node:crypto";

export const authRouter = Router();

type AuthJwtPayload = {
  sub: string;
  email: string;
};

async function ensureAuthTables() {
  const prisma = getPrisma();
  await prisma.$executeRawUnsafe(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS display_name TEXT
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS phone_number TEXT
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS username TEXT
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS avatar_url TEXT
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS language_pref TEXT NOT NULL DEFAULT 'mixed'
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS device_push_token TEXT
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS kyc_status TEXT NOT NULL DEFAULT 'unverified'
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS kyc_rejected_reason TEXT
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS cnic_number TEXT
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS is_pro BOOLEAN NOT NULL DEFAULT false
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS pro_expires_at TIMESTAMPTZ
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS rizq_score INTEGER NOT NULL DEFAULT 0
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS auth_credentials (
      id TEXT PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS nominees (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      full_name TEXT NOT NULL,
      phone_number TEXT NOT NULL,
      cnic_number TEXT NOT NULL,
      relationship TEXT NOT NULL,
      is_primary BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

function signAuthToken(payload: AuthJwtPayload): string {
  return jwt.sign(payload, config.authJwtSecret, { expiresIn: "14d" });
}

function readBearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token.trim();
}

function verifyAuthToken(token: string): AuthJwtPayload {
  const decoded = jwt.verify(token, config.authJwtSecret);
  if (!decoded || typeof decoded !== "object") throw new Error("invalid token");
  const sub = (decoded as { sub?: string }).sub;
  const email = (decoded as { email?: string }).email;
  if (!sub || !email) throw new Error("invalid token");
  return { sub, email };
}

authRouter.patch("/session/profile", async (req, res) => {
  try {
    await ensureAuthTables();
    const prisma = getPrisma();
    const token = readBearerToken(req.headers.authorization);
    if (!token) return res.status(401).json({ error: "missing token" });
    const claims = verifyAuthToken(token);
    const { display_name, username, language_pref, phone_number } = req.body ?? {};
    const updated = await prisma.user.update({
      where: { id: claims.sub },
      data: {
        display_name:
          typeof display_name === "string" && display_name.trim().length > 0
            ? display_name.trim()
            : undefined,
        username:
          typeof username === "string" && username.trim().length > 0
            ? username.trim()
            : undefined,
        language_pref:
          typeof language_pref === "string" && language_pref.trim().length > 0
            ? language_pref.trim()
            : undefined,
        phone_number:
          typeof phone_number === "string" && phone_number.trim().length > 0
            ? phone_number.trim()
            : undefined,
      },
      select: {
        id: true,
        display_name: true,
        username: true,
        phone_number: true,
        language_pref: true,
        wallet_address: true,
      },
    });
    return res.json({ ok: true, user: updated });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "server error" });
  }
});

authRouter.patch("/session/kyc-status", async (req, res) => {
  try {
    await ensureAuthTables();
    const prisma = getPrisma();
    const token = readBearerToken(req.headers.authorization);
    if (!token) return res.status(401).json({ error: "missing token" });
    const claims = verifyAuthToken(token);
    const { kyc_status } = req.body ?? {};
    const normalized = String(kyc_status ?? "")
      .trim()
      .toLowerCase();
    const mappedStatus =
      normalized === "verified"
        ? "verified"
        : normalized === "pending" || normalized === "submitted"
          ? "pending"
          : "unverified";
    if (mappedStatus !== "unverified" && mappedStatus !== "pending" && mappedStatus !== "verified") {
      return res.status(400).json({ error: "kyc_status must be unverified, pending, or verified" });
    }
    const user = await prisma.user.update({
      where: { id: claims.sub },
      data: { kyc_status: mappedStatus },
      select: {
        id: true,
        kyc_status: true,
      },
    });
    return res.json({ ok: true, user });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "server error" });
  }
});

authRouter.post("/session/onboarding-complete", async (req, res) => {
  try {
    await ensureAuthTables();
    const prisma = getPrisma();
    const token = readBearerToken(req.headers.authorization);
    if (!token) return res.status(401).json({ error: "missing token" });
    const claims = verifyAuthToken(token);
    const user = await prisma.user.update({
      where: { id: claims.sub },
      data: {
        onboarding_completed: true,
        onboarding_completed_at: new Date(),
      },
      select: {
        id: true,
        onboarding_completed: true,
        onboarding_completed_at: true,
      },
    });
    return res.json({ ok: true, user });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "server error" });
  }
});

authRouter.post("/session/nominee", async (req, res) => {
  try {
    await ensureAuthTables();
    const prisma = getPrisma();
    const token = readBearerToken(req.headers.authorization);
    if (!token) return res.status(401).json({ error: "missing token" });
    const claims = verifyAuthToken(token);
    const { full_name, phone_number, cnic_number, relationship } = req.body ?? {};
    if (!full_name || !phone_number || !cnic_number || !relationship) {
      return res
        .status(400)
        .json({ error: "full_name, phone_number, cnic_number, relationship are required" });
    }

    await prisma.nominee.deleteMany({
      where: { user_id: claims.sub, is_primary: true },
    });
    const nominee = await prisma.nominee.create({
      data: {
        user_id: claims.sub,
        full_name: String(full_name).trim(),
        phone_number: String(phone_number).trim(),
        cnic_number: String(cnic_number).trim(),
        relationship: String(relationship).trim(),
        is_primary: true,
      },
      select: {
        id: true,
        full_name: true,
        phone_number: true,
        cnic_number: true,
        relationship: true,
      },
    });
    return res.json({ ok: true, nominee });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "server error" });
  }
});

authRouter.get("/session/nominee", async (req, res) => {
  try {
    await ensureAuthTables();
    const prisma = getPrisma();
    const token = readBearerToken(req.headers.authorization);
    if (!token) return res.status(401).json({ error: "missing token" });
    const claims = verifyAuthToken(token);

    const nominee = await prisma.nominee.findFirst({
      where: { user_id: claims.sub, is_primary: true },
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        full_name: true,
        phone_number: true,
        cnic_number: true,
        relationship: true,
      },
    });

    return res.json({ ok: true, nominee });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "server error" });
  }
});

authRouter.post("/register", async (req, res) => {
  try {
    await ensureAuthTables();
    const prisma = getPrisma();
    const { name, email, password } = req.body ?? {};
    if (!name || !email || !password) {
      return res.status(400).json({ error: "name, email and password are required" });
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    if (!normalizedEmail.includes("@")) {
      return res.status(400).json({ error: "email format invalid" });
    }
    const plainPassword = String(password);
    if (plainPassword.length < 8) {
      return res.status(400).json({ error: "password must be at least 8 characters" });
    }

    const existing = await prisma.$queryRawUnsafe<Array<{ user_id: string }>>(
      `SELECT user_id FROM auth_credentials WHERE email = $1 LIMIT 1`,
      normalizedEmail
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: "email already registered" });
    }

    const displayName = String(name).trim();
    const user = await prisma.user.create({
      data: {
        wallet_address: `pending-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        display_name: displayName,
      },
      select: {
        id: true,
        display_name: true,
        username: true,
        wallet_address: true,
        kyc_status: true,
        onboarding_completed: true,
      },
    });
    const passwordHash = await bcrypt.hash(plainPassword, 10);
    await prisma.$executeRawUnsafe(
      `INSERT INTO auth_credentials (id, user_id, email, password_hash) VALUES ($1, $2, $3, $4)`,
      randomUUID(),
      user.id,
      normalizedEmail,
      passwordHash
    );

    return res.status(201).json({
      ok: true,
      token: signAuthToken({ sub: user.id, email: normalizedEmail }),
      user: {
        id: user.id,
        email: normalizedEmail,
        display_name: user.display_name,
        username: user.username,
        wallet_address: user.wallet_address,
        kyc_status: user.kyc_status,
        onboarding_completed: user.onboarding_completed,
      },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "server error" });
  }
});

authRouter.post("/login", async (req, res) => {
  try {
    await ensureAuthTables();
    const prisma = getPrisma();
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    const rows = await prisma.$queryRawUnsafe<
      Array<{
        user_id: string;
        email: string;
        password_hash: string;
        display_name: string | null;
        username: string | null;
        phone_number: string | null;
        language_pref: string | null;
        wallet_address: string;
        kyc_status: string;
        onboarding_completed: boolean;
      }>
    >(
      `
      SELECT
        ac.user_id,
        ac.email,
        ac.password_hash,
        u.display_name,
        u.username,
        u.phone_number,
        u.language_pref,
        u.wallet_address,
        u.kyc_status,
        u.onboarding_completed
      FROM auth_credentials ac
      JOIN users u ON u.id = ac.user_id
      WHERE ac.email = $1
      LIMIT 1
      `,
      normalizedEmail
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: "invalid credentials" });
    }
    const row = rows[0];
    const ok = await bcrypt.compare(String(password), row.password_hash);
    if (!ok) return res.status(401).json({ error: "invalid credentials" });

    return res.json({
      ok: true,
      token: signAuthToken({ sub: row.user_id, email: row.email }),
      user: {
        id: row.user_id,
        email: row.email,
        display_name: row.display_name,
        username: row.username,
        phone_number: row.phone_number,
        language_pref: row.language_pref,
        wallet_address: row.wallet_address,
        kyc_status: row.kyc_status,
        onboarding_completed: row.onboarding_completed,
      },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "server error" });
  }
});

authRouter.get("/session/me", async (req, res) => {
  try {
    await ensureAuthTables();
    const prisma = getPrisma();
    const token = readBearerToken(req.headers.authorization);
    if (!token) return res.status(401).json({ error: "missing token" });
    const claims = verifyAuthToken(token);
    const rows = await prisma.$queryRawUnsafe<
      Array<{
        id: string;
        email: string;
        display_name: string | null;
        username: string | null;
        phone_number: string | null;
        language_pref: string | null;
        wallet_address: string;
        kyc_status: string;
        onboarding_completed: boolean;
      }>
    >(
      `
      SELECT
        u.id,
        ac.email,
        u.display_name,
        u.username,
        u.phone_number,
        u.language_pref,
        u.wallet_address,
        u.kyc_status,
        u.onboarding_completed
      FROM users u
      JOIN auth_credentials ac ON ac.user_id = u.id
      WHERE u.id = $1
      LIMIT 1
      `,
      claims.sub
    );
    if (rows.length === 0) return res.status(404).json({ error: "user not found" });
    return res.json({ ok: true, user: rows[0] });
  } catch (e) {
    console.error(e);
    return res.status(401).json({ error: "invalid session" });
  }
});

authRouter.post("/session/link-wallet", async (req, res) => {
  try {
    const prisma = getPrisma();
    const token = readBearerToken(req.headers.authorization);
    if (!token) return res.status(401).json({ error: "missing token" });
    const claims = verifyAuthToken(token);
    const { wallet_address } = req.body ?? {};
    if (!wallet_address) {
      return res.status(400).json({ error: "wallet_address is required" });
    }
    const wallet = String(wallet_address).trim();
    if (!wallet) return res.status(400).json({ error: "wallet_address is required" });

    const conflict = await prisma.user.findFirst({
      where: {
        wallet_address: wallet,
        id: { not: claims.sub },
      },
      select: { id: true },
    });
    if (conflict) {
      return res.status(409).json({ error: "wallet already linked to another user" });
    }

    const updated = await prisma.user.update({
      where: { id: claims.sub },
      data: { wallet_address: wallet },
      select: {
        id: true,
        wallet_address: true,
        username: true,
        display_name: true,
        kyc_status: true,
      },
    });
    return res.json({ ok: true, user: updated });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "server error" });
  }
});

authRouter.post("/verify-kyc", async (req, res) => {
  try {
    const prisma = getPrisma();
    const { wallet_address, cnic_number } = req.body ?? {};

    if (!wallet_address || !cnic_number) {
      return res.status(400).json({ error: "wallet_address and cnic_number are required" });
    }

    const updated = await prisma.user.updateMany({
      where: { wallet_address: String(wallet_address) },
      data: {
        cnic_number: String(cnic_number),
        kyc_status: "verified",
      },
    });
    if (updated.count === 0) {
      return res.status(404).json({ error: "user not found" });
    }

    return res.json({
      ok: true,
      wallet_address,
      kyc_status: "verified",
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "server error" });
  }
});
