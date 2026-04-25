import { Router } from "express";
import { getPrisma } from "../db/client";

export const nomineesRouter = Router();

nomineesRouter.post("/notify", async (req, res) => {
  try {
    const prisma = getPrisma();
    const { user_id, reason } = req.body ?? {};
    if (!user_id) {
      return res.status(400).json({ error: "user_id is required" });
    }

    const nominees = await prisma.nominee.findMany({
      where: { user_id: String(user_id) },
      orderBy: [{ is_primary: "desc" }, { created_at: "asc" }],
      select: {
        id: true,
        full_name: true,
        phone_number: true,
        relationship: true,
      },
    });

    if (nominees.length === 0) {
      return res.status(404).json({ error: "no nominee found for user" });
    }

    const primary = nominees[0];
    // SMS provider integration can be plugged in here.
    console.log("[nominee-notify]", {
      nomineeId: primary.id,
      phone: primary.phone_number,
      reason: reason ?? "committee nominee event",
    });

    return res.json({
      ok: true,
      nominee: {
        id: primary.id,
        full_name: primary.full_name,
        relationship: primary.relationship,
      },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "server error" });
  }
});
