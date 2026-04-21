import { Router } from "express";
import { fetchPkrRate } from "../solana/goal-reader";

export const ratesRouter = Router();

ratesRouter.get("/pkr-usdc", async (_req, res) => {
  try {
    const rate = await fetchPkrRate();
    res.json({ pkr_per_usdc: rate });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server error" });
  }
});
