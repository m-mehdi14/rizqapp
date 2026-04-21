import cors from "cors";
import express from "express";
import { config } from "./config";
import { goalsRouter } from "./api/goals";
import { usersRouter } from "./api/users";
import { ratesRouter } from "./api/rates";
import { scheduleWeeklyCoaching } from "./jobs/weekly-coaching";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "rizq-backend" });
});

app.use("/api/goals", goalsRouter);
app.use("/api/users", usersRouter);
app.use("/api/rates", ratesRouter);

app.post("/webhooks/solana", async (req, res) => {
  try {
    const body = req.body;
    console.log("[webhook] solana payload type:", Array.isArray(body) ? "array" : typeof body);
    res.sendStatus(200);
  } catch {
    res.sendStatus(500);
  }
});

async function main() {
  try {
    scheduleWeeklyCoaching();
  } catch (e) {
    console.warn("[jobs] weekly coaching not scheduled:", e);
  }
  app.listen(config.port, () => {
    console.log(`rizq-backend listening on :${config.port}`);
  });
}

main().catch(console.error);
