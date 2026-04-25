import { Router } from "express";
import { getPrisma } from "../db/client";

export const usersRouter = Router();

usersRouter.post("/register", async (req, res) => {
  try {
    const prisma = getPrisma();
    const { wallet_address, username, display_name, device_push_token, expo_push_token, fcm_token } =
      req.body ?? {};
    if (!wallet_address) {
      return res.status(400).json({ error: "wallet_address required" });
    }
    const tokenInput = device_push_token ?? fcm_token ?? expo_push_token;
    const normalizedToken =
      typeof tokenInput === "string" && tokenInput.trim().length > 0
        ? tokenInput.trim()
        : undefined;
    const row = await prisma.user.upsert({
      where: { wallet_address: String(wallet_address) },
      update: {
        username: typeof username === "string" && username.trim() ? username.trim() : undefined,
        display_name:
          typeof display_name === "string" && display_name.trim()
            ? display_name.trim()
            : undefined,
        device_push_token: normalizedToken,
      },
      create: {
        wallet_address: String(wallet_address),
        username: typeof username === "string" && username.trim() ? username.trim() : undefined,
        display_name:
          typeof display_name === "string" && display_name.trim()
            ? display_name.trim()
            : undefined,
        device_push_token: normalizedToken,
      },
      select: {
        id: true,
        wallet_address: true,
        username: true,
        display_name: true,
        device_push_token: true,
      },
    });
    res.json(row);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server error" });
  }
});
