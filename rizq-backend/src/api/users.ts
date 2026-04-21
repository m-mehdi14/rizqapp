import { Router } from "express";
import { getPrisma } from "../db/client";

export const usersRouter = Router();

usersRouter.post("/register", async (req, res) => {
  try {
    const prisma = getPrisma();
    const { wallet_address, username, expo_push_token, fcm_token } = req.body ?? {};
    if (!wallet_address) {
      return res.status(400).json({ error: "wallet_address required" });
    }
    const data = await prisma.user.upsert({
      where: { wallet_address },
      update: {
        username,
        expo_push_token,
        fcm_token,
      },
      create: {
        wallet_address,
        username,
        expo_push_token,
        fcm_token,
      },
    });
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server error" });
  }
});
